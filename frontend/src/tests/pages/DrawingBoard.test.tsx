/// <reference types="vitest/globals" />
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useParams, useNavigate } from 'react-router-dom';
import DrawingBoard from '../../pages/DrawingBoard';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDrawingChannel } from '../../hooks/useDrawingChannel';
import { vi } from 'vitest';

// モック化するフック
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  };
});
vi.mock('../../hooks/usePageTitle');
vi.mock('../../hooks/useDrawingChannel');

describe('DrawingBoard', () => {
  const mockUseParams = useParams as vi.Mock;
  const mockUseNavigate = useNavigate as vi.Mock;
  const mockUsePageTitle = usePageTitle as vi.Mock;
  const mockUseDrawingChannel = useDrawingChannel as vi.Mock;

  const mockChannel = {
    perform: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: '1' });
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUsePageTitle.mockReturnValue(undefined);
    mockUseDrawingChannel.mockReturnValue({
      channel: mockChannel,
      status: { isConnected: true, error: null },
    });

    // fetch APIをモック化
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/v1/drawings/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, title: 'テスト描画ボード' }),
        } as Response);
      }
      return Promise.reject(new Error('not found'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/drawings/1']}>
        <DrawingBoard />
      </MemoryRouter>
    );
  };

  it('renders loading state initially and then displays drawing board', async () => {
    renderComponent();
    expect(screen.getByText('描画ボードを読み込み中...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('テスト描画ボード')).toBeInTheDocument());
    expect(screen.getByText('ツールバー')).toBeInTheDocument();
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument();
  });

  it('displays error message when drawing fails to load', async () => {
    mockUseParams.mockReturnValue({ id: '999' }); // 存在しないIDをモック
    (global.fetch as vi.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ message: 'Not Found' }) })
    );

    renderComponent();
    await waitFor(() => expect(screen.getByText(/エラー:/)).toBeInTheDocument());
    expect(screen.getByText(/HTTP error! status: 404/)).toBeInTheDocument();
  });
});
