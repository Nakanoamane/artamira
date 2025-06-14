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
  clearDrawing: () => void;
  applyRemoteUndo: (elements: DrawingElementType[]) => void;
  applyRemoteRedo: (elements: DrawingElementType[]) => void;
}

// Define action types
type Action =
  | { type: 'ADD_ELEMENT'; payload: DrawingElementType }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ELEMENTS'; payload: DrawingElementType[] }
  | { type: 'RESET_HISTORY'; payload: DrawingElementType[] }
  | { type: 'APPLY_REMOTE_UNDO'; payload: DrawingElementType[] }
  | { type: 'APPLY_REMOTE_REDO'; payload: DrawingElementType[] };

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
      const newElementsAfterAdd = [...state.elements, action.payload];
      console.log("[drawingReducer] ADD_ELEMENT: Current elements before snapshot:", state.elements.length, state.elements);
      const updatedUndoStackForAdd = [...state.undoStack, state.elements];
      console.log("[drawingReducer] ADD_ELEMENT: Snapshot being added to undoStack:", state.elements.length, state.elements);
      console.log("[drawingReducer] ADD_ELEMENT: Updated undoStack lengths:", updatedUndoStackForAdd.map(s => s.length));
      const newStateAdd = {
        elements: newElementsAfterAdd,
        undoStack: updatedUndoStackForAdd,
        redoStack: [],
      };
      console.log(`[drawingReducer] ADD_ELEMENT: State after action: elements=${newStateAdd.elements.length}, undoStack=${newStateAdd.undoStack.length}, redoStack=${newStateAdd.redoStack.length}`);
      return newStateAdd;

    case 'UNDO':
      if (state.undoStack.length <= 1) {
        console.log("[drawingReducer] UNDO: Undo stack is empty or has only one element. Not undoing.");
        return state;
      }
      const newUndoStackAfterUndo = [...state.undoStack];
      const previousState = newUndoStackAfterUndo.pop();

      if (previousState === undefined) {
        console.log("[drawingReducer] UNDO: Previous state is undefined. This should not happen.");
        return state;
      }

      const newStateUndo = {
        elements: previousState,
        undoStack: newUndoStackAfterUndo,
        redoStack: [...state.redoStack, state.elements],
      };
      console.log(`[drawingReducer] UNDO: State after action: elements=${newStateUndo.elements.length}, undoStack=${newStateUndo.undoStack.length}, redoStack=${newStateUndo.redoStack.length}`);
      return newStateUndo;

    case 'REDO':
      if (state.redoStack.length === 0) {
        console.log("[drawingReducer] REDO: Redo stack is empty. Not redoing.");
        return state;
      }
      const newRedoStackAfterRedo = [...state.redoStack];
      const nextState = newRedoStackAfterRedo.pop();

      if (nextState === undefined) {
        console.log("[drawingReducer] REDO: Next state is undefined. This should not happen.");
        return state;
      }

      const newStateRedo = {
        elements: nextState,
        undoStack: [...state.undoStack, state.elements],
        redoStack: newRedoStackAfterRedo,
      };
      console.log(`[drawingReducer] REDO: State after action: elements=${newStateRedo.elements.length}, undoStack=${newStateRedo.undoStack.length}, redoStack=${newStateRedo.redoStack.length}`);
      return newStateRedo;

    case 'SET_ELEMENTS':
      console.log(`[drawingReducer] Action received: SET_ELEMENTS with ${action.payload.length} elements. Resetting history.`);
      return {
        ...state,
        elements: action.payload,
        undoStack: [action.payload],
        redoStack: [],
      };

    case 'RESET_HISTORY':
      const newStateResetHistory = {
        elements: action.payload,
        undoStack: action.payload.length > 0 ? [action.payload] : [[]],
        redoStack: [],
      };
      console.log(`[drawingReducer] RESET_HISTORY: State after action: elements=${newStateResetHistory.elements.length}, undoStack=${newStateResetHistory.undoStack.length}, redoStack=${newStateResetHistory.redoStack.length}`);
      return newStateResetHistory;

    case 'APPLY_REMOTE_UNDO': {
      console.log(`[drawingReducer] APPLY_REMOTE_UNDO: Applying remote undo with ${action.payload.length} elements.`);
      console.log(`[drawingReducer] APPLY_REMOTE_UNDO: State before update - elements.length: ${state.elements.length}, redoStack.length: ${state.redoStack.length}, redoStack content:`, state.redoStack.map(s => s.length));
      const newRedoStack = [...state.redoStack, state.elements];
      console.log(`[drawingReducer] APPLY_REMOTE_UNDO: New redoStack length: ${newRedoStack.length}, content:`, newRedoStack.map(s => s.length));
      return {
        elements: action.payload,
        undoStack: [action.payload],
        redoStack: newRedoStack,
      };
    }

    case 'APPLY_REMOTE_REDO': {
      console.log(`[drawingReducer] APPLY_REMOTE_REDO: Applying remote redo with ${action.payload.length} elements.`);
      console.log(`[drawingReducer] APPLY_REMOTE_REDO: State before update - elements.length: ${state.elements.length}, undoStack.length: ${state.undoStack.length}, undoStack content:`, state.undoStack.map(s => s.length));
      const newUndoStack = [...state.undoStack, state.elements];
      console.log(`[drawingReducer] APPLY_REMOTE_REDO: New undoStack length: ${newUndoStack.length}, content:`, newUndoStack.map(s => s.length));
      return {
        elements: action.payload,
        undoStack: newUndoStack,
        redoStack: [],
      };
    }

    default:
      return state;
  }
};

export const useDrawingElements = (
  setIsDirty: (dirty: boolean) => void,
  onNewElementCreated: (element: DrawingElementType) => void,
  initialLoadedElements: DrawingElementType[],
  onUndoRedoAction: (actionType: "undo" | "redo", elements: DrawingElementType[]) => void
): UseDrawingElementsResult => {
  const [state, dispatch] = useReducer(drawingReducer, {
    elements: [],
    undoStack: [[]],
    redoStack: [],
  });

  const pendingElementTempId = useRef<string | null>(null);

  useEffect(() => {
    console.log("[useDrawingElements] initialLoadedElements useEffect triggered. initialLoadedElements length:", initialLoadedElements.length);
    if (initialLoadedElements.length > 0 && state.elements.length === 0) {
      dispatch({ type: "SET_ELEMENTS", payload: initialLoadedElements });
      console.log(`[useDrawingElements] Initial elements set from prop. length: ${initialLoadedElements.length}`);
    }
  }, [initialLoadedElements, state.elements.length]);

  const addDrawingElement = useCallback(
    (element: DrawingElementType) => {
      dispatch({ type: "ADD_ELEMENT", payload: element });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const addDrawingElementFromExternalSource = useCallback(
    (element: DrawingElementType) => {
      if (element.temp_id && element.temp_id === pendingElementTempId.current) {
        console.log(`[useDrawingElements] Self-broadcasted element received, skipping addDrawingElement: ${element.temp_id}`);
        pendingElementTempId.current = null;
        return;
      }
      console.log(`[useDrawingElements] Adding element from external source: ${element.id || element.temp_id}`);
      dispatch({ type: "ADD_ELEMENT", payload: element });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleDrawComplete = useCallback(
    (element: DrawingElementType) => {
      console.log("[useDrawingElements] handleDrawComplete called (function entry).");
      const elementWithTempId = { ...element, temp_id: `temp-${Date.now()}` };
      pendingElementTempId.current = elementWithTempId.temp_id;

      console.log(`[useDrawingElements] handleDrawComplete called. New element type: ${elementWithTempId.type}, temp_id: ${elementWithTempId.temp_id}`);

      dispatch({ type: "ADD_ELEMENT", payload: elementWithTempId });
      setIsDirty(true);

      onNewElementCreated(elementWithTempId);
      console.log("[useDrawingElements] handleDrawComplete: Calling onNewElementCreated callback.");
    },
    [onNewElementCreated, setIsDirty]
  );

  const handleUndo = useCallback(() => {
    console.log("[useDrawingElements] handleUndo called. Current undoStack length:", state.undoStack.length);
    console.log("[useDrawingElements] undoStack content before UNDO:", state.undoStack.map(s => s.length));
    if (state.undoStack.length <= 1) {
      return;
    }

    const previousElements = state.undoStack[state.undoStack.length - 2];
    dispatch({ type: 'UNDO' });
    setIsDirty(true);
    onUndoRedoAction("undo", previousElements);
    console.log("[useDrawingElements] Effect: Broadcasting UNDO action.", previousElements.length);

  }, [state.undoStack, setIsDirty, onUndoRedoAction]);

  const handleRedo = useCallback(() => {
    console.log("[useDrawingElements] handleRedo called. Current redoStack length:", state.redoStack.length);
    if (state.redoStack.length === 0) {
      return;
    }

    const nextElements = state.redoStack[state.redoStack.length - 1];
    dispatch({ type: 'REDO' });
    setIsDirty(true);
    onUndoRedoAction("redo", nextElements);
    console.log("[useDrawingElements] Effect: Broadcasting REDO action.", nextElements.length);
  }, [state.redoStack, setIsDirty, onUndoRedoAction]);

  const canUndo = state.undoStack.length > 1;
  const canRedo = state.redoStack.length > 0;

  useEffect(() => {
    console.log(`[useDrawingElements] canUndo: ${canUndo}, canRedo: ${canRedo}`);
  }, [canUndo, canRedo]);

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
    clearDrawing: () => dispatch({ type: 'RESET_HISTORY', payload: [] }),
    applyRemoteUndo: (elements) => dispatch({ type: 'APPLY_REMOTE_UNDO', payload: elements }),
    applyRemoteRedo: (elements) => dispatch({ type: 'APPLY_REMOTE_REDO', payload: elements }),
  };
};
