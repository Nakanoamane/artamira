import { useState, useCallback } from "react";
import { DrawingElementType } from "../utils/drawingElementsParser";

interface UseDrawingElementsResult {
  drawingElements: DrawingElementType[];
  setDrawingElements: React.Dispatch<React.SetStateAction<DrawingElementType[]>>;
  undoStack: DrawingElementType[][];
  redoStack: DrawingElementType[][];
  handleUndo: () => void;
  handleRedo: () => void;
  handleDrawComplete: (newElement: DrawingElementType) => void;
  canUndo: boolean;
  canRedo: boolean;
  addDrawingElementFromExternalSource: (element: DrawingElementType) => void;
}

export const useDrawingElements = (
  setIsDirty: (dirty: boolean) => void,
  onNewElementCreated?: (newElement: DrawingElementType) => void
): UseDrawingElementsResult => {
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>(
    []
  );
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      const newUndoStack = [...prev];
      const lastState = newUndoStack.pop();

      if (lastState) {
        setRedoStack((redoPrev) => [...redoPrev, drawingElements]);
        setDrawingElements(lastState);
        setIsDirty(true);
      }
      return newUndoStack;
    });
  }, [drawingElements, setIsDirty]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      const newRedoStack = [...prev];
      const nextState = newRedoStack.pop();

      if (nextState) {
        setUndoStack((undoPrev) => [...undoPrev, drawingElements]);
        setDrawingElements(nextState);
        setIsDirty(true);
      }
      return newRedoStack;
    });
  }, [drawingElements, setIsDirty]);

  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    setUndoStack((prev) => [...prev, drawingElements]);
    setRedoStack([]);
    setDrawingElements((prev) => [...prev, newElement]);
    setIsDirty(true);
    if (onNewElementCreated) {
      onNewElementCreated(newElement);
    }
  }, [drawingElements, setIsDirty, onNewElementCreated]);

  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    setUndoStack((prev) => [...prev, drawingElements]);
    setRedoStack([]);
    setDrawingElements((prev) => [...prev, element]);
    setIsDirty(true);
  }, [drawingElements, setIsDirty]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return {
    drawingElements,
    setDrawingElements,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    handleDrawComplete,
    canUndo,
    canRedo,
    addDrawingElementFromExternalSource,
  };
};
