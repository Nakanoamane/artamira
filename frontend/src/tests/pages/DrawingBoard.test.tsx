import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    ({ onDrawComplete, canvasRef, drawingElements, setDrawingElements }, ref) => {
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
      if (canvasRef && 'current' in canvasRef) {
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = mockCanvasElement as unknown as HTMLCanvasElement;
      }

      return (
        <div data-testid="mock-canvas">
          Mock Canvas
          <button onClick={() => onDrawComplete({ id: 'new-element-id', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 2 })} data-testid="draw-complete-button">
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
  default: vi.fn(({ title, lastSavedAt, isDirty }) => (
    <div data-testid="mock-drawing-header">
      <h1 data-testid="drawing-header-title">{title}</h1>
      {isDirty && <span data-testid="drawing-header-dirty-status">未保存の変更があります</span>}
      {lastSavedAt && <span data-testid="drawing-header-last-saved">{lastSavedAt.toLocaleString('ja-JP')}</span>}
    </div>
  )),
}));

describe('DrawingBoard', () => {
  const mockUseParams = useParams as Mock;
  const mockFetch = vi.fn();

  let mockedUseDrawingChannelHook: MockedFunction<typeof useDrawingChannel>;

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

    mockedUseDrawingChannelHook = vi.mocked(useDrawingChannel);

    mockedChannelInstance.perform.mockClear();
    mockedChannelInstance.on.mockClear();
    mockedChannelInstance.unsubscribe.mockClear();

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
      title: 'Combined Data Drawing',
      last_saved_at: '2023-01-01T12:00:00Z',
      canvas_data: JSON.stringify([
        { id: 'canvas_element_1', type: 'line', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000000', brushSize: 2 },
      ]),
      drawing_elements_after_save: [
        { id: 'new_element_1', element_type: 'rectangle', data: { start: { x: 10, y: 10 }, end: { x: 20, y: 20 }, color: '#FF0000', lineWidth: 3 }, created_at: '2023-01-01T12:05:00Z' },
        { id: 'new_element_2', element_type: 'circle', data: { center: { x: 50, y: 50 }, radius: 5, color: '#0000FF', brushSize: 1 }, created_at: '2023-01-01T12:10:00Z' },
      ],
    };

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
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('3'); // 1 from canvas_data + 2 from drawing_elements_after_save
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent('2023/1/1 21:00:00'); // Check the localized time
    });

    // 描画要素がCanvasに正しく渡されていることを確認
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        { // Start with a literal object for the top-level CanvasProps
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          canvasRef: { // Use literal object for canvasRef
            current: { // Use literal object for current
              toDataURL: expect.any(Function), // These are mock functions, so expect.any(Function) is fine
              getContext: expect.any(Function),
              clientWidth: 800, // Explicitly match the mocked value
              clientHeight: 600, // Explicitly match the mocked value
              setAttribute: expect.any(Function),
            },
          },
          isDrawing: false, // Explicitly false as received
          onDrawComplete: expect.any(Function), // These are dynamic functions
          setDrawingElements: expect.any(Function),
          setIsDrawing: expect.any(Function),
          status: { // Use literal object for status
            isConnected: true,
            isConnecting: false,
            isDisconnected: false,
            error: null,
          },
          drawingElements: [ // Use literal array for drawingElements and explicit objects
            {
              id: 'canvas_element_1',
              type: 'line',
              points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              color: '#000000',
              brushSize: 2,
            },
            {
              id: 'new_element_1',
              type: 'rectangle',
              start: { x: 10, y: 10 },
              end: { x: 20, y: 20 },
              color: '#FF0000',
              brushSize: 3, // lineWidth from backend maps to brushSize
            },
            {
              id: 'new_element_2',
              type: 'circle',
              center: { x: 50, y: 50 },
              radius: 5,
              color: '#0000FF',
              brushSize: 1,
            },
          ],
        },
        null
      );
    });
  });

  it('APIからdrawing_elements_after_saveを正常に読み込み、表示すること (canvas_data がない場合)', async () => {
    const drawingDataWithoutCanvas = {
      title: 'Elements Only Drawing',
      last_saved_at: null,
      canvas_data: null,
      drawing_elements_after_save: [
        { id: 'new_element_1', element_type: 'line', data: { path: [[0, 0], [1, 1]], color: '#000000', lineWidth: 2 }, created_at: '2023-01-01T12:05:00Z' },
      ],
    };

    mockFetch.mockImplementationOnce((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(drawingDataWithoutCanvas),
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
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Elements Only Drawing');
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
      // last_saved_at が null なので、この要素は存在しないことを確認
      expect(screen.queryByTestId('drawing-header-last-saved')).not.toBeInTheDocument();
    });

    // 描画要素がCanvasに正しく渡されていることを確認
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          canvasRef: {
            current: {
              toDataURL: expect.any(Function),
              getContext: expect.any(Function),
              clientWidth: 800,
              clientHeight: 600,
              setAttribute: expect.any(Function),
            },
          },
          isDrawing: false,
          onDrawComplete: expect.any(Function),
          setDrawingElements: expect.any(Function),
          setIsDrawing: expect.any(Function),
          status: {
            isConnected: true,
            isConnecting: false,
            isDisconnected: false,
            error: null,
          },
          drawingElements: [
            {
              id: 'new_element_1',
              type: 'line',
              points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              color: '#000000',
              brushSize: 2,
            },
          ],
        },
        null
      );
    });
  });

  it('APIからデータが正常に読み込まれない場合、エラーメッセージを表示すること', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1, email: 'test@example.com' } }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
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
      expect(screen.getByText(/エラー:/)).toBeInTheDocument();
      expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
    });
  });

  it('APIからcanvas_dataのパースに失敗した場合、drawing_elements_after_saveのみで表示すること', async () => {
    const drawingDataWithInvalidCanvas = {
      title: 'Invalid Canvas Data Drawing',
      last_saved_at: '2023-01-01T12:00:00Z',
      canvas_data: 'invalid json',
      drawing_elements_after_save: [
        { id: 'new_element_1', element_type: 'rectangle', data: { start: { x: 10, y: 10 }, end: { x: 20, y: 20 }, color: '#FF0000', lineWidth: 3 }, created_at: '2023-01-01T12:05:00Z' },
      ],
    };

    mockFetch.mockImplementationOnce((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(drawingDataWithInvalidCanvas),
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
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Invalid Canvas Data Drawing');
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1'); // drawing_elements_after_save のみ表示
    });

    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          canvasRef: {
            current: {
              toDataURL: expect.any(Function),
              getContext: expect.any(Function),
              clientWidth: 800,
              clientHeight: 600,
              setAttribute: expect.any(Function),
            },
          },
          isDrawing: false,
          onDrawComplete: expect.any(Function),
          setDrawingElements: expect.any(Function),
          setIsDrawing: expect.any(Function),
          status: {
            isConnected: true,
            isConnecting: false,
            isDisconnected: false,
            error: null,
          },
          drawingElements: [
            {
              id: 'new_element_1',
              type: 'rectangle',
              start: { x: 10, y: 10 },
              end: { x: 20, y: 20 },
              color: '#FF0000',
              brushSize: 3,
            },
          ],
        },
        null
      );
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
            id: 'new-element-id',
            path: [[0, 0], [1, 1]],
            color: '#000000',
            lineWidth: 2,
          }),
        })
      );
    });
  });

  it('APIから描画ボードのデータを正常に読み込み、表示すること (initial_elements が空の場合)', async () => {
    const emptyDrawingData = {
      title: 'Empty Drawing',
      last_saved_at: null,
      canvas_data: null,
      drawing_elements_after_save: [],
    };

    mockFetch.mockImplementationOnce((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptyDrawingData),
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
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Empty Drawing');
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      // 描画要素が空なので、canvas-elements-count は存在しないことを確認
      expect(screen.queryByTestId('canvas-elements-count')).not.toBeInTheDocument();
    });

    // 描画要素が空であることを確認
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        {
          activeTool: 'pen',
          activeColor: '#000000',
          activeBrushSize: 2,
          canvasRef: {
            current: {
              toDataURL: expect.any(Function),
              getContext: expect.any(Function),
              clientWidth: 800,
              clientHeight: 600,
              setAttribute: expect.any(Function),
            },
          },
          isDrawing: false,
          onDrawComplete: expect.any(Function),
          setDrawingElements: expect.any(Function),
          setIsDrawing: expect.any(Function),
          status: {
            isConnected: true,
            isConnecting: false,
            isDisconnected: false,
            error: null,
          },
          drawingElements: [],
        },
        null
      );
    });
  });
});

const triggerReceivedData = (channelName: string, drawingId: number, data: any) => {
  const key = `${channelName}-${drawingId}`;
  const callback = receivedCallbacksMap.get(key);
  if (callback) {
    callback(data);
  } else {
    console.warn(`No received callback found for channel ${key}`);
  }
};
