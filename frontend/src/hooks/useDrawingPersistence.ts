import { useState, useEffect, useCallback } from "react";
import { DrawingElementType, parseRawElements } from "../utils/drawingElementsParser";

interface UseDrawingPersistenceProps {
  drawingId: number | undefined;
}

interface UseDrawingPersistenceResult {
  drawing: { id: number; title: string } | undefined;
  loadingDrawing: boolean;
  errorDrawing: string | null;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  lastSavedAt: Date | null;
  setLastSavedAt: (date: Date | null) => void;
  handleSave: (elements: DrawingElementType[]) => Promise<void>;
  initialDrawingElements: DrawingElementType[];
  initialLastSavedAt: Date | null;
}

export const useDrawingPersistence = ({ drawingId }: UseDrawingPersistenceProps): UseDrawingPersistenceResult => {
  const [drawing, setDrawing] = useState<{ id: number; title: string }>();
  const [loadingDrawing, setLoadingDrawing] = useState<boolean>(true);
  const [errorDrawing, setErrorDrawing] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [initialDrawingElements, setInitialDrawingElements] = useState<DrawingElementType[]>([]);
  const [initialLastSavedAt, setInitialLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const fetchDrawingData = async () => {
      if (drawingId === undefined) {
        setLoadingDrawing(false);
        return;
      }
      setLoadingDrawing(true);
      setErrorDrawing(null);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}. Body: ${errorText}`);
        }

        const data = await response.json();

        setDrawing({ id: drawingId, title: data.title || "無題のボード" });

        let elements: DrawingElementType[] = [];
        let fetchedLastSavedAt: Date | null = null;

        if (data.canvas_data) {
          try {
            const rawDataFromCanvasData = JSON.parse(data.canvas_data);

            // canvas_dataはRawDrawingElement[]の形式で保存されているため、
            // 常にparseRawElementsでDrawingElementType[]に変換する
            if (Array.isArray(rawDataFromCanvasData)) {
              elements = parseRawElements(rawDataFromCanvasData);
            } else if (typeof rawDataFromCanvasData === 'object' && rawDataFromCanvasData !== null && 'elements' in rawDataFromCanvasData && Array.isArray(rawDataFromCanvasData.elements)) {
              // 以前の形式（{ elements: RawDrawingElement[] }）も考慮する場合
              elements = parseRawElements(rawDataFromCanvasData.elements);
            } else {
              setErrorDrawing("Failed to parse canvas data: Unexpected top-level format for parsing.");
            }
          } catch (e: any) {
            setErrorDrawing("Failed to parse canvas data: " + e.message);
          }
        }

        // Drawing elements after save (常にRawDrawingElement[]として処理されることを想定)
        if (data.drawing_elements_after_save && Array.isArray(data.drawing_elements_after_save)) {
          const newElements = parseRawElements(data.drawing_elements_after_save);
          elements = [...elements, ...newElements]; // elements (canvas_dataからの要素)とnewElementsを結合
        }

        setInitialDrawingElements(elements);
        fetchedLastSavedAt = data.last_saved_at ? new Date(data.last_saved_at) : null;
        setInitialLastSavedAt(fetchedLastSavedAt);
        setLastSavedAt(fetchedLastSavedAt);
        setIsDirty(false);

      } catch (e: any) {
        setErrorDrawing(`描画データの読み込みに失敗しました: ${e.message}`);
      } finally {
        setLoadingDrawing(false);
      }
    };

    fetchDrawingData();
  }, [drawingId]);

  const handleSave = useCallback(async (currentDrawingElements: DrawingElementType[]) => {
    if (drawingId === undefined) {
      return;
    }
    if (!isDirty) {
      return;
    }

    try {
      const elementsToSave = currentDrawingElements.map(element => {
        const newElement = { ...element };
        if (newElement.temp_id !== undefined) {
          delete newElement.temp_id;
        }
        return newElement;
      });

      // データ形式の変換
      const rawElements = elementsToSave.map(element => {
        if (element.type === 'line') {
          return {
            id: element.id,
            element_type: 'line',
            data: {
              path: element.points.map(p => [p.x, p.y]),
              color: element.color,
              lineWidth: element.brushSize
            }
          };
        } else if (element.type === 'rectangle') {
          return {
            id: element.id,
            element_type: 'rectangle',
            data: {
              start: element.start,
              end: element.end,
              color: element.color,
              lineWidth: element.brushSize
            }
          };
        } else if (element.type === 'circle') {
          return {
            id: element.id,
            element_type: 'circle',
            data: {
              center: element.center,
              radius: element.radius,
              color: element.color,
              brushSize: element.brushSize
            }
          };
        }
        return null;
      }).filter(Boolean);

      const saveData = { canvas_data: JSON.stringify(rawElements) };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(saveData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. Body: ${errorText}`);
      }

      const data = await response.json();
      setIsDirty(false);
      setLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
    } catch (e: any) {
      setErrorDrawing(`描画データの保存に失敗しました: ${e.message}`);
    }
  }, [drawingId, isDirty]);

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isDirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }, [isDirty]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  return {
    drawing,
    loadingDrawing,
    errorDrawing,
    isDirty,
    setIsDirty,
    lastSavedAt,
    setLastSavedAt,
    handleSave,
    initialDrawingElements,
    initialLastSavedAt,
  };
};
