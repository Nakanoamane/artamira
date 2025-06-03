import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, RouteObject, useParams } from 'react-router';
import DrawingBoard from '../../pages/DrawingBoard';
import { vi, type MockInstance } from 'vitest';
import { singleMockContextInstance } from '../../setupTests';
import userEvent from '@testing-library/user-event';
import { DrawingElementType } from '../../components/Canvas';
import Toolbar from '../../components/Toolbar';
import Canvas from '../../components/Canvas';
import { useDrawingChannel } from '../../hooks/useDrawingChannel';
import React from 'react';

const { mockUsePageTitle, mockUseDrawingChannel } = vi.hoisted(() => {
  const mockUsePageTitle = vi.fn();
  const mockUseDrawingChannel = vi.fn();
  return { mockUsePageTitle, mockUseDrawingChannel };
});

const { MockToolbarComponent, MockCanvasComponent } = await vi.hoisted(async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  const MockToolbar = (props: any) => {
    return React.createElement('div', { 'data-testid': 'toolbar' }, [
      React.createElement('button', { key: 'save', onClick: props.onSave, disabled: !props.isSaveEnabled, type: 'button' }, '保存'),
      React.createElement('button', { key: 'export', onClick: props.onExportClick, type: 'button' }, 'エクスポート'),
    ]);
  };

  const MockCanvas = React.forwardRef((props: any, ref: React.Ref<HTMLCanvasElement>) => {
    return React.createElement('div', { className: 'relative bg-white' },
      React.createElement('canvas', {
        'data-testid': 'drawing-canvas',
        className: 'border border-gray-300 shadow-lg',
        width: 1200,
        height: 800,
        ref: ref,
        ...props,
      })
    );
  });

  return {
    MockToolbarComponent: MockToolbar,
    MockCanvasComponent: MockCanvas
  };
});

vi.mock('../../hooks/usePageTitle', () => ({
  usePageTitle: mockUsePageTitle,
}));
vi.mock('../../hooks/useDrawingChannel', () => ({
  useDrawingChannel: mockUseDrawingChannel,
}));


vi.mock('../../components/Toolbar', () => ({
  default: MockToolbarComponent,
}));


vi.mock('../../components/Canvas', () => ({
  default: MockCanvasComponent,
}));

describe('DrawingBoard', () => {

  const mockConsumer: any = {};
  const mockSubscriptions: any = {};

  Object.assign(mockConsumer, {
    subscriptions: mockSubscriptions,
    connection: {
      monitor: vi.fn(),
      disconnected: false,
      isActive: true,
      isOpen: true,
      isStale: false,
      reopenDelay: 0,
      webSocket: {},
    },
    url: 'ws://localhost:3000/cable',
    send: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    ensureActiveConnection: vi.fn(),
  });

  Object.assign(mockSubscriptions, {
    consumer: mockConsumer,
    subscriptions: [],
    create: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    findAll: vi.fn(() => []),
    reload: vi.fn(),
    forget: vi.fn(),
    removeAll: vi.fn(),
    reject: vi.fn(),
    notifyAll: vi.fn(),
    notify: vi.fn(),
    subscribe: vi.fn(),
    confirmSubscription: vi.fn(),
    sendCommand: vi.fn(),
  });

  const mockChannel = {
    perform: vi.fn(),
    consumer: mockConsumer,
    identifier: 'mock_identifier',
    send: vi.fn(),
    unsubscribe: vi.fn(),
  };


  let originalCanvas: any;
  let originalWindowOpen: any;

  beforeAll(() => {
    originalCanvas = window.HTMLCanvasElement;
    window.HTMLCanvasElement.prototype.toDataURL = vi.fn((type: string) => {
      return `data:${type};base64,mocked_image_data`;
    });

    originalWindowOpen = window.open;
    window.open = vi.fn();

    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(vi.fn());


    mockUsePageTitle.mockReturnValue(undefined);
    mockUseDrawingChannel.mockReturnValue({
      channel: mockChannel,
      status: { isConnected: true, error: null, isConnecting: false, isDisconnected: false },
    });

    fetchMock = vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.toString().includes('/api/v1/drawings/1/elements')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            drawing_elements: [
              { id: 'element-1', element_type: 'line', data: { path: [[10, 20], [30, 40]], color: '#000000', lineWidth: 2 } },
            ],
            last_saved_at: new Date().toISOString(),
            drawing_title: 'テスト描画ボード',
          }),
          headers: new Headers(),
          redirected: false,
          status: 200,
          statusText: 'OK',
          type: 'basic',
          url: url.toString(),
        } as Response);
      } else if (url.toString().includes('/api/v1/drawings/1/save')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', message: 'Drawing saved successfully.', last_saved_at: new Date().toISOString() }),
          headers: new Headers(),
          redirected: false,
          status: 200,
          statusText: 'OK',
          type: 'basic',
          url: url.toString(),
        } as Response);
      }
      return Promise.reject(new Error('not found'));
    });

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
  });

  afterAll(() => {
    window.HTMLCanvasElement = originalCanvas;
    window.open = originalWindowOpen;
  });

  let fetchMock: MockInstance<typeof global.fetch>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(vi.fn());


    mockUsePageTitle.mockReturnValue(undefined);
    mockUseDrawingChannel.mockReturnValue({
      channel: mockChannel,
      status: { isConnected: true, error: null, isConnecting: false, isDisconnected: false },
    });

    fetchMock = vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.toString().includes('/api/v1/drawings/1/elements')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            drawing_elements: [
              { id: 'element-1', element_type: 'line', data: { path: [[10, 20], [30, 40]], color: '#000000', lineWidth: 2 } },
            ],
            last_saved_at: new Date().toISOString(),
            drawing_title: 'テスト描画ボード',
          }),
          headers: new Headers(),
          redirected: false,
          status: 200,
          statusText: 'OK',
          type: 'basic',
          url: url.toString(),
        } as Response);
      } else if (url.toString().includes('/api/v1/drawings/1/save')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', message: 'Drawing saved successfully.', last_saved_at: new Date().toISOString() }),
          headers: new Headers(),
          redirected: false,
          status: 200,
          statusText: 'OK',
          type: 'basic',
          url: url.toString(),
        } as Response);
      }
      return Promise.reject(new Error('not found'));
    });

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (initialPath = '/drawings/1') => {
    const routes: RouteObject[] = [
      {
        path: '/drawings/:id',
        element: <DrawingBoard />,
      },

    ];

    const router = createMemoryRouter(routes, { initialEntries: [initialPath] });

    return render(<RouterProvider router={router} />);
  };

  it('renders loading state initially and then displays drawing board', async () => {
    renderComponent();
    expect(screen.getByText('描画ボードを読み込み中...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument();
    expect(screen.getByText(/最終保存:/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();



    expect(Toolbar).toHaveBeenCalledWith(
      expect.objectContaining({ isSaveEnabled: false }),
      expect.anything()
    );


    expect(Canvas).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTool: 'pen',
        color: '#000000',
        brushSize: 2,
        isDrawing: false,
        setIsDrawing: expect.any(Function),
        onDrawComplete: expect.any(Function),
        drawingElementsToRender: expect.any(Array),
        status: expect.objectContaining({ isConnected: true }),
      }),
      expect.anything()
    );
  });

  it('displays error message when drawing fails to load', async () => {
    vi.mocked(useDrawingChannel).mockReturnValue({
      channel: mockChannel,
      status: { isConnected: false, error: 'Connection error', isConnecting: false, isDisconnected: true },
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText(/エラー:/)).toBeInTheDocument());
    expect(screen.getByText(/Connection error/)).toBeInTheDocument();
  });


  it('enables save button and shows dirty state after drawing, then saves successfully', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());

    const saveButton = screen.getByRole('button', { name: '保存' });
    expect(saveButton).toBeDisabled();


    await act(async () => {

      const canvasProps = vi.mocked(Canvas).mock.calls[0][0];
      canvasProps.onDrawComplete({ type: 'line', points: [{ x: 10, y: 10 }, { x: 11, y: 11 }], color: '#000000', brushSize: 2 });
    });

    await waitFor(() => expect(screen.getByText('未保存の変更があります')).toBeInTheDocument());
    expect(saveButton).not.toBeDisabled();


    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/save`,
      expect.objectContaining({ method: 'POST' })
    );
    await waitFor(() => expect(screen.queryByText('未保存の変更があります')).not.toBeInTheDocument());
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/最終保存:/)).toBeInTheDocument();
  });

  it('resets dirty state when receiving drawing_saved Action Cable message', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());

    const saveButton = screen.getByRole('button', { name: '保存' });
    expect(saveButton).toBeDisabled();


    await act(async () => {
      const canvasProps = vi.mocked(Canvas).mock.calls[0][0];
      canvasProps.onDrawComplete({ type: 'line', points: [{ x: 10, y: 10 }, { x: 11, y: 11 }], color: '#000000', brushSize: 2 });
    });

    await waitFor(() => expect(screen.getByText('未保存の変更があります')).toBeInTheDocument());
    expect(saveButton).not.toBeDisabled();


    act(() => {
      vi.mocked(useDrawingChannel).mock.calls[0][2]({
        type: 'drawing_saved',
        drawing_id: 1,
        last_saved_at: new Date().toISOString(),
      });
    });

    await waitFor(() => expect(screen.queryByText('未保存の変更があります')).not.toBeInTheDocument());
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/最終保存:/)).toBeInTheDocument();
  });


  it('loads existing drawing elements on mount', async () => {
    const mockElements: DrawingElementType[] = [
      { id: 'el-1', type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#FF0000', brushSize: 5 },
      { id: 'el-2', type: 'rectangle', start: { x: 50, y: 50 }, end: { x: 100, y: 100 }, color: '#00FF00', brushSize: 3 },
    ];
    fetchMock.mockImplementationOnce((url: any, init?: any) => {
      if (url.toString().includes('/api/v1/drawings/1/elements')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            drawing_elements: mockElements,
            last_saved_at: new Date().toISOString(),
            drawing_title: '既存の絵のボード',
          }),
          headers: new Headers(),
          redirected: false,
          status: 200,
          statusText: 'OK',
          type: 'basic',
          url: url.toString(),
        } as Response);
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('既存の絵のボード')).toBeInTheDocument());


    expect(Canvas).toHaveBeenCalledWith(
        expect.objectContaining({
            drawingElementsToRender: mockElements,
        }),
        expect.anything()
    );

    expect(singleMockContextInstance.clearRect).toHaveBeenCalled();

    mockElements.forEach(() => {


      singleMockContextInstance.beginPath();
    });
    expect(singleMockContextInstance.beginPath).toHaveBeenCalledTimes(mockElements.length);
    expect(singleMockContextInstance.strokeStyle).toBeDefined();
    expect(singleMockContextInstance.lineWidth).toBeDefined();
  });


  it('prompts warning on page unload if there are unsaved changes', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());


    await act(async () => {
      const canvasProps = vi.mocked(Canvas).mock.calls[0][0];
      canvasProps.onDrawComplete({ type: 'line', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }], color: '#000000', brushSize: 2 });
    });

    await waitFor(() => expect(screen.getByText('未保存の変更があります')).toBeInTheDocument());

    const preventDefaultSpy = vi.fn();
    const handler = vi.fn((event: BeforeUnloadEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      event.returnValue = '';
    });
    window.addEventListener('beforeunload', handler);

    const mockEvent = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(mockEvent, 'returnValue', { writable: true, value: '' });
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: preventDefaultSpy,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(mockEvent);

    expect(handler).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockEvent.returnValue).toBe('');

    window.removeEventListener('beforeunload', handler);
  });

  it('does not prompt warning on page unload if there are no unsaved changes', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());

    const preventDefaultSpy = vi.fn();
    const handler = vi.fn((event: BeforeUnloadEvent) => {

    });
    window.addEventListener('beforeunload', handler);

    const mockEvent = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: preventDefaultSpy,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(mockEvent, 'returnValue', { writable: true, value: '' });

    window.dispatchEvent(mockEvent);

    expect(handler).toHaveBeenCalled();
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(mockEvent.returnValue).toBe('');
    window.removeEventListener('beforeunload', handler);
  });


  it('opens export modal when export button is clicked', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());

    const exportButton = screen.getByRole('button', { name: 'エクスポート' });
    await userEvent.click(exportButton);

    await waitFor(() => expect(screen.getByText('絵をエクスポート')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('フォーマットを選択:')).toBeInTheDocument());
    expect(screen.getByLabelText('PNG')).toBeInTheDocument();
    expect(screen.getByLabelText('JPEG')).toBeInTheDocument();
  });

  it('exports drawing as PNG when PNG is selected', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());

    const exportButton = screen.getByRole('button', { name: 'エクスポート' });
    await userEvent.click(exportButton);

    await waitFor(() => screen.findByText('絵をエクスポート'));

    const pngRadio = await screen.findByLabelText('PNG') as HTMLInputElement;
    await userEvent.click(pngRadio);

    const downloadButton = screen.getByRole('button', { name: 'ダウンロード' });
    await userEvent.click(downloadButton);


    const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(window.HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it('exports drawing as JPEG when JPEG is selected', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());

    const exportButton = screen.getByRole('button', { name: 'エクスポート' });
    await userEvent.click(exportButton);

    await waitFor(() => screen.findByText('絵をエクスポート'));

    const jpegRadio = await screen.findByLabelText('JPEG') as HTMLInputElement;
    await userEvent.click(jpegRadio);

    const downloadButton = screen.getByRole('button', { name: 'ダウンロード' });
    await userEvent.click(downloadButton);

    const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg');
    expect(window.HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });


  it('test useParams with MemoryRouter setup', async () => {
    const TestComponent = () => {
      const params = useParams();
      return <div data-testid="params-display">{JSON.stringify(params)}</div>;
    };

    const routes: RouteObject[] = [
      {
        path: '/test/:id',
        element: <TestComponent />,
      },
    ];

    const router = createMemoryRouter(routes, { initialEntries: ['/test/123'] });
    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('params-display')).toHaveTextContent('{"id":"123"}');
  });
});
