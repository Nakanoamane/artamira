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

  it('APIから描画ボードのデータを正常に読み込み、表示すること (elements fallback)', async () => {
    const drawingDataWithoutCanvas = {
      title: 'Test Drawing',
      last_saved_at: '2023-01-01T12:00:00Z',
    };
    const elementsData = {
      drawing_elements: [{ id: '1', type: 'line', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], color: '#000000', brushSize: 2 }],
      last_saved_at: '2023-01-01T12:00:00Z',
    };
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(drawingDataWithoutCanvas),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(elementsData),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
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
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Test Drawing');
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent(
        new Date('2023-01-01T12:00:00Z').toLocaleString('ja-JP')
      );
    });
  });

  it('APIからcanvas_dataを正常に読み込み、表示すること', async () => {
    const drawingDataWithCanvas = {
      title: 'Canvas Data Drawing',
      last_saved_at: '2023-01-01T12:00:00Z',
      canvas_data: JSON.stringify([{ id: 'mock_canvas_data_element', type: 'line', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000000', brushSize: 2 }]),
    };
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(drawingDataWithCanvas),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
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
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Canvas Data Drawing');
      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent(
        new Date('2023-01-01T12:00:00Z').toLocaleString('ja-JP')
      );
    });

    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        expect.objectContaining({
          drawingElements: expect.arrayContaining([
            expect.objectContaining({ id: 'mock_canvas_data_element' })
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  it('Toolbarの保存ボタンがクリックされたときにAPIが呼び出され、last_saved_atが更新されること', async () => {
    const initialDrawingData = {
      title: 'Save Test Drawing',
      last_saved_at: '2023-01-01T10:00:00Z',
      canvas_data: JSON.stringify([{ id: 'initial_canvas_data_element', type: 'line', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000000', brushSize: 2 }]),
    };
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialDrawingData),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
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
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Save Test Drawing');
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent(
        new Date('2023-01-01T10:00:00Z').toLocaleString('ja-JP')
      );
    });

    const saveButton = screen.getByTestId('save-button');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    act(() => {
      const drawCompleteButton = screen.getByTestId('draw-complete-button');
      fireEvent.click(drawCompleteButton);
    });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
      expect(screen.getByTestId('is-dirty-message')).toBeInTheDocument();
      expect(screen.getByTestId('drawing-header-dirty-status')).toBeInTheDocument();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('canvas_data'),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent(
        new Date('2023-01-01T12:05:00Z').toLocaleString('ja-JP')
      );
      expect(screen.queryByTestId('is-dirty-message')).not.toBeInTheDocument();
      expect(screen.queryByTestId('drawing-header-dirty-status')).not.toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  it('ウィンドウを閉じる前に未保存の変更がある場合、ユーザーに警告を促すこと', async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Unsaved Test Drawing',
            last_saved_at: '2023-01-01T10:00:00Z',
            canvas_data: JSON.stringify([{ id: 'initial_canvas_data_element', type: 'line', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#000000', brushSize: 2 }]),
          }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });

    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Unsaved Test Drawing');
      expect(screen.getByTestId('drawing-header-last-saved')).toHaveTextContent(
        new Date('2023-01-01T10:00:00Z').toLocaleString('ja-JP')
      );
    });

    const saveButton = screen.getByTestId('save-button');

    act(() => {
      const drawCompleteButton = screen.getByTestId('draw-complete-button');
      fireEvent.click(drawCompleteButton);
    });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
      expect(screen.getByTestId('is-dirty-message')).toBeInTheDocument();
    });

    const preventDefaultSpy = vi.spyOn(Event.prototype, 'preventDefault');

    act(() => {
      const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(beforeUnloadEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    preventDefaultSpy.mockRestore();
  });

  it('エクスポートボタンがクリックされたときにExportModalが表示されること', async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Export Modal Test',
            last_saved_at: '2023-01-01T10:00:00Z',
            canvas_data: JSON.stringify([{ id: 'initial-export-test', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 1 }]),
          }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });
    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
    });

    const exportButton = screen.getByTestId('export-button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'エクスポート' })).toBeInTheDocument();
    });
  });

  it('ExportModalでエクスポート形式を選択するとAPIが呼び出され、ファイルがダウンロードされること', async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Export Download Test',
            last_saved_at: '2023-01-01T10:00:00Z',
            canvas_data: JSON.stringify([{ id: 'initial-download-test', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 1 }]),
          }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/export`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          if (body.image_data && body.format === 'png') {
            return Promise.resolve({
              ok: true,
              blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
              headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
            });
          }
        }
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });
    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
    });

    const exportButton = screen.getByTestId('export-button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'エクスポート' })).toBeInTheDocument();
    });

    const exportConfirmButton = screen.getByTestId('png-export-button');
    fireEvent.click(exportConfirmButton);

    await waitFor(() => {
      expect(mockAnchorElement.click).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'エクスポート' })).not.toBeInTheDocument();
    });
  });

  it('エクスポートが失敗した場合、エラーメッセージが表示されること', async () => {
    mockFetch.mockImplementation((url: string, _options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Error Export Test',
            last_saved_at: '2023-01-01T10:00:00Z',
            canvas_data: JSON.stringify([{ id: 'initial-el-error-test', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 1 }]),
          }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });

    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('drawing-header-title')).toHaveTextContent('Error Export Test');
    });

    mockedCanvasToDataURL.mockImplementation(() => {
      throw new Error('Mock toDataURL error');
    });

    fireEvent.click(screen.getByTestId('export-button'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'エクスポート' })).toBeInTheDocument();
    });

    const exportConfirmButton = screen.getByTestId('png-export-button');
    fireEvent.click(exportConfirmButton);

    await waitFor(() => {
      expect(mockedCanvasToDataURL).toHaveBeenCalled();
      expect(screen.getByText('エクスポートに失敗しました: Mock toDataURL error')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'エクスポート' })).toBeInTheDocument();
    });
  });

  it('toolbarのUndo/Redoボタンが機能すること', async () => {
    const initialDrawingData = {
      title: 'Undo Redo Test',
      last_saved_at: '2023-01-01T10:00:00Z',
      canvas_data: JSON.stringify([]),
    };
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialDrawingData),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });

    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('undo-button')).toBeDisabled();
      expect(screen.getByTestId('redo-button')).toBeDisabled();
      expect(screen.queryByTestId('canvas-elements-count')).not.toBeInTheDocument();
    });

    act(() => {
      const drawCompleteButton = screen.getByTestId('draw-complete-button');
      fireEvent.click(drawCompleteButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
      expect(screen.getByTestId('undo-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('undo-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('canvas-elements-count')).not.toBeInTheDocument();
      expect(screen.getByTestId('redo-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('redo-button'));
    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
      expect(screen.getByTestId('undo-button')).not.toBeDisabled();
      expect(screen.getByTestId('redo-button')).toBeDisabled();
    });
  });

  it('Action Cable経由で新しい描画要素を受信し、Canvasに反映されること', async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Action Cable Test',
            last_saved_at: '2023-01-01T10:00:00Z',
            canvas_data: JSON.stringify([{ id: 'initial-cable-test', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 1 }]),
          }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });
    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(mockedUseDrawingChannelHook).toHaveBeenCalled();
    });

    act(() => {
      triggerReceivedData('DrawingChannel', 1, {
        type: "drawing_element_created",
        drawing_element: {
          id: 'new-cable-el',
          element_type: 'circle',
          data: {
            center: { x: 50, y: 50 },
            radius: 20,
            color: '#FF0000',
            lineWidth: 5,
          },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('2');
    });

    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        expect.objectContaining({
          drawingElements: expect.arrayContaining([
            expect.objectContaining({ id: 'initial-cable-test' }),
            expect.objectContaining({ id: 'new-cable-el' }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  it('ツールバーのボタンがCanvasのactiveTool、activeColor、activeBrushSizeを変更すること', async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Toolbar Change Test',
            last_saved_at: '2023-01-01T10:00:00Z',
            canvas_data: JSON.stringify([{ id: 'initial-toolbar-test', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 1 }]),
          }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/elements`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ drawing_elements: [], last_saved_at: null }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "success", message: "Drawing saved successfully.", last_saved_at: '2023-01-01T12:05:00Z', canvas_data: body.canvas_data }),
          });
        }
      }
      if (url.includes('/api/v1/drawings/1/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock image data'], { type: 'image/png' })),
          headers: new Headers({ 'Content-Disposition': 'attachment; filename="mock_drawing.png"' }),
        });
      }
      return Promise.reject(new Error(`not mocked for URL: ${url}`));
    });
    render(
      <HeaderProvider><AuthProvider><MemoryRouter><DrawingBoard /></MemoryRouter></AuthProvider></HeaderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('set-pen-tool'));
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        expect.objectContaining({ activeTool: 'pen' }),
        expect.any(Object)
      );
    });

    userEvent.click(screen.getByTestId('set-red-color'));
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        expect.objectContaining({ activeColor: '#FF0000' }),
        expect.any(Object)
      );
    });

    userEvent.click(screen.getByTestId('set-brush-size'));
    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        expect.objectContaining({ activeBrushSize: 10 }),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(mockedCanvasRenderFn).toHaveBeenCalledWith(
        expect.objectContaining({ activeTool: 'pen', activeColor: '#FF0000', activeBrushSize: 10 }),
        expect.any(Object)
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
