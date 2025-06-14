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
      if (state.undoStack.length <= 1) {
        return state;
      }
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
      if (state.redoStack.length === 0) {
        return state;
      }
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
      return newStateResetHistory;

    case 'APPLY_REMOTE_UNDO': {
      const newRedoStack = [...state.redoStack, state.elements];
      return {
        elements: action.payload,
        undoStack: [action.payload],
        redoStack: newRedoStack,
      };
    }

    case 'APPLY_REMOTE_REDO': {
      const newUndoStack = [...state.undoStack, state.elements];
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
    if (initialLoadedElements.length > 0 && state.elements.length === 0) {
      dispatch({ type: "SET_ELEMENTS", payload: initialLoadedElements });
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
      const elementWithTempId = { ...element, temp_id: `temp-${Date.now()}` };
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

    const previousElements = state.undoStack[state.undoStack.length - 2];
    dispatch({ type: 'UNDO' });
    setIsDirty(true);
    onUndoRedoAction("undo", previousElements);

  }, [state.undoStack, setIsDirty, onUndoRedoAction]);

  const handleRedo = useCallback(() => {
    if (state.redoStack.length === 0) {
      return;
    }

    const nextElements = state.redoStack[state.redoStack.length - 1];
    dispatch({ type: 'REDO' });
    setIsDirty(true);
    onUndoRedoAction("redo", nextElements);
  }, [state.redoStack, setIsDirty, onUndoRedoAction]);

  const canUndo = state.undoStack.length > 1;
  const canRedo = state.redoStack.length > 0;

  useEffect(() => {
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
