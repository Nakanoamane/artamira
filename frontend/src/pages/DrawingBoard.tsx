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
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { DrawingElementType, parseRawElements } from "../utils/drawingElementsParser";
import { useDrawingTools } from "../hooks/useDrawingTools";
import { useDrawingElements } from "../hooks/useDrawingElements";
import { useDrawingChannelIntegration } from "../hooks/useDrawingChannelIntegration";

interface Drawing {
  id: number;
  title: string;
  last_saved_at?: string;
}

const DrawingBoard = () => {
  const navigate = useNavigate();
  const { setShowHeader } = useHeader();
  const { activeTool, setActiveTool, activeColor, setActiveColor, activeBrushSize, setActiveBrushSize } = useDrawingTools();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [loadingDrawing, setLoadingDrawing] = useState(true);
  const [errorDrawing, setErrorDrawing] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();
  const drawingId = id ? parseInt(id, 10) : undefined;

  const { drawingElements, setDrawingElements, handleUndo, handleRedo, handleDrawComplete, canUndo, canRedo, addDrawingElementFromExternalSource } = useDrawingElements(
    setIsDirty,
    (newElement) => { // onNewElementCreatedコールバック
      // Action Cableで描画要素を送信
      sendDrawingElement(newElement);
    }
  );

  const { sendDrawingElement } = useDrawingChannelIntegration({
    drawingId: drawingId,
    addDrawingElement: (element) => {
      // 他のユーザーからの描画を受信した場合、useDrawingElementsの関数を介して描画要素を追加
      addDrawingElementFromExternalSource(element);
    },
    onDrawingSaved: (savedAt) => {
      setIsDirty(false);
      setLastSavedAt(savedAt);
    },
  });

  usePageTitle(drawing ? drawing.title : "描画ボード");

  useEffect(() => {
    setShowHeader(false);

    return () => {
      setShowHeader(true);
    };
  }, [setShowHeader]);

  useEffect(() => {
    const fetchDrawingData = async () => {
      if (!drawingId) {
        setErrorDrawing("描画ボードIDが指定されていません。");
        setLoadingDrawing(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setDrawing({ id: drawingId, title: data.title || "無題のボード" });

        let initialElements: DrawingElementType[] = [];
        if (data.canvas_data) {
          try {
            initialElements = JSON.parse(data.canvas_data);
          } catch (parseError) {
            console.error("Failed to parse canvas_data:", parseError);
            // パースエラーが発生した場合は、canvas_dataは無視してdrawing_elements_after_saveのみ使用する
          }
        }

        // canvas_dataの要素に、drawing_elements_after_saveの要素を追加する
        if (data.drawing_elements_after_save && Array.isArray(data.drawing_elements_after_save)) {
          const parsedNewElements: DrawingElementType[] = parseRawElements(data.drawing_elements_after_save);
          initialElements = [...initialElements, ...parsedNewElements];
        }

        setDrawingElements(initialElements);
        setLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
        setIsDirty(false);

      } catch (e: any) {
        setErrorDrawing(e.message);
      } finally {
        setLoadingDrawing(false);
      }
    };

    fetchDrawingData();
  }, [drawingId, setDrawingElements, setLastSavedAt, setIsDirty]);

  useEffect(() => {
    // TODO: 認証チェック
  }, [navigate]);

  const handleSave = async () => {
    if (!drawingId || !isDirty) return;

    try {
      const canvasDataString = JSON.stringify(drawingElements);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ canvas_data: canvasDataString }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsDirty(false);
      setLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
    } catch (e: any) {
      console.error("Failed to save drawing:", e);
      // エラーメッセージをユーザーに表示するなどの処理
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const handleExportClick = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleExport = async (format: "png" | "jpeg") => {
    if (!canvasRef.current) {
      setExportError("Canvasが利用できません。");
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL(`image/${format}`);

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `drawing.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExportModalOpen(false);
    } catch (e: any) {
      console.error("Export failed:", e);
      setExportError(`エクスポートに失敗しました: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

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
      {loadingDrawing ? (
        <div className="flex items-center justify-center min-h-screen">
          <ArrowPathIcon className="h-8 w-8 animate-spin mr-3" />
          <div className="text-2xl font-semibold">Loading drawing...</div>
        </div>
      ) : errorDrawing ? (
        <div className="flex items-center justify-center min-h-screen text-red-500">
          <ExclamationCircleIcon className="h-8 w-8 mr-3" />
          <div className="text-2xl font-semibold">Error: {errorDrawing}</div>
        </div>
      ) : (
        <>
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
              onSave={handleSave}
              onExportClick={handleExportClick}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              isDirty={isDirty}
            />
            <Canvas
              canvasRef={canvasRef}
              drawingElements={drawingElements}
              setDrawingElements={setDrawingElements}
              activeTool={activeTool}
              activeColor={activeColor}
              activeBrushSize={activeBrushSize}
              isDrawing={isDrawing}
              setIsDrawing={setIsDrawing}
              onDrawComplete={handleDrawComplete}
            />
          </div>

          {isExportModalOpen && (
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => {
                setIsExportModalOpen(false);
              }}
              onExport={handleExport}
              isExporting={isExporting}
              exportError={exportError}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DrawingBoard;
