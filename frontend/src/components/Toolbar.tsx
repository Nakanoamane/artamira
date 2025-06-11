import ColorPicker from './ColorPicker'
import { ToolName } from '../constants/tools'
import ToolSelectionGroup from './toolbar/ToolSelectionGroup'
import ActionButtons from './toolbar/ActionButtons'
import HistoryButtons from './toolbar/HistoryButtons'

interface ToolbarProps {
  activeTool: string
  activeColor: string
  activeBrushSize: number
  setActiveTool: (tool: string) => void
  setActiveColor: (color: string) => void
  setActiveBrushSize: (size: number) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  isDirty: boolean
  onExportClick: () => void
}

interface ToolbarButtonProps {
  toolName: ToolName
  activeTool: string
  onToolChange: (tool: ToolName) => void
  children: React.ReactNode
}

export const ToolbarButton = ({ toolName, activeTool, onToolChange, children }: ToolbarButtonProps) => {
  const isActive = activeTool === toolName
  const className = `px-4 py-2 rounded-md ${
    isActive ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-flint-gray hover:bg-light-cave-ochre hover:text-clay-white'
  }`

  return (
    <button className={className} onClick={() => onToolChange(toolName)}>
      {children}
    </button>
  )
}

const Toolbar = ({
  activeTool,
  activeColor,
  activeBrushSize,
  setActiveTool,
  setActiveColor,
  setActiveBrushSize,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  isDirty,
  onExportClick,
}: ToolbarProps) => {
  return (
    <div className="flex flex-row items-start m-2 p-4 bg-clay-white shadow-md rounded-lg justify-center flex-wrap">

      <ToolSelectionGroup activeTool={activeTool as ToolName} setActiveTool={setActiveTool as (tool: ToolName) => void} />

      <ActionButtons onSave={onSave} isDirty={isDirty} onExportClick={onExportClick} />

      <HistoryButtons onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />

      {/* カラーピッカー */}
      <div className="mb-4 mr-4">
        <ColorPicker color={activeColor} onChange={setActiveColor} />
      </div>

      {/* ブラシサイズ選択 */}
      <div className="mb-4">
        <label htmlFor="brush-size" className="block text-sm font-medium text-flint-gray mb-2">
          ブラシサイズ: {activeBrushSize}px
        </label>
        <input
          id="brush-size"
          type="range"
          min="1"
          max="100"
          value={activeBrushSize}
          onChange={(e) => setActiveBrushSize(Number(e.target.value))}
          className="w-32 h-2 bg-light-gray rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  )
}

export default Toolbar
