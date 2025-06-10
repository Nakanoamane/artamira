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
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndoStack) => {
      const newUndoStack = [...prevUndoStack];
      const lastState = newUndoStack.pop();

      if (lastState) {
        setDrawingElements((currentDrawingElements) => {
          setRedoStack((prevRedoStack) => [...prevRedoStack, currentDrawingElements]);
          setIsDirty(true);
          return lastState;
        });
      }
      return newUndoStack;
    });
  }, [setIsDirty]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedoStack) => {
      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState) {
        setDrawingElements((currentDrawingElements) => {
          setUndoStack((prevUndoStack) => [...prevUndoStack, currentDrawingElements]);
          setIsDirty(true);
          return nextState;
        });
      }
      return newRedoStack;
    });
  }, [setIsDirty]);

  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    setDrawingElements((currentDrawingElements) => {
      setUndoStack((prevUndoStack) => [...prevUndoStack, currentDrawingElements]);
      setRedoStack([]);
      setIsDirty(true);
      if (onNewElementCreated) {
        onNewElementCreated(newElement);
      }
      return [...currentDrawingElements, newElement];
    });
  }, [setIsDirty, onNewElementCreated]);

  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    setDrawingElements((currentDrawingElements) => {
      setUndoStack((prevUndoStack) => [...prevUndoStack, currentDrawingElements]);
      setRedoStack([]);
      setIsDirty(true);
      return [...currentDrawingElements, element];
    });
  }, [setIsDirty]);

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
