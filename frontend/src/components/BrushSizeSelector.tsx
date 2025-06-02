interface BrushSizeSelectorProps {
  size: number
  onChange: (size: number) => void
}

const BrushSizeSelector = ({ size, onChange }: BrushSizeSelectorProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor="brush-size" className="text-sm font-medium text-gray-700">
        ブラシサイズ: {size}px
      </label>
      <input
        id="brush-size"
        type="range"
        min="1"
        max="20"
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )
}

export default BrushSizeSelector
