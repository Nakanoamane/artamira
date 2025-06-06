import ColorPicker from './ColorPicker'

interface ToolbarProps {
  activeTool: string
  activeColor: string
  activeBrushSize: number
  onToolChange: (tool: string) => void
  onColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  isSaveEnabled: boolean
  onExportClick: () => void
}

const Toolbar = ({
  activeTool,
  activeColor,
  activeBrushSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  isSaveEnabled,
  onExportClick,
}: ToolbarProps) => {
  return (
    <div className="flex flex-row items-start p-4 bg-clay-white shadow-md rounded-lg justify-center flex-wrap">
      <h3 className="text-lg font-semibold mb-4 mr-4">ツールバー</h3>

      {/* ツール選択 */}
      <div className="mb-4 mr-4">
        <label className="block text-sm font-medium text-flint-gray mb-2">ツール</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'pen' ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-flint-gray'
            }`}
            onClick={() => onToolChange('pen')}
          >
            ペン
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'eraser' ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-flint-gray'
            }`}
            onClick={() => onToolChange('eraser')}
          >
            消しゴム
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'line' ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-flint-gray'
            }`}
            onClick={() => onToolChange('line')}
          >
            直線
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'rectangle' ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-flint-gray'
            }`}
            onClick={() => onToolChange('rectangle')}
          >
            四角
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'circle' ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-flint-gray'
            }`}
            onClick={() => onToolChange('circle')}
          >
            円
          </button>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="mb-4 mr-4">
        <label className="block text-sm font-medium text-flint-gray mb-2">操作</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${isSaveEnabled ? 'bg-stone-blue text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
            onClick={onSave}
            disabled={!isSaveEnabled}
          >
            保存
          </button>
          <button
            className="px-4 py-2 rounded-md bg-stone-blue text-clay-white hover:bg-dark-stone-blue"
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
        <ColorPicker color={activeColor} onChange={onColorChange} />
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
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-32 h-2 bg-light-gray rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  )
}

export default Toolbar
