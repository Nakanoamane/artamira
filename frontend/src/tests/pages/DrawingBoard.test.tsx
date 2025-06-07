import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect, Mock } from 'vitest'
import React, { useEffect } from 'react'
import DrawingBoard from '../../pages/DrawingBoard'
import { useParams } from 'react-router'
import { MemoryRouter } from 'react-router-dom'
import { CanvasProps } from '../../components/Canvas'
import { HeaderProvider } from '../../contexts/HeaderContext'
import { AuthProvider } from '../../contexts/AuthContext'

// モック化
vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('../../hooks/usePageTitle', () => ({
  usePageTitle: vi.fn((pageTitle) => {
    useEffect(() => {
      // document.title を実際に設定するモック
      document.title = pageTitle;
    }, [pageTitle]);
  }),
}));

vi.mock('../../hooks/useDrawingChannel', () => ({
  useDrawingChannel: vi.fn(() => ({
    channel: { perform: vi.fn() },
    status: { isConnected: true },
  })),
}));

vi.mock('../../components/Canvas', () => ({
  // forwardRefでラップされたコンポーネントのモック
  __esModule: true,
  default: React.forwardRef<HTMLCanvasElement, CanvasProps>(({ onDrawComplete, drawingElementsToRender }, ref) => {
    const mockRef = { current: document.createElement('canvas') };
    // toDataURLのモックを追加
    mockRef.current.toDataURL = vi.fn(() => 'data:image/png;base64,mockpngdata');

    // 親コンポーネントから渡されたrefをモックのcanvas要素に設定
    if (typeof ref === 'function') {
      ref(mockRef.current);
    } else if (ref) {
      ref.current = mockRef.current;
    }

    return (
      <div data-testid="mock-canvas">
        Mock Canvas
        <button onClick={() => onDrawComplete({ id: 'new-element-id', type: 'line', points: [{x:0, y:0}, {x:1, y:1}], color: '#000000', brushSize: 2 })}>
          Draw Complete
        </button>
        {drawingElementsToRender.length > 0 && <span data-testid="canvas-elements-count">{drawingElementsToRender.length}</span>}
      </div>
    );
  }),
}));

vi.mock('../../components/Toolbar', () => ({
  __esModule: true,
  default: vi.fn(({ onUndo, onRedo, onSave, onExportClick, canUndo, canRedo, isDirty, lastSavedAt }) => (
    <div data-testid="mock-toolbar">
      Mock Toolbar
      <button onClick={onUndo} disabled={!canUndo}>Undo</button>
      <button onClick={onRedo} disabled={!canRedo}>Redo</button>
      <button onClick={onSave} disabled={!isDirty}>Save</button>
      <button onClick={onExportClick}>Export</button>
      {lastSavedAt && !isDirty && (
        <span data-testid="last-saved-at">
          最終保存: {lastSavedAt.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
          })}
        </span>
      )}
      {isDirty && <span data-testid="is-dirty-message">未保存の変更があります</span>}
    </div>
  )),
}));

vi.mock('../../components/ExportModal', () => ({
  __esModule: true,
  ExportModal: vi.fn(({ isOpen, onClose, onExport }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-export-modal">
        Mock Export Modal
        <button onClick={() => onExport('png')}>Export PNG</button>
        <button onClick={onClose}>Close Export Modal</button>
      </div>
    );
  }),
}));

describe('DrawingBoard', () => {
  const mockUseParams = useParams as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: '1' });
    (global as any).fetch = vi.fn((url: string) => {
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/me`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, email_address: 'test@example.com' }),
        });
      }
      if (url === `${import.meta.env.VITE_API_URL}/api/v1/drawings/1/`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            title: 'Test Drawing',
            elements: [
              { id: '1', type: 'line', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], color: '#000000', brushSize: 2 }
            ],
            last_saved_at: '2023-01-01T12:00:00Z',
          }),
        });
      }
      if (url.includes('/api/v1/drawings/1/save')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ last_saved_at: '2023-01-01T12:05:00Z' }),
        });
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
    // import.meta.envのモック
    Object.defineProperty(import.meta, 'env', {
      value: {
        VITE_API_URL: 'http://localhost:3000',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ローディング中に「描画ボードを読み込み中...」と表示されること', () => {
    // fetchが解決されない状態をシミュレート
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

  it('APIから描画ボードのデータを正常に読み込み、表示すること', async () => {
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
      expect(document.title).toBe('Test Drawing');
    });
    expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
  });

  it('描画ボードIDがない場合にエラーメッセージを表示すること', async () => {
    mockUseParams.mockReturnValue({ id: undefined });
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
      expect(screen.getByText('エラー: 描画ボードIDが指定されていません。')).toBeInTheDocument();
    });
  });

  it('APIエラーが発生した場合にエラーメッセージを表示すること', async () => {
    (global as any).fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));
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
      expect(screen.getByText('エラー: HTTP error! status: 500')).toBeInTheDocument();
    });
  });

  it('undo/redoが正しく動作すること', async () => {
    render(
      <HeaderProvider>
        <AuthProvider>
          <MemoryRouter>
            <DrawingBoard />
          </MemoryRouter>
        </AuthProvider>
      </HeaderProvider>
    );

    // 初期状態のロードを待つ
    await waitFor(async () => {
      // 最終保存テキストの正規表現をより柔軟に、または関数でチェック
      // DrawingHeaderとToolbarの両方で最終保存テキストが表示される可能性があるため、
      // 内容が正規表現に一致するかを要素のtextContent全体で確認します。
      const lastSavedTextElements = await screen.findAllByText((content, element) => {
        // 正規表現に一致するテキストが存在し、かつ「最終保存:」という文字列が含まれているか
        const hasDatePart = /\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}/.test(content);
        return content.includes('最終保存:') && hasDatePart;
      });
      // 少なくとも1つ以上の要素が見つかることを確認
      expect(lastSavedTextElements).not.toHaveLength(0);
    });

    const drawCompleteButton = screen.getByText('Draw Complete');
    const undoButton = screen.getByText('Undo');
    const redoButton = screen.getByText('Redo');
    const saveButton = screen.getByText('Save');

    // 初期状態ではUndo/Redoはdisabled
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(saveButton).toBeDisabled();


    // 描画を実行 (onDrawCompleteをシミュレート)
    await act(async () => {
      userEvent.click(drawCompleteButton);
    });

    // 描画後に要素が追加され、isDirtyがtrueになる
    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('2');
      expect(undoButton).not.toBeDisabled();
      expect(redoButton).toBeDisabled(); // 描画するとredoStackはクリアされる
      expect(saveButton).not.toBeDisabled();
    });

    // Undoを実行
    await act(async () => {
      userEvent.click(undoButton);
    });

    // Undo後に要素が元に戻り、redoが有効になる
    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('1');
      expect(undoButton).toBeDisabled(); // 最初の状態に戻ったためundoはdisabled
      expect(redoButton).not.toBeDisabled();
      expect(saveButton).not.toBeDisabled();
    });

    // Redoを実行
    await act(async () => {
      userEvent.click(redoButton);
    });

    // Redo後に要素が再度追加される
    await waitFor(() => {
      expect(screen.getByTestId('canvas-elements-count')).toHaveTextContent('2');
      expect(undoButton).not.toBeDisabled();
      expect(redoButton).toBeDisabled();
      expect(saveButton).not.toBeDisabled();
    });
  });
});
