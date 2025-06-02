import React, { useState, useRef, useEffect } from 'react'
import { HexColorPicker, HexColorInput, HexAlphaColorPicker } from 'react-colorful'

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
  const prevIsPickerVisibleRef = useRef(isPickerVisible); // isPickerVisible の以前の値を追跡

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
    // isPickerVisible が true -> false に変わったときにのみ履歴を更新
    if (prevIsPickerVisibleRef.current === true && !isPickerVisible) {
      addColorToHistory(color)
    }
    prevIsPickerVisibleRef.current = isPickerVisible; // 現在の isPickerVisible を保存
  }, [isPickerVisible, color])

  return (
    <div className="relative flex flex-col items-center gap-2" ref={popoverRef}>
      <label htmlFor="color-picker-toggle" className="text-sm font-medium text-gray-700">
        色を選択
      </label>
      <div
        id="color-picker-toggle"
        aria-label="色を選択トグル"
        className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: color }}
        onClick={() => setPickerVisible(!isPickerVisible)}
      ></div>

      {isPickerVisible && (
        <div className="absolute z-10 mt-20 p-4 bg-white rounded-lg shadow-xl border border-gray-200">
          {/* カラーピッカー（Alpha対応） */}
          <HexAlphaColorPicker color={color} onChange={handleColorChange} className="w-48 h-48" />

          {/* HEXコード入力欄 */}
          <HexColorInput
            alpha
            className="w-full mt-2 p-2 border border-gray-300 rounded-md text-center text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
            color={color}
            onChange={handleColorChange}
          />

          {/* 基本色選択ボタン */}
          <div className="grid grid-cols-6 gap-1 mt-4">
            {BASIC_COLORS.map((basicColor) => (
              <button
                key={basicColor}
                className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ backgroundColor: basicColor }}
                onClick={() => handleColorChange(basicColor)}
              ></button>
            ))}
          </div>

          {/* 履歴色表示 */}
          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">最近使用した色:</p>
              <div className="flex gap-2">
                {history.map((histColor) => (
                  <button
                    key={histColor}
                    className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ backgroundColor: histColor }}
                    onClick={() => handleColorChange(histColor)}
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
