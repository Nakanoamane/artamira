import { renderHook, act, waitFor } from '@testing-library/react';
import { useDrawingPersistence } from '../../hooks/useDrawingPersistence';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { DrawingElementType } from '../../utils/drawingElementsParser';

let mockFetch: MockInstance;

describe('useDrawingPersistence', () => {
  const mockDrawingId = 123;
  const mockDrawingElements: DrawingElementType[] = [
    {
      id: 'line-1',
      type: 'line',
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      color: '#000000',
      brushSize: 5,
    },
  ];
  const mockLastSavedAt = new Date('2023-01-01T10:00:00Z');

  // DrawingElementType[] を RawDrawingElement[] に変換するヘルパー関数
  const convertToRawDrawingElements = (elements: DrawingElementType[]): any[] => {
    return elements.map(element => {
      if (element.type === 'line') {
        return {
          id: element.id,
          element_type: 'line',
          data: {
            path: element.points.map(p => [p.x, p.y]),
            color: element.color,
            lineWidth: element.brushSize,
          },
        };
      } else if (element.type === 'rectangle') {
        return {
          id: element.id,
          element_type: 'rectangle',
          data: {
            start: element.start,
            end: element.end,
            color: element.color,
            lineWidth: element.brushSize,
          },
        };
      } else if (element.type === 'circle') {
        return {
          id: element.id,
          element_type: 'circle',
          data: {
            center: element.center,
            radius: element.radius,
            color: element.color,
            brushSize: element.brushSize,
          },
        };
      }
      return null; // 未知のタイプは無視
    }).filter(Boolean);
  };

  let originalJSONParse: (text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) => any;

  beforeEach(() => {
    originalJSONParse = JSON.parse; // 元のJSON.parseを保存
    mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: mockDrawingId,
        title: 'Test Drawing',
        canvas_data: JSON.stringify({ elements: convertToRawDrawingElements(mockDrawingElements) }),
        last_saved_at: mockLastSavedAt.toISOString(),
        drawing_elements_after_save: [],
      }),
    } as Response);

    vi.spyOn(JSON, 'parse').mockImplementation((jsonString, reviver) => {
      if (jsonString === 'invalid json') {
        throw new Error('Failed to parse canvas_data: invalid json');
      }
      return originalJSONParse(jsonString, reviver); // 元のJSON.parseを呼び出す
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial loading state and fetch drawing data', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    expect(result.current.loadingDrawing).toBe(true);
    expect(result.current.drawing).toBeNull();
    expect(result.current.errorDrawing).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.initialDrawingElements).toEqual([]);
    expect(result.current.initialLastSavedAt).toBeNull();

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    expect(result.current.drawing).toEqual({ id: mockDrawingId, title: 'Test Drawing' });
    expect(result.current.errorDrawing).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.initialDrawingElements).toEqual(mockDrawingElements);
    expect(result.current.initialLastSavedAt).toEqual(mockLastSavedAt);
  });

  it('should handle drawing data fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    expect(result.current.errorDrawing).toBe('HTTP error! status: 404');
    expect(result.current.drawing).toBeNull();
    expect(result.current.initialDrawingElements).toEqual([]);
    expect(result.current.initialLastSavedAt).toBeNull();
  });

  it('should handle missing drawingId gracefully', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: undefined }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    expect(result.current.errorDrawing).toBe('描画ボードIDが指定されていません。');
    expect(result.current.drawing).toBeNull();
  });

  it('should handle saving drawing elements', async () => {
    const mockSaveResponse = new Date('2023-01-01T10:05:00Z');
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: mockDrawingId,
          title: 'Test Drawing',
          canvas_data: JSON.stringify({ elements: convertToRawDrawingElements(mockDrawingElements) }),
          last_saved_at: mockLastSavedAt.toISOString(), // Initial data for this test
          drawing_elements_after_save: [],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ last_saved_at: mockSaveResponse.toISOString() }), // Saved data for this test
      } as Response);

    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    // Wait for initial fetch to complete
    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    act(() => {
      result.current.setIsDirty(true);
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.handleSave(mockDrawingElements);
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSavedAt).toEqual(mockSaveResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/v1/drawings/${mockDrawingId}/save`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ canvas_data: JSON.stringify(mockDrawingElements) }),
      }),
    );
  });

  it('should not save if not dirty or drawingId is missing', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    mockFetch.mockClear();

    act(() => {
      result.current.handleSave(mockDrawingElements);
    });

    expect(mockFetch).not.toHaveBeenCalled();

    const { result: noIdResult } = renderHook(() => useDrawingPersistence({ drawingId: undefined }));

    await waitFor(() => expect(noIdResult.current.loadingDrawing).toBe(false));

    act(() => {
      noIdResult.current.setIsDirty(true);
    });

    act(() => {
      noIdResult.current.handleSave(mockDrawingElements);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should set initial drawing elements and last saved at', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    expect(result.current.initialDrawingElements).toEqual(mockDrawingElements);
    expect(result.current.initialLastSavedAt).toEqual(mockLastSavedAt);
  });

  it('should set dirty state', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    act(() => {
      result.current.setIsDirty(true);
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.setIsDirty(false);
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('should set last saved at', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    const newDate = new Date();
    act(() => {
      result.current.setLastSavedAt(newDate);
    });

    expect(result.current.lastSavedAt).toEqual(newDate);
  });

  it('should warn on beforeunload if isDirty is true', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    act(() => {
      result.current.setIsDirty(true);
    });

    const preventDefault = vi.fn();
    const event = new Event('beforeunload', { cancelable: true });
    event.preventDefault = preventDefault;

    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should not warn on beforeunload if isDirty is false', async () => {
    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    act(() => {
      result.current.setIsDirty(false);
    });

    const preventDefault = vi.fn();
    const event = new Event('beforeunload', { cancelable: true });
    event.preventDefault = preventDefault;

    window.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('should handle canvas_data parse error and still show drawing_elements_after_save', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: mockDrawingId,
        title: 'Test Drawing',
        canvas_data: 'invalid json',
        drawing_elements_after_save: convertToRawDrawingElements(mockDrawingElements),
      }),
    } as Response);

    const { result } = renderHook(() => useDrawingPersistence({ drawingId: mockDrawingId }));

    await waitFor(() => expect(result.current.loadingDrawing).toBe(false));

    expect(result.current.errorDrawing).toBe('Failed to parse canvas_data: invalid json');
    expect(result.current.drawing).toEqual({ id: mockDrawingId, title: 'Test Drawing' });
    expect(result.current.initialDrawingElements).toEqual(mockDrawingElements);
    expect(result.current.initialLastSavedAt).toBeNull();
  });
});
