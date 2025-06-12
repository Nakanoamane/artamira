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
    console.log("[useDrawingElements - useState init] Initializing drawingElements with:", initialLoadedElements.length, "elements.");
    return initialLoadedElements;
  });

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
      console.log("[useDrawingElements - useEffect] Initial loaded elements changed. Re-initializing state.");
      console.log("  New initialLoadedElements length:", initialLoadedElements.length);
      console.log("  Old initialBaseElementsRef length:", initialBaseElementsRef.current.length);
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
        console.log("[useDrawingElements - handleUndo] Cannot undo, already at base state. undoStack length:", prevUndoStack.length);
        return prevUndoStack;
      }

      const newUndoStack = [...prevUndoStack];
      const stateToRedo = drawingElements; // Current state before undoing
      const lastState = newUndoStack.pop(); // The state to revert to

      if (lastState !== undefined) {
        console.log("[useDrawingElements - handleUndo] Undoing. Current drawingElements length:", drawingElements.length, "-> Reverting to lastState length:", lastState.length);
        setDrawingElements(lastState);
        setRedoStack((prevRedoStack) => [
          ...prevRedoStack,
          stateToRedo,
        ]);
        setIsDirty(true);
      }
      console.log("[useDrawingElements - handleUndo] New undoStack length:", newUndoStack.length, "New redoStack length:", redoStack.length + 1);
      return newUndoStack;
    });
  }, [setIsDirty, drawingElements, redoStack.length]);


  const handleRedo = useCallback(() => {
    setRedoStack((prevRedoStack) => {
      if (prevRedoStack.length === 0) {
        console.log("[useDrawingElements - handleRedo] Cannot redo, redoStack is empty.");
        return prevRedoStack;
      }

      const newRedoStack = [...prevRedoStack];
      const nextState = newRedoStack.pop();

      if (nextState !== undefined) {
        console.log("[useDrawingElements - handleRedo] Redoing. Current drawingElements length:", drawingElements.length, "-> Reverting to nextState length:", nextState.length);
        setUndoStack((prevUndoStack) => {
          const newStack = [...prevUndoStack, drawingElements]; // Push current state before redo
          console.log("  Pushing current state to undo stack. New undoStack length:", newStack.length);
          return newStack;
        });
        setDrawingElements(nextState);
        setIsDirty(true);
      }
      console.log("[useDrawingElements - handleRedo] New redoStack length:", newRedoStack.length);
      return newRedoStack;
    });
  }, [setIsDirty, drawingElements]);


  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    // newElementはCanvasから渡される。ここではidを付けず、temp_idのみを付与する。
    // 永続化されるIDはバックエンドで生成されるべき。
    const elementToCreate = { ...newElement, id: undefined, temp_id: `temp-${Date.now()}` };

    // Push the current state of drawingElements to undoStack *before* adding the new element.
    setUndoStack((prevUndoStack) => {
      const newStack = [...prevUndoStack, drawingElements];
      console.log("[useDrawingElements - handleDrawComplete] Pushing current state to undoStack. New undoStack length:", newStack.length);
      return newStack;
    });
    setRedoStack([]); // Clear redo stack on new drawing (limits redo to consecutive undos).
    console.log("[useDrawingElements - handleDrawComplete] Redo stack cleared.");

    setIsDirty(true);

    setDrawingElements((currentDrawingElements) => {
      const updatedElements = [...currentDrawingElements, elementToCreate];
      console.log("[useDrawingElements - handleDrawComplete] Drawing completed. Adding new element. Current length:", currentDrawingElements.length, "-> New length:", updatedElements.length);
      return updatedElements;
    });

    if (onNewElementCreated) {
      onNewElementCreated(elementToCreate);
    }
  }, [drawingElements, setIsDirty, onNewElementCreated]);


  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    console.log("[useDrawingElements - addDrawingElementFromExternalSource] Received element:", element);
    setRedoStack([]); // Clear Redo stack when a new element is added from external source
    console.log("[useDrawingElements - addDrawingElementFromExternalSource] Redo stack cleared due to external element.");
    setIsDirty(true); // Set dirty flag

    setDrawingElements((currentDrawingElements) => {
      // element.id が数値であり、かつ element.temp_id が存在する場合に自己ブロードキャストとみなす
      const isSelfBroadcastedElement = typeof element.id === 'number' && element.temp_id && currentDrawingElements.some(e => e.temp_id === element.temp_id);

      console.log("[useDrawingElements - addDrawingElementFromExternalSource] Element received. isSelfBroadcastedElement:", isSelfBroadcastedElement, "Current drawingElements length:", currentDrawingElements.length);

      if (isSelfBroadcastedElement) {
        // 既存のtemp_idを持つ要素を、idを持つ要素で更新する
        // この際、temp_idは不要なので削除する
        const updatedElements = currentDrawingElements.map(e => {
          if (e.temp_id === element.temp_id) {
            // element.temp_id が undefined になる可能性があるので、それを考慮
            const { temp_id, ...rest } = element;
            // ここでidは数値としてelementに入っているはず
            return { ...rest, id: element.id };
          }
          return e;
        });
        console.log("[useDrawingElements - addDrawingElementFromExternalSource] Updated self-broadcasted element. New length:", updatedElements.length);
        return updatedElements;
      } else {
        // 新しい外部要素を追加する場合（または自己ブロードキャストだがtemp_idを持たない場合）
        setUndoStack((prevUndoStack) => {
          const newStack = [...prevUndoStack, drawingElements];
          console.log("[useDrawingElements - addDrawingElementFromExternalSource] Pushing current state to undo stack. New undoStack length:", newStack.length);
          return newStack;
        });

        // バックエンドから来た要素は、既にtemp_idが削除されているはずなので、そのまま追加
        const updatedElements = [...currentDrawingElements, element];
        console.log("[useDrawingElements - addDrawingElementFromExternalSource] Adding external element. New length:", updatedElements.length);
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
