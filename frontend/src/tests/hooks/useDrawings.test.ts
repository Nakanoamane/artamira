import { renderHook, waitFor, act } from '@testing-library/react';
import useDrawings from '../../hooks/useDrawings';
import { fetchDrawingsApi } from '../../services/drawingService';
import { vi, Mock } from 'vitest';

// fetchDrawingsApi をモックする
vi.mock('../../services/drawingService', () => ({
  fetchDrawingsApi: vi.fn(),
}));

describe('useDrawings', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    (fetchDrawingsApi as Mock).mockReset();
  });

  it('描画ボードの初期ロード時にローディング状態を設定し、データをフェッチすること', async () => {
    const mockData = {
      drawings: [{ id: 1, title: 'Test Drawing 1' }],
      meta: {
        total_pages: 1,
        current_page: 1,
        per_page: 10,
        total_count: 1,
      },
    };
    (fetchDrawingsApi as Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useDrawings());

    // 初期状態の確認
    expect(result.current.loading).toBe(true);
    expect(result.current.drawings).toEqual([]);
    expect(result.current.error).toBeNull();

    // データフェッチ後の状態確認
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.drawings).toEqual(mockData.drawings);
      expect(result.current.totalPages).toBe(mockData.meta.total_pages);
      expect(result.current.error).toBeNull();
    });

    expect(fetchDrawingsApi).toHaveBeenCalledWith(1, 10);
  });

  it('APIフェッチがエラーを返した場合、エラー状態を設定すること', async () => {
    const errorMessage = 'API Error';
    (fetchDrawingsApi as Mock).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDrawings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  it('setCurrentPageが呼び出されたときに新しいページでデータを再フェッチすること', async () => {
    const mockDataPage1 = {
      drawings: [{ id: 1, title: 'Page 1 Drawing' }],
      meta: {
        total_pages: 2,
        current_page: 1,
        per_page: 10,
        total_count: 11,
      },
    };
    const mockDataPage2 = {
      drawings: [{ id: 2, title: 'Page 2 Drawing' }],
      meta: {
        total_pages: 2,
        current_page: 2,
        per_page: 10,
        total_count: 11,
      },
    };

    (fetchDrawingsApi as Mock)
      .mockResolvedValueOnce(mockDataPage1) // 最初のロード
      .mockResolvedValueOnce(mockDataPage2); // ページ変更後のロード

    const { result } = renderHook(() => useDrawings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drawings).toEqual(mockDataPage1.drawings);

    // ページを2に変更
    await act(async () => {
      result.current.setCurrentPage(2);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.drawings).toEqual(mockDataPage2.drawings);
      expect(result.current.currentPage).toBe(2);
    });

    expect(fetchDrawingsApi).toHaveBeenCalledTimes(2);
    expect(fetchDrawingsApi).toHaveBeenCalledWith(2, 10);
  });
});
