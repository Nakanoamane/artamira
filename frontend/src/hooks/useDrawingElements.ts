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
  switch (action.type) {
    case 'ADD_ELEMENT':
      const newElementsAfterAdd = [...state.elements, action.payload];
      const updatedUndoStackForAdd = [...state.undoStack, state.elements];
      const newStateAdd = {
        elements: newElementsAfterAdd,
        undoStack: updatedUndoStackForAdd,
        redoStack: [],
      };
      return newStateAdd;

    case 'UNDO':
      const newUndoStackAfterUndo = [...state.undoStack];
      const previousState = newUndoStackAfterUndo.pop();

      if (previousState === undefined) {
        return state;
      }
      const newStateUndo = {
        elements: previousState,
        undoStack: newUndoStackAfterUndo,
        redoStack: [...state.redoStack, state.elements],
      };
      return newStateUndo;

    case 'REDO':
      const newRedoStackAfterRedo = [...state.redoStack];
      const nextState = newRedoStackAfterRedo.pop();

      if (nextState === undefined) {
        return state;
      }
      const newStateRedo = {
        elements: nextState,
        undoStack: [...state.undoStack, state.elements],
        redoStack: newRedoStackAfterRedo,
      };
      return newStateRedo;

    case 'SET_ELEMENTS':
      const newState = {
        ...state,
        elements: action.payload,
        undoStack: action.payload.length > 0 ? [action.payload] : [[]],
        redoStack: [],
      };
      return newState;

    case 'RESET_HISTORY':
      const newStateResetHistory = {
        elements: action.payload,
        undoStack: action.payload.length > 0 ? [action.payload] : [[]],
        redoStack: [],
      };
      return newStateResetHistory;

    case 'APPLY_REMOTE_UNDO': {
      const newRedoStack = [...state.redoStack, state.elements];
      const newState = {
        elements: action.payload,
        undoStack: action.payload.length > 0 ? [action.payload] : [[]],
        redoStack: newRedoStack,
      };
      return newState;
    }

    case 'APPLY_REMOTE_REDO': {
      const newUndoStack = [...state.undoStack, state.elements];
      const newState = {
        elements: action.payload,
        undoStack: newUndoStack,
        redoStack: [],
      };
      return newState;
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

  // New state to trigger broadcasting after reducer updates
  const [actionToBroadcast, setActionToBroadcast] = useState<{ type: "undo" | "redo"; timestamp: number } | null>(null);

  useEffect(() => {
    if (initialLoadedElements.length > 0 && state.elements.length === 0) {
      dispatch({ type: "SET_ELEMENTS", payload: initialLoadedElements });
    }
  }, [initialLoadedElements, state.elements.length]);

  // Effect to handle broadcasting after undo/redo actions
  useEffect(() => {
    if (actionToBroadcast) {
      onUndoRedoAction(actionToBroadcast.type, state.elements);
      setActionToBroadcast(null); // Reset to avoid re-triggering
    }
  }, [state.elements, actionToBroadcast, onUndoRedoAction]);

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
        pendingElementTempId.current = null;
        return;
      }
      dispatch({ type: "ADD_ELEMENT", payload: element });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleDrawComplete = useCallback(
    (element: DrawingElementType) => {
      const elementWithTempId = { ...element, id: undefined, temp_id: `temp-${Date.now()}` };
      pendingElementTempId.current = elementWithTempId.temp_id;

      dispatch({ type: "ADD_ELEMENT", payload: elementWithTempId });
      setIsDirty(true);

      onNewElementCreated(elementWithTempId);
    },
    [onNewElementCreated, setIsDirty]
  );

  const handleUndo = useCallback(() => {
    if (state.undoStack.length <= 1) {
      return;
    }

    dispatch({ type: 'UNDO' });
    setIsDirty(true);
    setActionToBroadcast({ type: "undo", timestamp: Date.now() }); // Trigger broadcast after state update
  }, [dispatch, state.undoStack.length, setIsDirty]); // Removed state.elements from deps

  const handleRedo = useCallback(() => {
    if (state.redoStack.length === 0) {
      return;
    }

    dispatch({ type: 'REDO' });
    setIsDirty(true);
    setActionToBroadcast({ type: "redo", timestamp: Date.now() }); // Trigger broadcast after state update
  }, [dispatch, state.redoStack.length, setIsDirty]); // Removed state.elements from deps

  const canUndo = state.undoStack.length > 1;
  const canRedo = state.redoStack.length > 0;

  useEffect(() => {
  }, [state.elements.length, state.undoStack.length, state.redoStack.length]);

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
