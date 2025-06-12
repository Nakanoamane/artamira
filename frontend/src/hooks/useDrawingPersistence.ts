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
        console.log("[useDrawingPersistence - fetchDrawingData] Received canvas_data:", data.canvas_data ? "exists" : "null", "drawing_elements_after_save:", data.drawing_elements_after_save ? data.drawing_elements_after_save.length : "null");

        if (data.canvas_data) {
          try {
            const parsedCanvasData = JSON.parse(data.canvas_data);
            console.log("[useDrawingPersistence - fetchDrawingData] Parsed canvas_data. Type:", typeof parsedCanvasData, "Length:", Array.isArray(parsedCanvasData) ? parsedCanvasData.length : (parsedCanvasData && parsedCanvasData.elements ? parsedCanvasData.elements.length : 0));

            // canvas_dataが DrawingElementType[] のJSON文字列として保存されている場合
            if (Array.isArray(parsedCanvasData) && parsedCanvasData.length > 0 && ('type' in parsedCanvasData[0] || 'element_type' in parsedCanvasData[0])) {
              // そのままparseRawElementsに渡す（RawDrawingElement[] も処理できるように）
              elements = parseRawElements(parsedCanvasData);
            } else if (parsedCanvasData && Array.isArray(parsedCanvasData.elements) && parsedCanvasData.elements.length > 0) {
              // elementsプロパティを持つオブジェクトの場合
              elements = parseRawElements(parsedCanvasData.elements);
            } else {
              elements = [];
            }
          } catch (parseError) {
            setErrorDrawing(`canvas_dataのパースに失敗しました: ${(parseError as Error).message}`);
          }
        }

        if (data.drawing_elements_after_save && Array.isArray(data.drawing_elements_after_save)) {
          console.log("[useDrawingPersistence - fetchDrawingData] Processing drawing_elements_after_save. Count:", data.drawing_elements_after_save.length);
          const parsedNewElements: DrawingElementType[] = parseRawElements(data.drawing_elements_after_save);
          elements = [...elements, ...parsedNewElements];
        }
        console.log("[useDrawingPersistence - fetchDrawingData] Final initialDrawingElements length after combining:", elements.length);
        setInitialDrawingElements(elements);
        setInitialLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
        setIsDirty(false);

      } catch (e: any) {
        setErrorDrawing(`描画データの読み込みに失敗しました: ${e.message}`);
      } finally {
        setLoadingDrawing(false);
      }
    };

    console.log("[useDrawingPersistence - useEffect] Fetching drawing data for ID:", drawingId);
    fetchDrawingData();
  }, [drawingId]);

  const handleSave = useCallback(async (currentDrawingElements: DrawingElementType[]) => {
    console.log("[useDrawingPersistence - handleSave] Attempting to save drawing.");
    if (drawingId === undefined) {
      console.log("[useDrawingPersistence - handleSave] No drawing ID, skipping save.");
      return;
    }
    if (!isDirty) {
      console.log("[useDrawingPersistence - handleSave] Not dirty, skipping save.");
      return;
    }

    try {
      console.log("[useDrawingPersistence - handleSave] Saving currentDrawingElements length:", currentDrawingElements.length);

      // 保存する前にtemp_idを削除した新しい配列を作成
      const elementsToSave = currentDrawingElements.map(element => {
        const newElement = { ...element };
        // temp_idがあれば削除する
        if (newElement.temp_id !== undefined) {
          delete newElement.temp_id;
        }
        return newElement;
      });

      // 最初の2つの要素のidとtemp_idをログ出力
      if (elementsToSave.length > 0) {
        console.log("[useDrawingPersistence - handleSave] First element to save:", elementsToSave[0].id, elementsToSave[0].temp_id);
      }
      if (elementsToSave.length > 1) {
        console.log("[useDrawingPersistence - handleSave] Second element to save:", elementsToSave[1].id, elementsToSave[1].temp_id);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ canvas_data: JSON.stringify(elementsToSave) }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. Body: ${errorText}`);
      }

      const data = await response.json();
      console.log("[useDrawingPersistence - handleSave] Save successful. Received data:", data);
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
