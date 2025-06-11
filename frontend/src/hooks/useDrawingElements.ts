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
  onNewElementCreated?: (newElement: DrawingElementType) => void
): UseDrawingElementsResult => {
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  // Ref to hold the *previous* drawingElements state for undoStack (removed for now)
  // const prevDrawingElementsRef = useRef<DrawingElementType[]>([]);

  // Update the ref whenever drawingElements changes (removed for now)
  // useEffect(() => {
  //   prevDrawingElementsRef.current = drawingElements;
  // }, [drawingElements]);

  const handleUndo = useCallback(() => {
    console.log("handleUndo: Called");
    const stateToRedo = [...drawingElements];

    setUndoStack((prevUndoStack) => {
      const newUndoStack = [...prevUndoStack];
      const lastState = newUndoStack.pop();

      if (lastState) {
        console.log(`handleUndo: undoStack length before pop: ${prevUndoStack.length}, after pop: ${newUndoStack.length}`);

        setDrawingElements(lastState);

        setRedoStack((prevRedoStack) => {
          console.log(`handleUndo: redoStack length before push: ${prevRedoStack.length}, after push: ${prevRedoStack.length + 1}`);
          return [...prevRedoStack, stateToRedo];
        });
        setIsDirty(true);
        console.log(`handleUndo: drawingElements length after setting: ${lastState.length}`);
      } else {
        console.log("handleUndo: No more states in undoStack.");
      }
      return newUndoStack;
    });
  }, [setIsDirty, drawingElements]);

  const handleRedo = useCallback(() => {
    console.log("handleRedo: Called");
    setRedoStack((prevRedoStack) => {
      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState) {
        console.log(`handleRedo: Popped nextState (length ${nextState.length}):`, nextState);
        setDrawingElements((currentDrawingElements) => {
          setUndoStack((prevUndoStack) => {
            console.log(`handleRedo: Pushing currentDrawingElements to undoStack (length ${currentDrawingElements.length}):`, currentDrawingElements);
            return [...prevUndoStack, currentDrawingElements];
          });
          setIsDirty(true);
          console.log(`handleRedo: drawingElements length after: ${nextState.length}`);
          return nextState;
        });
      } else {
        console.log("handleRedo: No more states in redoStack.");
      }
      return newRedoStack;
    });
  }, [setIsDirty]);

  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    const elementWithTempId = { ...newElement, tempId: `temp-${Date.now()}` };

    // Capture current state before adding new element for undoStack
    setUndoStack((prevUndoStack) => [...prevUndoStack, drawingElements]);
    setRedoStack([]); // Clear Redo stack on new drawing
    setIsDirty(true); // Set dirty flag

    setDrawingElements((currentDrawingElements) => {
      if (onNewElementCreated) {
        onNewElementCreated(elementWithTempId);
      }
      return [...currentDrawingElements, elementWithTempId];
    });
  }, [drawingElements, setIsDirty, onNewElementCreated]); // Add drawingElements to dependencies

  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    setRedoStack([]); // Clear Redo stack when a new element is added from external source
    setIsDirty(true); // Set dirty flag

    setDrawingElements((currentDrawingElements) => {
      const isSelfBroadcastedElement = element.id && element.id.toString().match(/^\d+$/) && currentDrawingElements.some(e => e.tempId === element.tempId);

      if (isSelfBroadcastedElement) {
        const updatedElements = currentDrawingElements.map(e =>
          e.tempId === element.tempId ? element : e
        );
        return updatedElements;
      } else {
        // Capture current state before adding external element for undoStack
        setUndoStack((prevUndoStack) => [...prevUndoStack, drawingElements]);
        return [...currentDrawingElements, element];
      }
    });
  }, [drawingElements, setIsDirty]); // Add drawingElements to dependencies

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
