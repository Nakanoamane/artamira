import ColorPicker from './ColorPicker'

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
  toolName: string
  activeTool: string
  onToolChange: (tool: string) => void
  children: React.ReactNode
}

const ToolbarButton = ({ toolName, activeTool, onToolChange, children }: ToolbarButtonProps) => {
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

      {/* ツール選択 */}
      <div className="mb-4 mr-4">
        <label className="block text-sm font-medium text-flint-gray mb-2">ツール</label>
        <div className="flex gap-2">
          <ToolbarButton toolName="pen" activeTool={activeTool} onToolChange={setActiveTool}>
            ペン
          </ToolbarButton>
          <ToolbarButton toolName="eraser" activeTool={activeTool} onToolChange={setActiveTool}>
            消しゴム
          </ToolbarButton>
          <ToolbarButton toolName="line" activeTool={activeTool} onToolChange={setActiveTool}>
            直線
          </ToolbarButton>
          <ToolbarButton toolName="rectangle" activeTool={activeTool} onToolChange={setActiveTool}>
            四角
          </ToolbarButton>
          <ToolbarButton toolName="circle" activeTool={activeTool} onToolChange={setActiveTool}>
            円
          </ToolbarButton>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="mb-4 mr-4">
        <label className="block text-sm font-medium text-flint-gray mb-2">操作</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${isDirty ? 'bg-stone-blue text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
            onClick={onSave}
            disabled={!isDirty}
          >
            保存 {isDirty && '*'}
          </button>
          <button
            className="px-4 py-2 rounded-md border-2 border-stone-blue text-flint-gray hover:bg-stone-blue hover:text-clay-white"
            onClick={onExportClick}
          >
            エクスポート
          </button>
        </div>
      </div>

      {/* アンドゥ/リドゥボタン */}
      <div className="mb-4 mr-4">
        <label className="block text-sm font-medium text-flint-gray mb-2">履歴</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${canUndo ? 'bg-moss-green text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
            onClick={onUndo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            className={`px-4 py-2 rounded-md ${canRedo ? 'bg-moss-green text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
            onClick={onRedo}
            disabled={!canRedo}
          >
            Redo
          </button>
        </div>
      </div>

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
