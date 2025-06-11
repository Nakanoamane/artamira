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
  // console.log("useDrawingElements: Initializing. initialLoadedElements.length:", initialLoadedElements.length);
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>(initialLoadedElements);
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>(
    initialLoadedElements.length > 0 ? [initialLoadedElements] : [[]]
  );
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);

  // Ref to hold the *previous* drawingElements state for undoStack (removed for now)
  // const prevDrawingElementsRef = useRef<DrawingElementType[]>([]);

  // Update the ref whenever drawingElements changes (removed for now)
  // useEffect(() => {
  //   prevDrawingElementsRef.current = drawingElements;
  // }, [drawingElements]);

  const handleUndo = useCallback(() => {
    // console.log("handleUndo: Called");
    // console.log("handleUndo: Current drawingElements.length:", drawingElements.length);
    // console.log("handleUndo: undoStack.length before pop:", undoStack.length);
    // console.log("handleUndo: redoStack.length before push:", redoStack.length);

    const stateToRedo = [...drawingElements];

    setUndoStack((prevUndoStack) => {
      const newUndoStack = [...prevUndoStack];
      const lastState = newUndoStack.pop();

      if (lastState) {
        // console.log(`handleUndo: Popped state (length ${lastState.length}) from undoStack. Remaining undoStack.length: ${newUndoStack.length}`);
        setDrawingElements(lastState);
        setRedoStack((prevRedoStack) => [
          ...prevRedoStack,
          stateToRedo,
        ]);
        setIsDirty(true);
        // console.log(`handleUndo: drawingElements set to length: ${lastState.length}. redoStack.length after push: ${redoStack.length + 1}`);
      } else {
        // console.log("handleUndo: No more states in undoStack.");
      }
      return newUndoStack;
    });
  }, [setIsDirty, drawingElements, undoStack, redoStack]);

  const handleRedo = useCallback(() => {
    // console.log("handleRedo: Called");
    // console.log("handleRedo: Current drawingElements.length:", drawingElements.length);
    // console.log("handleRedo: undoStack.length before push:", undoStack.length);
    // console.log("handleRedo: redoStack.length before pop:", redoStack.length);

    setRedoStack((prevRedoStack) => {
      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState) {
        // console.log(`handleRedo: Popped nextState (length ${nextState.length}) from redoStack. Remaining redoStack.length: ${newRedoStack.length}`);
        setUndoStack((prevUndoStack) => [
          ...prevUndoStack,
          drawingElements, // Push current state before redo
        ]);
        setDrawingElements(nextState);
        setIsDirty(true);
        // console.log(`handleRedo: drawingElements set to length: ${nextState.length}. undoStack.length after push: ${undoStack.length + 1}`);
      } else {
        // console.log("handleRedo: No more states in redoStack.");
      }
      return newRedoStack;
    });
  }, [setIsDirty, drawingElements, undoStack, redoStack]);

  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    const elementWithTempId = { ...newElement, tempId: `temp-${Date.now()}` };
    // console.log("handleDrawComplete: Called with newElement.type:", newElement.type);
    // console.log("handleDrawComplete: Current drawingElements.length BEFORE update:", drawingElements.length);
    // console.log("handleDrawComplete: undoStack.length BEFORE push:", undoStack.length);

    setUndoStack((prevUndoStack) => {
      const newStack = [...prevUndoStack, drawingElements];
      // console.log("handleDrawComplete: undoStack pushed state of length:", drawingElements.length, "new undoStack.length:", newStack.length);
      return newStack;
    });
    setRedoStack([]);
    setIsDirty(true);

    setDrawingElements((currentDrawingElements) => {
      const updatedElements = [...currentDrawingElements, elementWithTempId];
      // console.log("handleDrawComplete: setDrawingElements updated to length:", updatedElements.length);
      if (onNewElementCreated) {
        onNewElementCreated(elementWithTempId);
      }
      return updatedElements;
    });
  }, [drawingElements, setIsDirty, onNewElementCreated, undoStack]); // Add undoStack to dependencies for logging

  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    // console.log("addDrawingElementFromExternalSource: Called with element.id:", element.id, "element.tempId:", element.tempId);
    // console.log("addDrawingElementFromExternalSource: Current drawingElements.length BEFORE update:", drawingElements.length);
    // console.log("addDrawingElementFromExternalSource: undoStack.length BEFORE push:", undoStack.length);

    setRedoStack([]); // Clear Redo stack when a new element is added from external source
    setIsDirty(true); // Set dirty flag

    setDrawingElements((currentDrawingElements) => {
      const isSelfBroadcastedElement = element.id && element.id.toString().match(/^\d+$/) && currentDrawingElements.some(e => e.tempId === element.tempId);
      // console.log("addDrawingElementFromExternalSource: isSelfBroadcastedElement:", isSelfBroadcastedElement);

      if (isSelfBroadcastedElement) {
        const updatedElements = currentDrawingElements.map(e =>
          e.tempId === element.tempId ? element : e
        );
        // console.log("addDrawingElementFromExternalSource: Self-broadcasted element replaced. updatedElements.length:", updatedElements.length);
        return updatedElements;
      } else {
        setUndoStack((prevUndoStack) => {
          const newStack = [...prevUndoStack, drawingElements];
          // console.log("addDrawingElementFromExternalSource: External element added. undoStack pushed state of length:", drawingElements.length, "new undoStack.length:", newStack.length);
          return newStack;
        });
        const updatedElements = [...currentDrawingElements, element];
        // console.log("addDrawingElementFromExternalSource: Other external element added. updatedElements.length:", updatedElements.length);
        return updatedElements;
      }
    });
  }, [drawingElements, setIsDirty, undoStack]); // Add undoStack to dependencies for logging

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
