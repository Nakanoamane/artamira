import { renderHook, act } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useCreateDrawing } from '../../hooks/useCreateDrawing';
import * as AuthContext from '../../contexts/AuthContext';
import * as DrawingService from '../../services/drawingService';
import { MemoryRouter } from 'react-router';

// useNavigate をモックする
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useCreateDrawing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, email_address: 'test@example.com' },
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  it('描画作成が成功した場合、ナビゲートされること', async () => {
    const mockDrawing = { id: 123, title: 'Test Drawing' };
    vi.spyOn(DrawingService, 'createDrawing').mockResolvedValue(mockDrawing);

    const { result } = renderHook(() => useCreateDrawing(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleCreateDrawing('Test Title');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/drawings/123');
  });

  it('描画作成が失敗した場合、エラーがセットされること', async () => {
    const errorMessage = 'API Error';
    vi.spyOn(DrawingService, 'createDrawing').mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCreateDrawing(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleCreateDrawing('Test Title');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ユーザーが認証されていない場合、エラーがセットされること', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });

    const { result } = renderHook(() => useCreateDrawing(), { wrapper: MemoryRouter });

    await act(async () => {
      await result.current.handleCreateDrawing('Test Title');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('ユーザーが認証されていません。');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
