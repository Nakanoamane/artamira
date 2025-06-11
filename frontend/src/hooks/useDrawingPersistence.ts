import { useState, useEffect, useCallback } from "react";
import { DrawingElementType, parseRawElements } from "../utils/drawingElementsParser";

interface Drawing {
  id: number;
  title: string;
}

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
        if (data.canvas_data) {
          try {
            const parsedCanvasData = JSON.parse(data.canvas_data);
            if (Array.isArray(parsedCanvasData) && parsedCanvasData.length > 0 && 'type' in parsedCanvasData[0]) {
              elements = parsedCanvasData as DrawingElementType[];
            } else if (Array.isArray(parsedCanvasData.elements) && parsedCanvasData.elements.length > 0) {
              elements = parseRawElements(parsedCanvasData.elements);
            } else {
              elements = [];
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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. Body: ${errorText}`);
      }

      const data = await response.json();
      setIsDirty(false);
      setLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
    } catch (e: any) {
      setErrorDrawing(`描画の保存に失敗しました: ${e.message}`);
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
