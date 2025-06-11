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

  // Use a ref to store the initial loaded elements to ensure stability and for comparison.
  const initialBaseElementsRef = useRef(initialLoadedElements);

  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>(
    initialLoadedElements.length > 0 ? [initialLoadedElements] : [[]]
  );
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  // This effect ensures that if initialLoadedElements changes, the state is re-initialized.
  // It also updates the initialBaseElementsRef to the new base.
  // Deep comparison for array content to avoid unnecessary re-initialization.
  useEffect(() => {
    // Check if the content of initialLoadedElements has actually changed
    const areArraysEqual = (arr1: DrawingElementType[], arr2: DrawingElementType[]) => {
      if (arr1.length !== arr2.length) return false;
      for (let i = 0; i < arr1.length; i++) {
        // Simple stringify comparison for elements assuming no circular references and order doesn't matter for comparison.
        // For more robust comparison, a proper deep equality check for DrawingElementType might be needed.
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
  }, [initialLoadedElements]); // Dependency array: re-run if initialLoadedElements reference changes.


  const handleUndo = useCallback(() => {
    setUndoStack((prevUndoStack) => {
      // If there's only one state in the undoStack, it's the initial base state (initialLoadedElements or []).
      // We should not undo past this base state. This prevents the "initial content disappearing" bug
      // for both empty and non-empty initial loads, and ensures initial content is not undoable.
      if (prevUndoStack.length <= 1) {
        return prevUndoStack;
      }

      const newUndoStack = [...prevUndoStack];
      const stateToRedo = drawingElements; // Current state before undoing
      const lastState = newUndoStack.pop(); // The state to revert to

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
  }, [setIsDirty, drawingElements]);


  const handleRedo = useCallback(() => {
    setRedoStack((prevRedoStack) => {
      if (prevRedoStack.length === 0) {
        return prevRedoStack;
      }

      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState !== undefined) {
        setUndoStack((prevUndoStack) => [
          ...prevUndoStack,
          drawingElements, // Push current state before redo
        ]);
        setDrawingElements(nextState);
        setIsDirty(true);
      }
      return newRedoStack;
    });
  }, [setIsDirty, drawingElements]);


  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    const elementWithTempId = { ...newElement, temp_id: `temp-${Date.now()}` };

    // Push the current state of drawingElements to undoStack *before* adding the new element.
    setUndoStack((prevUndoStack) => {
      const newStack = [...prevUndoStack, drawingElements];
      return newStack;
    });
    setRedoStack([]); // Clear redo stack on new drawing (limits redo to consecutive undos).

    setIsDirty(true);

    setDrawingElements((currentDrawingElements) => {
      const updatedElements = [...currentDrawingElements, elementWithTempId];
      return updatedElements;
    });

    if (onNewElementCreated) {
      onNewElementCreated(elementWithTempId);
    }
  }, [drawingElements, setIsDirty, onNewElementCreated]);


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
        // Push current state to undo stack before adding external element, if it's not a self-broadcast.
        setUndoStack((prevUndoStack) => {
          const newStack = [...prevUndoStack, drawingElements];
          return newStack;
        });
        const updatedElements = [...currentDrawingElements, element];
        return updatedElements;
      }
    });
  }, [drawingElements, setIsDirty]);

  // canUndo is true if there's more than one state in the undoStack, meaning we can go back beyond the initial state.
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
