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
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>(() => {
    return initialLoadedElements;
  });

  const initialBaseElementsRef = useRef(initialLoadedElements);

  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>(
    initialLoadedElements.length > 0 ? [initialLoadedElements] : [[]]
  );
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  useEffect(() => {
    const areArraysEqual = (arr1: DrawingElementType[], arr2: DrawingElementType[]) => {
      if (arr1.length !== arr2.length) return false;
      for (let i = 0; i < arr1.length; i++) {
        if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) return false;
      }
      return true;
    };

    if (!areArraysEqual(initialLoadedElements, initialBaseElementsRef.current)) {
      setDrawingElements(initialLoadedElements);
      initialBaseElementsRef.current = initialLoadedElements;
      setUndoStack(initialLoadedElements.length > 0 ? [initialLoadedElements] : [[]]);
      setRedoStack([]);
    }
  }, [initialLoadedElements]);


  const handleUndo = useCallback(() => {
    setUndoStack((prevUndoStack) => {
      if (prevUndoStack.length <= 1) {
        return prevUndoStack;
      }

      const newUndoStack = [...prevUndoStack];
      const stateToRedo = drawingElements;
      const lastState = newUndoStack.pop();

      if (lastState !== undefined) {
        setDrawingElements(lastState);
        setRedoStack((prevRedoStack) => [
          ...prevRedoStack,
          stateToRedo,
        ]);
        setIsDirty(true);
      }
      return newUndoStack;
    });
  }, [setIsDirty, drawingElements, redoStack.length]);


  const handleRedo = useCallback(() => {
    setRedoStack((prevRedoStack) => {
      if (prevRedoStack.length === 0) {
        return prevRedoStack;
      }

      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState !== undefined) {
        setUndoStack((prevUndoStack) => {
          const newStack = [...prevUndoStack, drawingElements];
          return newStack;
        });
        setDrawingElements(nextState);
        setIsDirty(true);
      }
      return newRedoStack;
    });
  }, [setIsDirty, drawingElements]);


  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    const elementToCreate = { ...newElement, id: undefined, temp_id: `temp-${Date.now()}` };

    setUndoStack((prevUndoStack) => {
      const newStack = [...prevUndoStack, drawingElements];
      return newStack;
    });
    setRedoStack([]);

    setIsDirty(true);

    setDrawingElements((currentDrawingElements) => {
      const updatedElements = [...currentDrawingElements, elementToCreate];
      return updatedElements;
    });

    if (onNewElementCreated) {
      onNewElementCreated(elementToCreate);
    }
  }, [drawingElements, setIsDirty, onNewElementCreated]);


  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    setRedoStack([]);
    setIsDirty(true);

    setDrawingElements((currentDrawingElements) => {
      const isSelfBroadcastedElement = typeof element.id === 'number' && element.temp_id && currentDrawingElements.some(e => e.temp_id === element.temp_id);

      if (isSelfBroadcastedElement) {
        const updatedElements = currentDrawingElements.map(e => {
          if (e.temp_id === element.temp_id) {
            const { temp_id, ...rest } = element;
            return { ...rest, id: element.id };
          }
          return e;
        });
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
  }, [drawingElements, setIsDirty]);

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
