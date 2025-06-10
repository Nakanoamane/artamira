import React from 'react';
import { TOOLS, ToolName } from '../../constants/tools';
import { ToolbarButton } from '../Toolbar'; // ToolbarButtonはToolbarから独立させず、Toolbar.tsxに留めるため、相対パスを調整

interface ToolSelectionGroupProps {
  activeTool: ToolName;
  setActiveTool: (tool: ToolName) => void;
}

const ToolSelectionGroup = ({ activeTool, setActiveTool }: ToolSelectionGroupProps) => {
  return (
    <div className="mb-4 mr-4">
      <label className="block text-sm font-medium text-flint-gray mb-2">ツール</label>
      <div className="flex gap-2">
        <ToolbarButton toolName={TOOLS.PEN} activeTool={activeTool} onToolChange={setActiveTool}>
          ペン
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.ERASER} activeTool={activeTool} onToolChange={setActiveTool}>
          消しゴム
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.LINE} activeTool={activeTool} onToolChange={setActiveTool}>
          直線
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.RECTANGLE} activeTool={activeTool} onToolChange={setActiveTool}>
          四角
        </ToolbarButton>
        <ToolbarButton toolName={TOOLS.CIRCLE} activeTool={activeTool} onToolChange={setActiveTool}>
          円
        </ToolbarButton>
      </div>
    </div>
  );
};

export default ToolSelectionGroup;
