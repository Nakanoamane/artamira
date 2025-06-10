import { useState, useEffect, useCallback } from "react";
import { DrawingElementType, parseRawElements } from "../utils/drawingElementsParser";

interface Drawing {
  id: number;
  title: string;
  last_saved_at?: string;
}

interface UseDrawingPersistenceProps {
  drawingId: number | undefined;
}

interface UseDrawingPersistenceResult {
  drawing: Drawing | null;
  loadingDrawing: boolean;
  errorDrawing: string | null;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  lastSavedAt: Date | null;
  setLastSavedAt: (date: Date | null) => void;
  handleSave: (currentDrawingElements: DrawingElementType[]) => Promise<void>;
  initialDrawingElements: DrawingElementType[];
  initialLastSavedAt: Date | null;
}

export const useDrawingPersistence = ({
  drawingId,
}: UseDrawingPersistenceProps): UseDrawingPersistenceResult => {
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [loadingDrawing, setLoadingDrawing] = useState(true);
  const [errorDrawing, setErrorDrawing] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [initialDrawingElements, setInitialDrawingElements] = useState<DrawingElementType[]>([]);
  const [initialLastSavedAt, setInitialLastSavedAt] = useState<Date | null>(null);

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

        let elements: DrawingElementType[] = [];
        if (data.canvas_data) {
          try {
            const parsedCanvasData = JSON.parse(data.canvas_data);
            if (parsedCanvasData && Array.isArray(parsedCanvasData.elements)) {
              elements = parseRawElements(parsedCanvasData.elements);
            }
          } catch (parseError) {
            setErrorDrawing((parseError as Error).message);
          }
        }

        if (data.drawing_elements_after_save && Array.isArray(data.drawing_elements_after_save)) {
          const parsedNewElements: DrawingElementType[] = parseRawElements(data.drawing_elements_after_save);
          elements = [...elements, ...parsedNewElements];
        }

        setInitialDrawingElements(elements);
        setInitialLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
        setIsDirty(false);

      } catch (e: any) {
        setErrorDrawing(e.message);
      } finally {
        setLoadingDrawing(false);
      }
    };

    fetchDrawingData();
  }, [drawingId]);

  const handleSave = useCallback(async (currentDrawingElements: DrawingElementType[]) => {
    if (!drawingId || !isDirty) return;

    try {
      const canvasDataString = JSON.stringify(currentDrawingElements);

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
      // console.error("Failed to save drawing:", e);
    }
  }, [drawingId, isDirty]);

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
