import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import Canvas, { DrawingElementType } from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import { ExportModal } from "../components/ExportModal";
import { usePageTitle } from "../hooks/usePageTitle";
import { useDrawingChannel } from "../hooks/useDrawingChannel";
import { useParams } from "react-router";
import CompactHeader from "../components/CompactHeader";
import DrawingHeader from "../components/DrawingHeader";
import { useHeader } from "../contexts/HeaderContext";
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface Drawing {
  id: number;
  title: string;
  last_saved_at?: string;
}

const DrawingBoard = () => {
  const navigate = useNavigate();
  const { setShowHeader } = useHeader();
  const [activeTool, setActiveTool] = useState("pen");
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeBrushSize, setActiveBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>(
    []
  );
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([]);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [loadingDrawing, setLoadingDrawing] = useState(true);
  const [errorDrawing, setErrorDrawing] = useState<string | null>(null);
  const [_, setActionCableError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();

  // Undo/Redo Functions
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      const newUndoStack = [...prev];
      const lastState = newUndoStack.pop(); // 最後の状態を取り出す

      if (lastState) {
        setRedoStack((redoPrev) => [...redoPrev, drawingElements]); // 現在の状態をredoStackに保存
        setDrawingElements(lastState); // 描画要素を元に戻す
        setIsDirty(true); // UndoでもDirtyになる
      }
      return newUndoStack;
    });
  }, [drawingElements]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      const newRedoStack = [...prev];
      const nextState = newRedoStack.pop(); // 次の状態を取り出す

      if (nextState) {
        setUndoStack((undoPrev) => [...undoPrev, drawingElements]); // 現在の状態をundoStackに保存
        setDrawingElements(nextState); // 描画要素を進める
        setIsDirty(true); // RedoでもDirtyになる
      }
      return newRedoStack;
    });
  }, [drawingElements]);

  const handleReceivedData = useCallback(
    (receivedActionCableData: any) => {
      if (
        receivedActionCableData.type === "drawing_element_created" &&
        receivedActionCableData.drawing_element
      ) {
        const { element_type, data: drawingElementData } =
          receivedActionCableData.drawing_element;
        const receivedElementId = receivedActionCableData.drawing_element.id;

        if (
          receivedElementId &&
          drawingElements.some((el) => el.id === receivedElementId)
        ) {
          return;
        }

        let receivedElement: DrawingElementType | null = null;

        if (element_type === "line") {
          receivedElement = {
            id: receivedElementId,
            type: "line",
            points: drawingElementData.path.map((p: [number, number]) => ({
              x: p[0],
              y: p[1],
            })),
            color: drawingElementData.color,
            brushSize: drawingElementData.lineWidth,
          };
        } else if (element_type === "rectangle") {
          receivedElement = {
            id: receivedElementId,
            type: "rectangle",
            start: {
              x: drawingElementData.start.x,
              y: drawingElementData.start.y,
            },
            end: { x: drawingElementData.end.x, y: drawingElementData.end.y },
            color: drawingElementData.color,
            brushSize: drawingElementData.lineWidth,
          };
        } else if (element_type === "circle") {
          receivedElement = {
            id: receivedElementId,
            type: "circle",
            center: {
              x: drawingElementData.center.x,
              y: drawingElementData.center.y,
            },
            radius: drawingElementData.radius,
            color: drawingElementData.color,
            brushSize: drawingElementData.brushSize,
          };
        }

        if (receivedElement) {
          setUndoStack((prev) => [...prev, drawingElements]);
          setRedoStack([]);
          setDrawingElements((prev) => {
            const newState = [...prev, receivedElement];
            return newState;
          });
          setIsDirty(true); // 他のユーザーからの描画でもDirtyになる
        }
      } else if (
        receivedActionCableData.type === "drawing_saved" &&
        receivedActionCableData.drawing_id === drawing?.id
      ) {
        // 保存完了通知を受信した場合
        setIsDirty(false);
        setLastSavedAt(
          receivedActionCableData.last_saved_at
            ? new Date(receivedActionCableData.last_saved_at)
            : null
        );
      }
    },
    [drawingElements, drawing?.id]
  );

  const drawingId = id ? parseInt(id, 10) : undefined;

  const { channel, status } = useDrawingChannel(
    "DrawingChannel",
    drawingId,
    handleReceivedData
  );

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
          // receivedElementに型変換する処理 (handleReceivedData と同じロジック)
          const parsedNewElements: DrawingElementType[] = data.drawing_elements_after_save.map((el: any) => {
            let element: DrawingElementType | null = null;
            if (el.element_type === "line") {
              element = {
                id: el.id,
                type: "line",
                points: el.data.path.map((p: [number, number]) => ({ x: p[0], y: p[1] })),
                color: el.data.color,
                brushSize: el.data.lineWidth,
              };
            } else if (el.element_type === "rectangle") {
              element = {
                id: el.id,
                type: "rectangle",
                start: { x: el.data.start.x, y: el.data.start.y },
                end: { x: el.data.end.x, y: el.data.end.y },
                color: el.data.color,
                brushSize: el.data.lineWidth,
              };
            } else if (el.element_type === "circle") {
              element = {
                id: el.id,
                type: "circle",
                center: { x: el.data.center.x, y: el.data.center.y },
                radius: el.data.radius,
                color: el.data.color,
                brushSize: el.data.brushSize,
              };
            }
            return element;
          }).filter(Boolean);

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
  }, [drawingId]);

  useEffect(() => {
    // TODO: 認証チェック
  }, [navigate]);

  const handleDrawComplete = (newElement: DrawingElementType) => {
    setUndoStack((prev) => [...prev, drawingElements]);
    setRedoStack([]);
    setDrawingElements((prev) => [...prev, newElement]);
    setIsDirty(true); // 描画操作でDirtyにする

    if (channel && status.isConnected) {
      let elementDataToSend: any;
      if (newElement.type === "line") {
        elementDataToSend = {
          id: newElement.id,
          path: newElement.points.map((p) => [p.x, p.y]),
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      } else if (newElement.type === "rectangle") {
        elementDataToSend = {
          id: newElement.id,
          start: newElement.start,
          end: newElement.end,
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      } else if (newElement.type === "circle") {
        elementDataToSend = {
          id: newElement.id,
          center: newElement.center,
          radius: newElement.radius,
          color: newElement.color,
          brushSize: newElement.brushSize,
        };
      }

      channel.perform("draw", {
        element_type: newElement.type,
        element_data: elementDataToSend,
      });
      setActionCableError(null);
    } else {
      console.warn(
        "WebSocket接続が確立されていないため、描画データを送信できません。"
      );
      setActionCableError(
        "描画データを送信できません。WebSocket接続が確立されていません。"
      );
    }
  };

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
    // console.log("handleExportClick called. Setting isExportModalOpen to true."); // デバッグログ
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

      // 動的に<a>タグを作成してダウンロードをトリガー
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `drawing.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExportModalOpen(false); // <-- 成功時のみモーダルを閉じる
    } catch (e: any) {
      console.error("Export failed:", e);
      setExportError(`エクスポートに失敗しました: ${e.message}`);
      // console.log("Export failed. isExportModalOpen should remain true."); // デバッグログ
      // エラー時はモーダルを閉じない
    } finally {
      setIsExporting(false); // エクスポート中のステータスは解除
      // console.log("handleExport finally block. isExporting set to false."); // デバッグログ
      // setIsExportModalOpen(false); // ここからは削除
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
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
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
                // console.log("ExportModal onClose called. Setting isExportModalOpen to false."); // デバッグログ
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
