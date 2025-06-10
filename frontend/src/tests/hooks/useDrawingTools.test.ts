import { renderHook, act } from '@testing-library/react';
import { useDrawingTools } from '../../hooks/useDrawingTools';
import { describe, it, expect } from 'vitest';

describe('useDrawingTools', () => {
  it('should return initial tool states', () => {
    const { result } = renderHook(() => useDrawingTools());

    expect(result.current.activeTool).toBe('pen');
    expect(result.current.activeColor).toBe('#000000');
    expect(result.current.activeBrushSize).toBe(2);
  });

  it('should update activeTool', () => {
    const { result } = renderHook(() => useDrawingTools());

    act(() => {
      result.current.setActiveTool('eraser');
    });

    expect(result.current.activeTool).toBe('eraser');
  });

  it('should update activeColor', () => {
    const { result } = renderHook(() => useDrawingTools());

    act(() => {
      result.current.setActiveColor('#FF0000');
    });

    expect(result.current.activeColor).toBe('#FF0000');
  });

  it('should update activeBrushSize', () => {
    const { result } = renderHook(() => useDrawingTools());

    act(() => {
      result.current.setActiveBrushSize(10);
    });

    expect(result.current.activeBrushSize).toBe(10);
  });

  it('should return the latest values after multiple updates', () => {
    const { result } = renderHook(() => useDrawingTools());

    act(() => {
      result.current.setActiveTool('rectangle');
      result.current.setActiveColor('#00FF00');
      result.current.setActiveBrushSize(8);
    });

    expect(result.current.activeTool).toBe('rectangle');
    expect(result.current.activeColor).toBe('#00FF00');
    expect(result.current.activeBrushSize).toBe(8);
  });
});
