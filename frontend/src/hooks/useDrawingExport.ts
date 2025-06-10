import { useState, useCallback, RefObject } from "react";

interface UseDrawingExportResult {
  isExportModalOpen: boolean;
  setIsExportModalOpen: (isOpen: boolean) => void;
  isExporting: boolean;
  exportError: string | null;
  handleExportClick: () => void;
  handleExport: (format: "png" | "jpeg", canvasRef: RefObject<HTMLCanvasElement | null>) => Promise<void>;
}

export const useDrawingExport = (): UseDrawingExportResult => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportClick = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleExport = useCallback(async (format: "png" | "jpeg", canvasRef: RefObject<HTMLCanvasElement | null>) => {
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
  }, []);

  return {
    isExportModalOpen,
    setIsExportModalOpen,
    isExporting,
    exportError,
    handleExportClick,
    handleExport,
  };
};
