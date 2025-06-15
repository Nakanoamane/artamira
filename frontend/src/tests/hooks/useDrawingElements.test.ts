import { renderHook, act } from '@testing-library/react';
import { useDrawingElements } from '../../hooks/useDrawingElements';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DrawingElementType } from '../../utils/drawingElementsParser';

describe('useDrawingElements', () => {
  const mockSetIsDirty = vi.fn();
  const mockOnNewElementCreated = vi.fn();
  const mockOnUndoRedoAction = vi.fn();

  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockSetIsDirty.mockClear();
    mockOnNewElementCreated.mockClear();
    mockOnUndoRedoAction.mockClear();
    dateNowSpy = vi.spyOn(Date, 'now');
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('should return initial states', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    expect(result.current.drawingElements).toEqual([]);
    expect(result.current.undoStack).toEqual([[]]);
    expect(result.current.redoStack).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should add a drawing element and manage stacks on handleDrawComplete', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    dateNowSpy.mockReturnValueOnce(1000); // Mock for the first element's temp_id
    const newElement: DrawingElementType = {
      id: 1,
      type: 'line',
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      color: '#000',
      brushSize: 5,
    };

    act(() => {
      result.current.handleDrawComplete(newElement);
    });

    const expectedNewElement: DrawingElementType = { ...newElement, id: undefined, temp_id: 'temp-1000' };

    expect(result.current.drawingElements).toEqual([expectedNewElement]);
    expect(result.current.undoStack).toEqual([[], []]);
    expect(result.current.redoStack).toEqual([]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);
    expect(mockOnNewElementCreated).toHaveBeenCalledWith(expectedNewElement);

    // Add another element
    dateNowSpy.mockReturnValueOnce(2000); // Mock for the second element's temp_id
    const secondElement: DrawingElementType = {
      id: 2,
      type: 'rectangle',
      start: { x: 20, y: 20 },
      end: { x: 30, y: 30 },
      color: '#FFF',
      brushSize: 10,
    };

    act(() => {
      result.current.handleDrawComplete(secondElement);
    });

    const expectedSecondElement: DrawingElementType = { ...secondElement, id: undefined, temp_id: 'temp-2000' };

    expect(result.current.drawingElements).toEqual([expectedNewElement, expectedSecondElement]);
    expect(result.current.undoStack).toEqual([[], [], [expectedNewElement]]);
    expect(result.current.redoStack).toEqual([]);
  });

  it('should undo the last drawing element', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    dateNowSpy.mockReturnValueOnce(1000);
    const element1: DrawingElementType = { id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 };
    dateNowSpy.mockReturnValueOnce(2000);
    const element2: DrawingElementType = { id: 2, type: 'rectangle', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, color: '#FFF', brushSize: 10 };

    const expectedElement1: DrawingElementType = { ...element1, id: undefined, temp_id: 'temp-1000' };
    const expectedElement2: DrawingElementType = { ...element2, id: undefined, temp_id: 'temp-2000' };

    act(() => {
      result.current.handleDrawComplete(element1);
    });
    act(() => {
      result.current.handleDrawComplete(element2);
    });

    expect(result.current.drawingElements).toEqual([expectedElement1, expectedElement2]);
    expect(result.current.undoStack).toEqual([[], [], [expectedElement1]]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.drawingElements).toEqual([expectedElement1]);
    expect(result.current.undoStack).toEqual([[], []]);
    expect(result.current.redoStack).toEqual([[expectedElement1, expectedElement2]]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.drawingElements).toEqual([]);
    expect(result.current.undoStack).toEqual([[]]);
    expect(result.current.redoStack).toEqual([[expectedElement1, expectedElement2], [expectedElement1]]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo the last undone drawing element', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    dateNowSpy.mockReturnValueOnce(1000);
    const element1: DrawingElementType = { id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 };
    dateNowSpy.mockReturnValueOnce(2000);
    const element2: DrawingElementType = { id: 2, type: 'rectangle', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, color: '#FFF', brushSize: 10 };

    const expectedElement1: DrawingElementType = { ...element1, id: undefined, temp_id: 'temp-1000' };
    const expectedElement2: DrawingElementType = { ...element2, id: undefined, temp_id: 'temp-2000' };

    act(() => {
      result.current.handleDrawComplete(element1);
    });
    act(() => {
      result.current.handleDrawComplete(element2);
    });
    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.drawingElements).toEqual([expectedElement1]);
    expect(result.current.undoStack).toEqual([[], []]);
    expect(result.current.redoStack).toEqual([[expectedElement1, expectedElement2]]);

    act(() => {
      result.current.handleRedo();
    });

    expect(result.current.drawingElements).toEqual([expectedElement1, expectedElement2]);
    expect(result.current.undoStack).toEqual([[], [], [expectedElement1]]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);
  });

  it('should add drawing element from external source', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    dateNowSpy.mockReturnValueOnce(1000);
    const element1: DrawingElementType = { id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 };
    const expectedElement1: DrawingElementType = { ...element1, id: undefined, temp_id: 'temp-1000' };

    const externalElement: DrawingElementType = { id: 999, temp_id: 'temp-external', type: 'circle', center: { x: 50, y: 50 }, radius: 10, color: '#00F', brushSize: 3 };

    act(() => {
      result.current.handleDrawComplete(element1);
    });

    expect(result.current.drawingElements).toEqual([expectedElement1]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.addDrawingElementFromExternalSource(externalElement);
    });

    expect(result.current.drawingElements).toEqual([expectedElement1, externalElement]);
    expect(result.current.undoStack).toEqual([[], [], [expectedElement1]]);
    expect(result.current.redoStack).toEqual([]);
    expect(mockSetIsDirty).toHaveBeenCalledWith(true);
  });

  it('should apply remote undo action and manage stacks', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    // 複数の要素を追加してundoStackとredoStackに状態を作る
    act(() => {
      result.current.handleDrawComplete({ id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 });
    });
    act(() => {
      result.current.handleDrawComplete({ id: 2, type: 'rectangle', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, color: '#FFF', brushSize: 10 });
    });
    // 一度UndoしてredoStackも満たす
    act(() => {
      result.current.handleUndo();
    });

    const initialElements = result.current.drawingElements;

    // リモートからUndoされた状態（要素が1つ減った状態）をシミュレート
    const remoteUndoneElements = initialElements.slice(0, -1); // 最後の要素がUndoされたと仮定

    act(() => {
      result.current.applyRemoteUndo(remoteUndoneElements);
    });

    // drawingElementsがリモートのUndo状態になることを確認
    expect(result.current.drawingElements).toEqual(remoteUndoneElements);
    // 元のdrawingElementsがredoStackに積まれることを確認 (APPLY_REMOTE_UNDOのロジックによる)
    expect(result.current.redoStack[result.current.redoStack.length - 1]).toEqual(initialElements);
    // undoStackはリモートのUndo状態にリセットされることを確認
    expect(result.current.undoStack).toEqual([[]]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true); // リモートからのUndoによりRedo可能になる
  });

  it('should apply remote redo action and manage stacks', () => {
    const { result } = renderHook(() => useDrawingElements(mockSetIsDirty, mockOnNewElementCreated, [], mockOnUndoRedoAction));

    // 複数の要素を追加し、undoしてredoStackに状態を作る
    act(() => {
      result.current.handleDrawComplete({ id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5 });
    });
    act(() => {
      result.current.handleDrawComplete({ id: 2, type: 'rectangle', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, color: '#FFF', brushSize: 10 });
    });
    act(() => {
      result.current.handleUndo(); // 最初のUndo
    });
    act(() => {
      result.current.handleUndo(); // 2回目のUndo (Redo可能な状態を作るため)
    });

    const initialElements = result.current.drawingElements;

    // リモートからRedoされた状態（要素が1つ増えた状態）をシミュレート
    const remoteRedoneElements = initialElements.concat([
      { id: 1, type: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], color: '#000', brushSize: 5, temp_id: 'temp-1000' },
    ]); // 例として1つRedoされた要素を追加

    act(() => {
      result.current.applyRemoteRedo(remoteRedoneElements);
    });

    // drawingElementsがリモートのRedo状態になることを確認
    expect(result.current.drawingElements).toEqual(remoteRedoneElements);
    // 元のdrawingElementsがundoStackに積まれることを確認 (APPLY_REMOTE_REDOのロジックによる)
    expect(result.current.undoStack[result.current.undoStack.length - 1]).toEqual(initialElements);
    // redoStackはクリアされることを確認
    expect(result.current.redoStack).toEqual([]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });
});
