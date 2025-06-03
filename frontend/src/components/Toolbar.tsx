import React from 'react'
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
    <div className="flex flex-col items-center p-4 bg-white shadow-md rounded-lg">
      <h3 className="text-lg font-semibold mb-4">ツールバー</h3>

      {/* ツール選択 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">ツール</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => onToolChange('pen')}
          >
            ペン
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => onToolChange('eraser')}
          >
            消しゴム
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => onToolChange('line')}
          >
            直線
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => onToolChange('rectangle')}
          >
            四角
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => onToolChange('circle')}
          >
            円
          </button>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">操作</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${isSaveEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            onClick={onSave}
            disabled={!isSaveEnabled}
          >
            保存
          </button>
          <button
            className="px-4 py-2 rounded-md bg-purple-500 text-white hover:bg-purple-600"
            onClick={onExportClick}
          >
            エクスポート
          </button>
        </div>
      </div>

      {/* アンドゥ/リドゥボタン */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">履歴</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md ${canUndo ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            onClick={onUndo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            className={`px-4 py-2 rounded-md ${canRedo ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            onClick={onRedo}
            disabled={!canRedo}
          >
            Redo
          </button>
        </div>
      </div>

      {/* カラーピッカー */}
      <div className="mb-4">
        <ColorPicker color={activeColor} onChange={onColorChange} />
      </div>

      {/* ブラシサイズ選択 */}
      <div className="mb-4">
        <label htmlFor="brush-size" className="block text-sm font-medium text-gray-700 mb-2">
          ブラシサイズ: {activeBrushSize}px
        </label>
        <input
          id="brush-size"
          type="range"
          min="1"
          max="100"
          value={activeBrushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  )
}

export default Toolbar
