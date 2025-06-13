import { useState, useCallback, useRef, useEffect, useReducer } from "react";
import { DrawingElementType } from "../utils/drawingElementsParser";

interface UseDrawingElementsResult {
  drawingElements: DrawingElementType[];
  setDrawingElements: (elements: DrawingElementType[]) => void;
  undoStack: DrawingElementType[][];
  redoStack: DrawingElementType[][];
  handleUndo: () => void;
  handleRedo: () => void;
  handleDrawComplete: (newElement: DrawingElementType) => void;
  canUndo: boolean;
  canRedo: boolean;
  addDrawingElementFromExternalSource: (element: DrawingElementType) => void;
  pendingElementTempId: React.MutableRefObject<string | null>;
}

// Define action types
type Action =
  | { type: 'ADD_ELEMENT'; payload: DrawingElementType }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ELEMENTS'; payload: DrawingElementType[] } // For initial load or external updates
  | { type: 'RESET_HISTORY'; payload: DrawingElementType[] }; // For loading new drawing

interface DrawingState {
  elements: DrawingElementType[];
  undoStack: DrawingElementType[][];
  redoStack: DrawingElementType[][];
}

const drawingReducer = (state: DrawingState, action: Action): DrawingState => {
  console.log(`[drawingReducer] Action received: ${action.type}`);
  console.log(`[drawingReducer] State before action: elements=${state.elements.length}, undoStack=${state.undoStack.length}, redoStack=${state.redoStack.length}`);
  switch (action.type) {
    case 'ADD_ELEMENT':
      // Ensure the undoStack always stores the state *before* the new element is added.
      // And the new element is added to the elements array.
      const newElementsAfterAdd = [...state.elements, action.payload];
      const newStateAdd = {
        elements: newElementsAfterAdd,
        undoStack: [...state.undoStack, state.elements], // Store snapshot BEFORE current change
        redoStack: [], // Clear redo stack on new action
      };
      console.log(`[drawingReducer] ADD_ELEMENT: State after action: elements=${newStateAdd.elements.length}, undoStack=${newStateAdd.undoStack.length}, redoStack=${newStateAdd.redoStack.length}`);
      return newStateAdd;

    case 'UNDO':
      if (state.undoStack.length <= 1) { // Keep initial empty state
        console.log("[drawingReducer] UNDO: Undo stack is empty or has only one element. Not undoing.");
        return state;
      }
      const newUndoStackAfterUndo = [...state.undoStack];
      const previousState = newUndoStackAfterUndo.pop(); // Get previous elements

      if (previousState === undefined) { // Should not happen if length > 1
        console.log("[drawingReducer] UNDO: Previous state is undefined. This should not happen.");
        return state;
      }

      const newStateUndo = {
        elements: previousState, // Set elements to previous state
        undoStack: newUndoStackAfterUndo,
        redoStack: [...state.redoStack, state.elements], // Push current elements to redo stack
      };
      console.log(`[drawingReducer] UNDO: State after action: elements=${newStateUndo.elements.length}, undoStack=${newStateUndo.undoStack.length}, redoStack=${newStateUndo.redoStack.length}`);
      return newStateUndo;

    case 'REDO':
      if (state.redoStack.length === 0) {
        console.log("[drawingReducer] REDO: Redo stack is empty. Not redoing.");
        return state;
      }
      const newRedoStackAfterRedo = [...state.redoStack];
      const nextState = newRedoStackAfterRedo.pop(); // Get next elements

      if (nextState === undefined) { // Should not happen if length > 0
        console.log("[drawingReducer] REDO: Next state is undefined. This should not happen.");
        return state;
      }

      const newStateRedo = {
        elements: nextState, // Set elements to next state
        undoStack: [...state.undoStack, state.elements], // Push current elements to undo stack
        redoStack: newRedoStackAfterRedo,
      };
      console.log(`[drawingReducer] REDO: State after action: elements=${newStateRedo.elements.length}, undoStack=${newStateRedo.undoStack.length}, redoStack=${newStateRedo.redoStack.length}`);
      return newStateRedo;

    case 'SET_ELEMENTS':
      const newStateSetElements = {
        ...state,
        elements: action.payload,
      };
      console.log(`[drawingReducer] SET_ELEMENTS: State after action: elements=${newStateSetElements.elements.length}, undoStack=${newStateSetElements.undoStack.length}, redoStack=${newStateSetElements.redoStack.length}`);
      return newStateSetElements;

    case 'RESET_HISTORY':
      const newStateResetHistory = {
        elements: action.payload,
        undoStack: action.payload.length > 0 ? [action.payload] : [[]],
        redoStack: [],
      };
      console.log(`[drawingReducer] RESET_HISTORY: State after action: elements=${newStateResetHistory.elements.length}, undoStack=${newStateResetHistory.undoStack.length}, redoStack=${newStateResetHistory.redoStack.length}`);
      return newStateResetHistory;

    default:
      return state;
  }
};

export const useDrawingElements = (
  setIsDirty: (dirty: boolean) => void,
  onNewElementCreated?: (newElement: DrawingElementType) => void,
  initialLoadedElements: DrawingElementType[] = []
): UseDrawingElementsResult => {
  console.log("[useDrawingElements] Hook initialized. initialLoadedElements length:", initialLoadedElements.length);
  // useReducer を使用して状態を管理
  const [state, dispatch] = useReducer(drawingReducer, {
    elements: initialLoadedElements,
    undoStack: initialLoadedElements.length > 0 ? [initialLoadedElements] : [[]],
    redoStack: [],
  });

  const { elements: drawingElements, undoStack, redoStack } = state;

  const initialBaseElementsRef = useRef(initialLoadedElements);

  // 最新の状態を保持するための ref
  const drawingElementsRef = useRef(drawingElements);
  const undoStackRef = useRef(undoStack);
  const redoStackRef = useRef(redoStack);

  useEffect(() => {
    drawingElementsRef.current = drawingElements;
  }, [drawingElements]);

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    redoStackRef.current = redoStack;
  }, [redoStack]);

  // Ref to hold the temp_id of the element currently being sent to the server
  const pendingElementTempId = useRef<string | null>(null);


  useEffect(() => {
    console.log("[useDrawingElements] Effect: initialLoadedElements changed. Current drawingElements length:", drawingElements.length);
    const areArraysEqual = (arr1: DrawingElementType[], arr2: DrawingElementType[]) => {
      if (arr1.length !== arr2.length) return false;
      for (let i = 0; i < arr1.length; i++) {
        if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) return false;
      }
      return true;
    };

    if (!areArraysEqual(initialLoadedElements, initialBaseElementsRef.current)) {
      console.log("[useDrawingElements] Effect: initialLoadedElements is different from initialBaseElementsRef.current. Resetting state.");
      dispatch({ type: 'SET_ELEMENTS', payload: initialLoadedElements });
      initialBaseElementsRef.current = initialLoadedElements;
      dispatch({ type: 'RESET_HISTORY', payload: initialLoadedElements });
      console.log("[useDrawingElements] Effect: State reset complete. undoStack length:", state.undoStack.length, "redoStack length:", state.redoStack.length);
    }
  }, [initialLoadedElements]);


  const handleUndo = useCallback(() => {
    console.log("[useDrawingElements] handleUndo called. Current undoStack length:", undoStackRef.current.length, "redoStack length:", redoStackRef.current.length, "drawingElements length:", drawingElementsRef.current.length);
    dispatch({ type: 'UNDO' });
  }, []); // 依存配列から setIsDirty も削除


  const handleRedo = useCallback(() => {
    console.log("[useDrawingElements] handleRedo called. Current undoStack length:", undoStackRef.current.length, "redoStack length:", redoStackRef.current.length, "drawingElements length:", drawingElementsRef.current.length);
    dispatch({ type: 'REDO' });
  }, []); // 依存配列から setIsDirty も削除


  const handleDrawComplete = useCallback((newElement: DrawingElementType) => {
    console.log("[useDrawingElements] handleDrawComplete called (function entry).");
    console.log("[useDrawingElements] handleDrawComplete called. New element type:", newElement.type);
    const elementToCreate = { ...newElement, id: undefined, temp_id: `temp-${Date.now()}` };

    dispatch({ type: 'ADD_ELEMENT', payload: elementToCreate });

    setIsDirty(true);

    // 送信中の要素の temp_id を記録
    pendingElementTempId.current = elementToCreate.temp_id;

    if (onNewElementCreated) {
      console.log("[useDrawingElements] handleDrawComplete: Calling onNewElementCreated callback.");
      onNewElementCreated(elementToCreate);
    }
  }, [setIsDirty, onNewElementCreated]);


  const addDrawingElementFromExternalSource = useCallback((element: DrawingElementType) => {
    console.log("[useDrawingElements] addDrawingElementFromExternalSource called. Element type:", element.type, "Element ID:", element.id, "Element temp_id:", element.temp_id);
    console.log("[useDrawingElements] addDrawingElementFromExternalSource: Provided element temp_id:", element.temp_id);
    console.log("[useDrawingElements] addDrawingElementFromExternalSource: pendingElementTempId.current:", pendingElementTempId.current);

    setIsDirty(true);

    // Check if the received element is a confirmation of a self-broadcasted element.
    const isSelfBroadcastedAndConfirmed = typeof element.id === 'number' &&
                                           element.temp_id === undefined &&
                                           pendingElementTempId.current !== null &&
                                           state.elements.some(e => e.id === undefined && e.temp_id === pendingElementTempId.current); // state.elements を参照

    console.log(`[useDrawingElements] hasMatchingTemporaryElement: ${state.elements.some(e => e.id === undefined && e.temp_id === pendingElementTempId.current)}`);
    console.log(`[useDrawingElements] isSelfBroadcastedAndConfirmed calculated: ${isSelfBroadcastedAndConfirmed}`);


    if (isSelfBroadcastedAndConfirmed) {
      dispatch({ type: 'SET_ELEMENTS', payload: state.elements.map(e => {
        if (e.id === undefined && e.temp_id === pendingElementTempId.current) {
          const { temp_id, ...rest } = element;
          return { ...rest, id: element.id, temp_id: e.temp_id };
        }
        return e;
      }) });
      console.log("[useDrawingElements] addDrawingElementFromExternalSource: Self-broadcasted element (confirmed by server). Updating existing temporary element.");
      pendingElementTempId.current = null; // 処理が完了したのでクリア
    } else {
      dispatch({ type: 'ADD_ELEMENT', payload: element });
      console.log("[useDrawingElements] addDrawingElementFromExternalSource: Adding new external element to drawingElements. Current drawingElements length before add:", state.elements.length);
    }
  }, [setIsDirty, pendingElementTempId, state.elements]);

  const canUndo = undoStack.length > 1;
  const canRedo = redoStack.length > 0;

  return {
    drawingElements: state.elements,
    setDrawingElements: (elements) => dispatch({ type: 'SET_ELEMENTS', payload: elements }),
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    handleUndo,
    handleRedo,
    handleDrawComplete,
    canUndo,
    canRedo,
    addDrawingElementFromExternalSource,
    pendingElementTempId,
  };
};
