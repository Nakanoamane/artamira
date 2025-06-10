import { useState } from 'react';

interface UseDrawingToolsResult {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  activeBrushSize: number;
  setActiveBrushSize: (size: number) => void;
}

export const useDrawingTools = (): UseDrawingToolsResult => {
  const [activeTool, setActiveTool] = useState("pen");
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeBrushSize, setActiveBrushSize] = useState(2);

  return {
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    activeBrushSize,
    setActiveBrushSize,
  };
};
