import { useState, useCallback, useRef, useEffect } from "react";
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
  onNewElementCreated?: (newElement: DrawingElementType) => void,
  initialLoadedElements: DrawingElementType[] = []
): UseDrawingElementsResult => {
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>(initialLoadedElements);
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>(
    initialLoadedElements.length > 0 ? [initialLoadedElements] : [[]]
  );
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  const handleUndo = useCallback(() => {

    const stateToRedo = [...drawingElements];

    setUndoStack((prevUndoStack) => {
      const newUndoStack = [...prevUndoStack];
      const lastState = newUndoStack.pop();

      if (lastState) {
        setDrawingElements(lastState);
        setRedoStack((prevRedoStack) => [
          ...prevRedoStack,
          stateToRedo,
        ]);
        setIsDirty(true);
      }
      return newUndoStack;
    });
  }, [setIsDirty, drawingElements, undoStack, redoStack]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedoStack) => {
      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState) {
        setUndoStack((prevUndoStack) => [
          ...prevUndoStack,
          drawingElements, // Push current state before redo
        ]);
        setDrawingElements(nextState);
        setIsDirty(true);
      }
      return newRedoStack;
    });
  }, [setIsDirty, drawingElements, undoStack, redoStack]);

  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    const elementWithTempId = { ...newElement, temp_id: `temp-${Date.now()}` };

    setUndoStack((prevUndoStack) => {
      const newStack = [...prevUndoStack, drawingElements];
      return newStack;
    });
    setRedoStack([]);
    setIsDirty(true);

    setDrawingElements((currentDrawingElements) => {
      const updatedElements = [...currentDrawingElements, elementWithTempId];
      if (onNewElementCreated) {
        onNewElementCreated(elementWithTempId);
      }
      return updatedElements;
    });
  }, [drawingElements, setIsDirty, onNewElementCreated, undoStack]); // Add undoStack to dependencies for logging

  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    setRedoStack([]); // Clear Redo stack when a new element is added from external source
    setIsDirty(true); // Set dirty flag

    setDrawingElements((currentDrawingElements) => {
      const isSelfBroadcastedElement = element.id && element.id.toString().match(/^\d+$/) && currentDrawingElements.some(e => e.temp_id === element.temp_id);

      if (isSelfBroadcastedElement) {
        const updatedElements = currentDrawingElements.map(e =>
          e.temp_id === element.temp_id ? element : e
        );
        return updatedElements;
      } else {
        setUndoStack((prevUndoStack) => {
          const newStack = [...prevUndoStack, drawingElements];
          return newStack;
        });
        const updatedElements = [...currentDrawingElements, element];
        return updatedElements;
      }
    });
  }, [drawingElements, setIsDirty, undoStack]); // Add undoStack to dependencies for logging

  const canUndo = undoStack.length > 1;
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
