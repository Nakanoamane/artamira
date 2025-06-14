import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import { ExportModal } from "../components/ExportModal";
import { usePageTitle } from "../hooks/usePageTitle";
import { useParams } from "react-router";
import CompactHeader from "../components/CompactHeader";
import DrawingHeader from "../components/DrawingHeader";
import { useHeader } from "../contexts/HeaderContext";
import { DrawingElementType } from "../utils/drawingElementsParser";
import { useDrawingTools } from "../hooks/useDrawingTools";
import { useDrawingElements } from "../hooks/useDrawingElements";
import { useDrawingChannelIntegration } from "../hooks/useDrawingChannelIntegration";
import { useDrawingPersistence } from "../hooks/useDrawingPersistence";
import { useDrawingExport } from "../hooks/useDrawingExport";
import { useAuth } from "../contexts/AuthContext";

const DrawingBoard = () => {
  const navigate = useNavigate();
  const { setShowHeader } = useHeader();
  const { activeTool, setActiveTool, activeColor, setActiveColor, activeBrushSize, setActiveBrushSize } = useDrawingTools();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { id } = useParams<{ id: string }>();
  const drawingId = id ? parseInt(id, 10) : undefined;

  const { drawing, loadingDrawing, errorDrawing, isDirty, setIsDirty, lastSavedAt, setLastSavedAt, handleSave, initialDrawingElements, initialLastSavedAt } = useDrawingPersistence({
    drawingId,
  });

  const { user } = useAuth();

  // Generate a unique client ID for this tab session
  const clientId = useRef(Date.now().toString() + Math.random().toString(36).substring(2, 15)).current;

  // Refs for functions/values from useDrawingElements that useDrawingChannelIntegration needs
  const addDrawingElementFromExternalSourceRef = useRef((element: DrawingElementType) => {});
  const pendingElementTempIdRef = useRef<React.MutableRefObject<string | null>>({ current: null });
  const applyRemoteUndoRef = useRef((elements: DrawingElementType[]) => {});
  const applyRemoteRedoRef = useRef((elements: DrawingElementType[]) => {});

  const { sendDrawingElement, sendUndoRedoAction } = useDrawingChannelIntegration({
    drawingId: drawingId,
    addDrawingElement: (element) => addDrawingElementFromExternalSourceRef.current(element),
    onDrawingSaved: (savedAt) => {
      setIsDirty(false);
      setLastSavedAt(savedAt);
    },
    pendingElementTempId: pendingElementTempIdRef.current,
    applyRemoteUndo: (elements) => applyRemoteUndoRef.current(elements),
    applyRemoteRedo: (elements) => applyRemoteRedoRef.current(elements),
    currentUserId: user?.id,
    clientId: clientId,
  });

  // Callbacks that depend on sendDrawingElement and sendUndoRedoAction
  const handleNewElementCreated = useCallback((newElement: DrawingElementType) => {
    sendDrawingElement(newElement);
  }, [sendDrawingElement]);

  const handleUndoRedoAction = useCallback((actionType: "undo" | "redo", elements: DrawingElementType[]) => {
    sendUndoRedoAction(actionType, elements);
  }, [sendUndoRedoAction]);

  const { drawingElements, handleDrawComplete, handleUndo, handleRedo, canUndo, canRedo, addDrawingElementFromExternalSource, pendingElementTempId, setDrawingElements, applyRemoteUndo, applyRemoteRedo } = useDrawingElements(
    setIsDirty,
    handleNewElementCreated,
    initialDrawingElements,
    handleUndoRedoAction
  );

  // Assign actual functions to refs after useDrawingElements is called
  useEffect(() => {
    addDrawingElementFromExternalSourceRef.current = addDrawingElementFromExternalSource;
    pendingElementTempIdRef.current = pendingElementTempId; // Assign the whole ref object
    applyRemoteUndoRef.current = applyRemoteUndo;
    applyRemoteRedoRef.current = applyRemoteRedo;
  }, [addDrawingElementFromExternalSource, pendingElementTempId, applyRemoteUndo, applyRemoteRedo]);

  const { isExportModalOpen, setIsExportModalOpen, isExporting, exportError, handleExportClick, handleExport } = useDrawingExport();

  const handleSaveBoard = useCallback(async () => {
    // ... existing code ...
  }, [drawingElements, drawingId, handleSave]);

  usePageTitle(drawing ? drawing.title : "描画ボード");

  useEffect(() => {
    setShowHeader(false);

    return () => {
      setShowHeader(true);
    };
  }, [setShowHeader]);

  useEffect(() => {
    return () => {
    };
  }, []);

  if (loadingDrawing) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        描画ボードを読み込み中...
      </div>
    );
  }

  if (errorDrawing) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500 text-lg">
        エラー: {errorDrawing}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-start items-center pr-8 gap-4">
        <CompactHeader />
        <DrawingHeader
          title={drawing?.title || "無題のボード"}
          lastSavedAt={lastSavedAt}
          isDirty={isDirty}
        />
      </div>

      <div className="flex flex-col items-center gap-4 pb-10">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          activeBrushSize={activeBrushSize}
          setActiveBrushSize={setActiveBrushSize}
          onSave={() => handleSave(drawingElements)}
          onExportClick={handleExportClick}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          isDirty={isDirty}
        />
        <Canvas
          ref={canvasRef}
          drawingElements={drawingElements}
          activeTool={activeTool}
          activeColor={activeColor}
          activeBrushSize={activeBrushSize}
          onDrawComplete={handleDrawComplete}
        />
      </div>

      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
          }}
          onExport={(format) => handleExport(format, canvasRef)}
          isExporting={isExporting}
          exportError={exportError}
        />
      )}
    </div>
  );
};

export default DrawingBoard;
