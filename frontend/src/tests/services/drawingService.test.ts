import { fetchDrawingsApi } from '../../services/drawingService';
import { vi } from 'vitest';
import { createDrawing } from '../../services/drawingService';

// fetchをモックする
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchDrawingsApi', () => {
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

describe('drawingService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('描画作成APIが成功した場合、新しい描画データを返すこと', async () => {
    const mockDrawing = { id: 1, title: 'Test Drawing' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDrawing),
    });

    const result = await createDrawing('Test Title', 1);
    expect(mockFetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/api/v1/drawings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawing: { title: 'Test Title', user_id: 1 } }),
      credentials: 'include',
    });
    expect(result).toEqual(mockDrawing);
  });

  it('描画作成APIが失敗した場合、エラーをスローすること', async () => {
    const errorMessage = 'Internal Server Error';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: errorMessage }),
    });

    await expect(createDrawing('Test Title', 1)).rejects.toThrow(errorMessage);
  });

  it('HTTPステータスが不正な場合、汎用エラーメッセージをスローすること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}), // メッセージがない場合
    });

    await expect(createDrawing('Test Title', 1)).rejects.toThrow('HTTP error! status: 404');
  });
});
