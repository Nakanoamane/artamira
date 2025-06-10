import { renderHook, act } from '@testing-library/react';
import { useDrawingElements } from '../../hooks/useDrawingElements';
import { describe, it, expect, vi } from 'vitest';
import { DrawingElementType } from '../../utils/drawingElementsParser';

describe('useDrawingElements', () => {
  const mockSetIsDirty = vi.fn();
  const mockOnNewElementCreated = vi.fn();

  beforeEach(() => {
    mockSetIsDirty.mockClear();
    mockOnNewElementCreated.mockClear();
  });

  it('should return initial states', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty));

    expect(result.current.drawingElements).toEqual([]);
    expect(result.current.undoStack).toEqual([]);
    expect(result.current.redoStack).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should add a drawing element and manage stacks on handleDrawComplete', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated));

    const newElement: DrawingElementType = {
      id: '1',
      type: 'line',
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      color: '#000',
      brushSize: 5,
    };

    act(() => {
      result.current.handleDrawComplete(newElement);
    });

    expect(result.current.drawingElements).toEqual([newElement]);
    expect(result.current.undoStack).toEqual([[]]);
    expect(result.current.redoStack).toEqual([]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);
    expect(mockOnNewElementCreated).toHaveBeenCalledWith(newElement);

    // Add another element
    const secondElement: DrawingElementType = {
      id: '2',
      type: 'rectangle',
      start: { x: 20, y: 20 },
      end: { x: 30, y: 30 },
      color: '#FFF',
      brushSize: 10,
    };

    act(() => {
      result.current.handleDrawComplete(secondElement);
    });

    expect(result.current.drawingElements).toEqual([newElement, secondElement]);
    expect(result.current.undoStack).toEqual([[], [newElement]]);
    expect(result.current.redoStack).toEqual([]);
  });

  it('should undo the last drawing element', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty));

    const element1: DrawingElementType = { id: '1', type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 };
    const element2: DrawingElementType = { id: '2', type: 'rectangle', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, color: '#FFF', brushSize: 10 };

    act(() => {
      result.current.handleDrawComplete(element1);
      result.current.handleDrawComplete(element2);
    });

    expect(result.current.drawingElements).toEqual([element1, element2]);
    expect(result.current.undoStack).toEqual([[], [element1]]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.drawingElements).toEqual([element1]);
    expect(result.current.undoStack).toEqual([[]]);
    expect(result.current.redoStack).toEqual([[element1, element2]]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.drawingElements).toEqual([]);
    expect(result.current.undoStack).toEqual([]);
    expect(result.current.redoStack).toEqual([[element1, element2], [element1]]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo the last undone drawing element', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty));

    const element1: DrawingElementType = { id: '1', type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 };
    const element2: DrawingElementType = { id: '2', type: 'rectangle', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, color: '#FFF', brushSize: 10 };

    act(() => {
      result.current.handleDrawComplete(element1);
    });
    act(() => {
      result.current.handleDrawComplete(element2);
    });
    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.drawingElements).toEqual([element1]);
    expect(result.current.redoStack).toEqual([[element1, element2]]);

    act(() => {
      result.current.handleRedo();
    });

    expect(result.current.drawingElements).toEqual([element1, element2]);
    expect(result.current.undoStack).toEqual([[], [element1]]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);
  });

  it('should add drawing element from external source', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty));

    const element1: DrawingElementType = { id: '1', type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 };
    const externalElement: DrawingElementType = { id: 'external', type: 'circle', center: { x: 50, y: 50 }, radius: 10, color: '#00F', brushSize: 3 };

    act(() => {
      result.current.handleDrawComplete(element1);
    });

    expect(result.current.drawingElements).toEqual([element1]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.addDrawingElementFromExternalSource(externalElement);
    });

    expect(result.current.drawingElements).toEqual([element1, externalElement]);
    expect(result.current.undoStack).toEqual([[], [element1]]); // undoStack should record the state before adding external element
    expect(result.current.redoStack).toEqual([]); // redoStack should be cleared
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);
  });
});
