import { renderHook, act } from '@testing-library/react';
import { useDrawingExport } from '../../hooks/useDrawingExport';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

describe('useDrawingExport', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockLink: HTMLAnchorElement;
  let appendChildSpy: Mock;
  let removeChildSpy: Mock;
  let clickSpy: Mock;

  let originalCreateElement: typeof document.createElement; // 元のcreateElementを保存

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document); // ここを修正

    mockCanvas = document.createElement('canvas');
    (mockCanvas.toDataURL as Mock) = vi.fn(() => 'data:image/png;base64,mockpngdata');

    mockLink = document.createElement('a');
    appendChildSpy = vi.spyOn(document.body, 'appendChild') as Mock;
    removeChildSpy = vi.spyOn(document.body, 'removeChild') as Mock;
    clickSpy = vi.spyOn(mockLink, 'click') as Mock;

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas;
      if (tagName === 'a') return mockLink;
      return originalCreateElement(tagName); // 元のcreateElementを呼び出す
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial states', () => {
    const { result } = renderHook(() => useDrawingExport());

    expect(result.current.isExportModalOpen).toBe(false);
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();
  });

  it('should open the export modal when handleExportClick is called', () => {
    const { result } = renderHook(() => useDrawingExport());

    act(() => {
      result.current.handleExportClick();
    });

    expect(result.current.isExportModalOpen).toBe(true);
  });

  it('should handle PNG export correctly', async () => {
    const { result } = renderHook(() => useDrawingExport());
    const canvasRef = { current: mockCanvas };

    act(() => {
      result.current.handleExport('png', canvasRef);
    });

    await vi.waitFor(() => {
      expect(result.current.exportError).toBeNull();
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.download).toBe('drawing.png');
      expect(mockLink.href).toBe('data:image/png;base64,mockpngdata');
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.isExporting).toBe(false);
    });
  });

  it('should handle JPEG export correctly', async () => {
    const { result } = renderHook(() => useDrawingExport());
    const canvasRef = { current: mockCanvas };

    act(() => {
      result.current.handleExport('jpeg', canvasRef);
    });

    await vi.waitFor(() => {
      expect(result.current.exportError).toBeNull();
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg');
      expect(mockLink.download).toBe('drawing.jpeg');
      expect(mockLink.href).toBe('data:image/png;base64,mockpngdata');
      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.isExporting).toBe(false);
    });
  });

  it('should set export error if canvasRef.current is null', async () => {
    const { result } = renderHook(() => useDrawingExport());
    const canvasRef = { current: null };

    act(() => {
      result.current.handleExport('png', canvasRef);
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBe('Canvasが利用できません。');
    expect(mockCanvas.toDataURL).not.toHaveBeenCalled();
    expect(appendChildSpy).not.toHaveBeenCalledWith(mockLink);
  });

  it('should set export error if export fails', async () => {
    (mockCanvas.toDataURL as Mock).mockImplementationOnce(() => {
      throw new Error('Test export failure');
    });

    const { result } = renderHook(() => useDrawingExport());
    const canvasRef = { current: mockCanvas };

    act(() => {
      result.current.handleExport('png', canvasRef);
    });

    await vi.waitFor(() => {
      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportError).toBe('エクスポートに失敗しました: Test export failure');
    });
  });
});
