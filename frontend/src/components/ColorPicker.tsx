import { useState, useRef, useEffect } from 'react'
import { HexColorInput, HexAlphaColorPicker } from 'react-colorful'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

const BASIC_COLORS = [
  '#FF0000FF', // 赤 (H:0)
  '#FF7700FF', // オレンジ
  '#FFFF00FF', // 黄 (H:60)
  '#AAFF00FF', // 黄緑
  '#00FF77FF', // 緑
  '#00FFFFFF', // シアン (H:180)
  '#0000FFFF', // 青 (H:240)
  '#7700FFFF', // 紫
  '#FF00FFFF', // マゼンタ (H:300)
  '#000000FF', // 黒
  '#FFFFFFFF', // 白
  '#808080FF', // 灰色
]

const MAX_HISTORY = 3

const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  const [isPickerVisible, setPickerVisible] = useState(false)
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const storedHistory = localStorage.getItem('colorHistory')
      return storedHistory ? JSON.parse(storedHistory) : []
    } catch (error) {
      console.error("Failed to parse color history from localStorage", error)
      return []
    }
  })
  const popoverRef = useRef<HTMLDivElement>(null)
  const prevIsPickerVisibleRef = useRef(isPickerVisible);

  const handleColorChange = (newColor: string) => {
    onChange(newColor)
  }

  const addColorToHistory = (newColor: string) => {
    setHistory((prevHistory) => {
      const updatedHistory = [newColor, ...prevHistory.filter((c) => c !== newColor)].slice(0, MAX_HISTORY)
      localStorage.setItem('colorHistory', JSON.stringify(updatedHistory))
      return updatedHistory
    })
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      setPickerVisible(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (prevIsPickerVisibleRef.current === true && !isPickerVisible) {
      addColorToHistory(color)
    }
    prevIsPickerVisibleRef.current = isPickerVisible;
  }, [isPickerVisible, color])

  return (
    <div className="relative flex flex-col items-center gap-2" ref={popoverRef}>
      <label htmlFor="color-picker-toggle" className="text-sm font-medium text-flint-gray">
        色を選択
      </label>
      <div
        id="color-picker-toggle"
        aria-label="色を選択トグル"
        className="w-12 h-12 rounded-lg border border-light-gray cursor-pointer shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: color }}
        onClick={() => {
          setPickerVisible(!isPickerVisible)
        }}
      ></div>

      {isPickerVisible && (
        <div className="absolute z-10 mt-20 p-4 bg-rock-linen rounded-lg shadow-xl border border-light-gray">
          <HexAlphaColorPicker color={color} onChange={handleColorChange} className="w-48 h-48" />

          <HexColorInput
            alpha
            className="w-full mt-2 p-2 border border-light-gray rounded-md text-center text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-cave-ochre"
            color={color}
            onChange={handleColorChange}
            data-testid="hex-color-input"
          />

          <div className="grid grid-cols-6 gap-1 mt-4">
            {BASIC_COLORS.map((basicColor) => (
              <button
                key={basicColor}
                className="w-6 h-6 rounded-full border border-light-gray cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-cave-ochre focus:ring-offset-2"
                style={{ backgroundColor: basicColor }}
                onClick={() => handleColorChange(basicColor)}
                aria-label={`基本色 ${basicColor}`}
              ></button>
            ))}
          </div>

          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-light-gray">
              <p className="text-xs text-medium-gray mb-2">最近使用した色:</p>
              <div className="flex gap-2">
                {history.map((hColor, index) => (
                  <button
                    key={index}
                    className="w-8 h-8 rounded-full border border-light-gray cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-cave-ochre focus:ring-offset-2"
                    style={{ backgroundColor: hColor }}
                    onClick={() => handleColorChange(hColor)}
                    data-testid={`history-color-button-${hColor}`}
                  ></button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ColorPicker
