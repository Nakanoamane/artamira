import { fetchDrawingsApi } from '../../services/drawingService';
import { vi } from 'vitest';

describe('fetchDrawingsApi', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('描画ボードを正常にフェッチできること', async () => {
    const mockData = {
      drawings: [{ id: 1, title: 'Test Drawing 1' }],
      meta: {
        total_pages: 1,
        current_page: 1,
        per_page: 10,
        total_count: 1,
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchDrawingsApi(1, 10);
    expect(mockFetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/v1/drawings?page=1&per_page=10`,
      {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }
    );
    expect(result).toEqual(mockData);
  });

  it('APIがHTTPエラーを返した場合、エラーをスローすること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchDrawingsApi(1, 10)).rejects.toThrow(
      'HTTP error! status: 404'
    );
  });

  it('ネットワークエラーが発生した場合、エラーをスローすること', async () => {
    const errorMessage = 'Network Error';
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));

    await expect(fetchDrawingsApi(1, 10)).rejects.toThrow(errorMessage);
  });
});
