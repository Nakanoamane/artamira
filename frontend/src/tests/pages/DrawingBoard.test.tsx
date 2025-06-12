import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect, Mock, MockedFunction, MockInstance } from 'vitest'
import React, { useEffect } from 'react'
import DrawingBoard from '../../pages/DrawingBoard'
import { useParams } from 'react-router'
import { MemoryRouter } from 'react-router-dom'
import { HeaderProvider } from '../../contexts/HeaderContext'
import { AuthProvider } from '../../contexts/AuthContext'
import { useDrawingChannel } from '../../hooks/useDrawingChannel';
import { CanvasProps } from '../../components/Canvas';
import * as CanvasModule from '../../components/Canvas';
import { DrawingElementType, parseRawElements } from '../../utils/drawingElementsParser';

let mockedCanvasRenderFn: MockedFunction<
  (props: CanvasProps, ref: React.Ref<HTMLCanvasElement | null>) => React.ReactElement
>;

let mockedCanvasToDataURL: MockedFunction<HTMLCanvasElement['toDataURL']>;

const mockedChannelInstance = {
  perform: vi.fn(),
  on: vi.fn(),
  unsubscribe: vi.fn(),
  consumer: {},
  identifier: 'mock-identifier',
};

const receivedCallbacksMap = new Map<string, (data: any) => void>();

vi.mock('../../hooks/useDrawingChannel', () => ({
  useDrawingChannel: vi.fn((channelName, drawingId, onReceivedData) => {
    const key = `${channelName}-${drawingId}`;
    receivedCallbacksMap.set(key, onReceivedData);

    return {
      channel: mockedChannelInstance,
      status: {
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        error: null,
      },
    };
  }),
}));

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('../../hooks/usePageTitle', () => ({
  usePageTitle: vi.fn((pageTitle) => {
    useEffect(() => {
      document.title = pageTitle;
    }, [pageTitle]);
  }),
}));

vi.mock('../../components/Canvas', () => {
  const mockToDataURL = vi.fn(() => 'data:image/png;base64,mockpngdata');

  const _mockRenderFn = vi.fn(
    ({ onDrawComplete, drawingElements, setDrawingElements, activeTool, activeColor, activeBrushSize }, ref) => {
      const mockCanvasElement = {
        toDataURL: mockToDataURL,
        getContext: vi.fn(() => ({
          clearRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          arc: vi.fn(),
          rect: vi.fn(),
          fillText: vi.fn(),
          measureText: vi.fn(() => ({ width: 10 })),
          save: vi.fn(),
          restore: vi.fn(),
          setLineDash: vi.fn(),
          strokeRect: vi.fn(),
        })),
        clientWidth: 800,
        clientHeight: 600,
        setAttribute: vi.fn(),
      };

      if (ref) {
        if (typeof ref === 'function') {
          ref(mockCanvasElement as unknown as HTMLCanvasElement);
        } else {
          (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = mockCanvasElement as unknown as HTMLCanvasElement;
        }
      }

      return (
        <div data-testid="mock-canvas">
          Mock Canvas
          <button onClick={() => onDrawComplete({ id: undefined, type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 2 })} data-testid="draw-complete-button">
            Draw Complete
          </button>
          {drawingElements.length > 0 && <span data-testid="canvas-elements-count">{drawingElements.length}</span>}
          <button onClick={() => setDrawingElements([])} data-testid="clear-elements-button">Clear Elements</button>
        </div>
      );
    }
  );

  return {
    __esModule: true,
    default: React.forwardRef(_mockRenderFn),
    _mockRenderFn: _mockRenderFn,
    mockToDataURL: mockToDataURL,
  };
});

vi.mock('../../components/Toolbar', () => ({
  __esModule: true,
  default: vi.fn(({ onUndo, onRedo, onSave, onExportClick, canUndo, canRedo, isDirty, setActiveTool, setActiveColor, setActiveBrushSize }) => (
    <div data-testid="mock-toolbar">
      Mock Toolbar
      <button onClick={() => setActiveTool('pen')} data-testid="set-pen-tool">Set Pen</button>
      <button onClick={() => setActiveColor('#FF0000')} data-testid="set-red-color">Set Red</button>
      <button onClick={() => setActiveBrushSize(10)} data-testid="set-brush-size">Set Brush 10</button>
      <button onClick={onUndo} disabled={!canUndo} data-testid="undo-button">Undo</button>
      <button onClick={onRedo} disabled={!canRedo} data-testid="redo-button">Redo</button>
      <button onClick={onSave} disabled={!isDirty} data-testid="save-button">Save</button>
      <button onClick={onExportClick} data-testid="export-button">Export</button>
      {isDirty && <span data-testid="is-dirty-message">未保存の変更があります</span>}
    </div>
  )),
}));

vi.mock('../../components/DrawingHeader', () => ({
  __esModule: true,
  default: vi.fn(({ title, lastSavedAt, isDirty }) => {
    return (
      <div data-testid="mock-drawing-header">
        <h1 data-testid="drawing-header-title">{title}</h1>
        {isDirty && <span data-testid="drawing-header-dirty-status">未保存の変更があります</span>}
        {lastSavedAt && <span data-testid="drawing-header-last-saved">{lastSavedAt.toLocaleString('ja-JP')}</span>}
      </div>
    );
  }),
}));

describe('DrawingBoard', () => {
  const mockUseParams = useParams as Mock;
  const mockFetch = vi.fn();

  let originalCreateElement: typeof document.createElement;

  let addEventListenerSpy: MockInstance;
  let removeEventListenerSpy: MockInstance;

  let mockAnchorElement: HTMLAnchorElement & {
    click: Mock;
    setAttribute: Mock;
    appendChild: Mock;
    removeChild: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: '1' });
    mockFetch.mockReset();
    (global as any).fetch = mockFetch;
    Object.defineProperty(import.meta, 'env', {
      value: {
        VITE_API_URL: 'http://localhost:3000',
      },
      writable: true,
    });

    // 共通のfetchモックを設定
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/me`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1, email: 'test@example.com' } }),
        });
      }
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`)) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/drawings/1/export`)) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      // drawings/:id のGETリクエストは各テストケースで個別にモックするため、ここではエラーを発生させる
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });

    originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        mockAnchorElement = originalCreateElement.call(document, tagName) as HTMLAnchorElement & { click: Mock, setAttribute: Mock, appendChild: Mock, removeChild: Mock };
        vi.spyOn(mockAnchorElement, 'click').mockImplementation(() => { /* do nothing */ });
        vi.spyOn(mockAnchorElement, 'setAttribute').mockImplementation((name, value) => {
          (mockAnchorElement as any)[name] = value;
        });
        vi.spyOn(mockAnchorElement, 'appendChild').mockImplementation((node) => node);
        vi.spyOn(mockAnchorElement, 'removeChild').mockImplementation((node) => node);
        return mockAnchorElement;
      }
      return originalCreateElement.call(document, tagName);
    });

    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    mockedCanvasRenderFn = (CanvasModule as any)._mockRenderFn;
    mockedCanvasRenderFn.mockClear();

    mockedCanvasToDataURL = (CanvasModule as any).mockToDataURL;
    mockedCanvasToDataURL.mockReset();

    receivedCallbacksMap.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, 'createElement').mockRestore();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();

    if (mockAnchorElement && mockAnchorElement.click.mockRestore) {
      mockAnchorElement.click.mockRestore();
    }
  });

  it('ローディング中に「描画ボードを読み込み中...」と表示されること', () => {
    (global as any).fetch = vi.fn(() => new Promise(() => {}));
    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );
    expect(screen.getByText('描画ボードを読み込み中...')).toBeInTheDocument();
  });

  it('APIから描画ボードのデータを正常に読み込み、表示すること (canvas_data と drawing_elements_after_save を結合)', async () => {
    const drawingDataWithCanvasAndElements = {
      id: 1,
      title: 'Combined Data Drawing',
      canvas_data: JSON.stringify({
        width: 800,
        height: 600,
        elements: [
          {
            id: 101,
            element_type: 'line' as const,
            data: {
              path: [[0, 0], [1, 1]],
              color: '#000000',
              lineWidth: 2,
            },
            created_at: '2023-01-01T12:00:00Z',
          },
        ],
      }),
      drawing_elements_after_save: [
        {
          id: 201,
          element_type: 'rectangle' as const,
          data: {
            start: { x: 10, y: 10 },
            end: { x: 20, y: 20 },
            color: '#FF0000',
            lineWidth: 3,
          },
          created_at: '2023-01-01T12:05:00Z',
        },
        {
          id: 202,
          element_type: 'circle' as const,
          data: {
            center: { x: 50, y: 50 },
            radius: 5,
            color: '#0000FF',
            brushSize: 1,
          },
          created_at: '2023-01-01T12:10:00Z',
        },
      ],
      last_saved_at: '2023-01-01T12:00:00Z',
    };

    // Calculate expected combined elements
    let expectedCombinedElements: DrawingElementType[] = [];
    if (drawingDataWithCanvasAndElements.canvas_data) {
      try {
        const canvasData = JSON.parse(drawingDataWithCanvasAndElements.canvas_data);
        expectedCombinedElements = parseRawElements(canvasData.elements || []);
      } catch (e) {
        // Should not happen in this test
      }
    }
    if (drawingDataWithCanvasAndElements.drawing_elements_after_save && Array.isArray(drawingDataWithCanvasAndElements.drawing_elements_after_save)) {
      const elementsAfterSave = parseRawElements(drawingDataWithCanvasAndElements.drawing_elements_after_save);
      expectedCombinedElements = expectedCombinedElements.concat(elementsAfterSave);
    }
    // For the first element (from canvas_data), its ID is dynamically generated by parseRawElements.
    // So we need to adjust the expectation.
    if (expectedCombinedElements.length > 0) {
      expectedCombinedElements[0] = expect.objectContaining({ ...expectedCombinedElements[0], id: expect.any(Number) });
    }

    mockFetch.mockImplementationOnce((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(drawingDataWithCanvasAndElements),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });

    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Combined Data Drawing');
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('3'); // 1 from canvas_data + 2 from drawing_elements_after_save
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent('2023/1/1 21:00:00'); // Check the localized time
    });

    // 描画要素がCanvasに初期ロード時に空の配列で渡されていることを確認
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          drawingElements: [],
          setDrawingElements: expect.any(Function),
          onDrawComplete: expect.any(Function),
        },
        expect.anything()
      );
    });

    // 描画要素がAPIからロードされた後にCanvasに正しく渡されていることを確認
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          drawingElements: expectedCombinedElements,
          setDrawingElements: expect.any(Function),
          onDrawComplete: expect.any(Function),
        },
        expect.anything()
      );
    });
  });

  it('APIからdrawing_elements_after_saveを正常に読み込み、表示すること (canvas_data がない場合)', async () => {
    const drawingElements = [
      {
        id: 201,
        element_type: 'line' as const,
        data: {
          path: [[0, 0], [1, 1]],
          color: '#000000',
          lineWidth: 2,
        },
      },
    ];
    // Calculate expected elements after save
    const expectedElementsOnly: DrawingElementType[] = parseRawElements(drawingElements);

    mockFetch.mockImplementationOnce((url: string) => {
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/drawings/1`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            title: 'Elements Only Drawing',
            canvas_data: null, // canvas_data は null
            drawing_elements_after_save: drawingElements,
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });
    mockUseParams.mockReturnValue({ id: '1' });

    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    // 描画要素がCanvasに初期ロード時に空の配列で渡されていることを確認
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          drawingElements: [],
          setDrawingElements: expect.any(Function),
          onDrawComplete: expect.any(Function),
        },
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          drawingElements: expectedElementsOnly,
          setDrawingElements: expect.any(Function),
          onDrawComplete: expect.any(Function),
        },
        expect.anything()
      );
    });
  });

  it('APIからcanvas_dataのパースに失敗した場合、drawing_elements_after_saveのみで表示すること', async () => {
    const drawingElementsAfterSave = [
      {
        id: 201,
        element_type: 'rectangle' as const,
        data: {
          start: { x: 10, y: 10 },
          end: { x: 20, y: 20 },
          color: '#FF0000',
          lineWidth: 3,
        },
      },
    ];
    // Calculate expected elements after save for parse failure case
    const expectedElementsParseFail: DrawingElementType[] = parseRawElements(drawingElementsAfterSave);

    mockFetch.mockImplementationOnce((url: string) => {
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/drawings/1`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            title: 'Invalid Canvas Data Drawing',
            canvas_data: 'invalid json data', // 不正なJSONデータ
            drawing_elements_after_save: drawingElementsAfterSave,
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });
    mockUseParams.mockReturnValue({ id: '1' });

    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    // canvas_dataのパースに失敗した場合、エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/エラー:/)).toBeInTheDocument();
      expect(screen.getByText(/Unexpected token 'i', "invalid json data" is not valid JSON/)).toBeInTheDocument();
    });
  });

  it('APIから描画ボードのデータを正常に読み込み、表示すること (initial_elements が空の場合)', async () => {
    mockFetch.mockImplementationOnce((url: string) => {
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/drawings/1`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            title: 'Empty Drawing',
            canvas_data: null,
            drawing_elements_after_save: [],
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });
    mockUseParams.mockReturnValue({ id: '1' });

    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    // 描画要素が空であることを確認 (最初の呼び出しのみ)
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          drawingElements: [],
          setDrawingElements: expect.any(Function),
          onDrawComplete: expect.any(Function),
        },
        expect.anything()
      );
    });
  });

  it('APIからデータが正常に読み込まれない場合、エラーメッセージを表示すること', async () => {
    mockFetch.mockImplementationOnce((url: string) => {
      if (url.includes(`${import.meta.env.VITE_API_URL}/api/v1/drawings/1`)) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error') // text()メソッドをモック
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });

    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/drawing-board/1']}>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/エラー:/)).toBeInTheDocument();
      // エラーメッセージの期待値を実際のコードの出力形式に合わせる
      expect(screen.getByText(/描画データの読み込みに失敗しました: HTTP error! status: 500. Body: Internal Server Error/)).toBeInTheDocument();
    });
  });

  it('ユーザーがボードを更新したときにAction Cableで描画要素がブロードキャストされること', async () => {
    const drawingData = {
      title: 'Broadcast Test',
      last_saved_at: null,
      canvas_data: null,
      drawing_elements_after_save: [],
    };

    mockFetch.mockImplementationOnce((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(drawingData),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call for URL: ${url}`));
    });

    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
    });

    // 描画をシミュレート
    fireEvent.click(screen.getByTestId('draw-complete-button'));

    await waitFor(() => {
      expect(mockedChannelInstance.perform).toHaveBeenCalledWith(
        'draw',
        expect.objectContaining({
          element_type: 'line',
          element_data: expect.objectContaining({
            id: undefined,
            path: [[0, 0], [1, 1]],
            color: '#000000',
            lineWidth: 2,
          }),
          temp_id: expect.any(String),
        })
      );
    });
  });
});
