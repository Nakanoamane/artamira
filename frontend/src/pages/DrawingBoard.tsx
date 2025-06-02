import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Canvas, { DrawingElementType, LineElement, RectElement, CircleElement } from '../components/Canvas'
import Toolbar from '../components/Toolbar'
// import ColorPicker from '../components/ColorPicker'
// import BrushSizeSelector from '../components/BrushSizeSelector'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDrawingChannel } from '../hooks/useDrawingChannel'
import { useParams } from 'react-router-dom'

interface Drawing {
  id: number;
  title: string;
}

const DrawingBoard = () => {
  const navigate = useNavigate()
  const [activeTool, setActiveTool] = useState('pen')
  const [activeColor, setActiveColor] = useState('#000000')
  const [activeBrushSize, setActiveBrushSize] = useState(2)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingElements, setDrawingElements] = useState<DrawingElementType[]>([])
  const [undoStack, setUndoStack] = useState<DrawingElementType[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingElementType[][]>([])
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [loadingDrawing, setLoadingDrawing] = useState(true)
  const [errorDrawing, setErrorDrawing] = useState<string | null>(null)
  const [actionCableError, setActionCableError] = useState<string | null>(null)

  // Undo/Redo Functions
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      const newUndoStack = [...prev];
      const lastState = newUndoStack.pop(); // 最後の状態を取り出す

      if (lastState) {
        setRedoStack((redoPrev) => [...redoPrev, drawingElements]); // 現在の状態をredoStackに保存
        setDrawingElements(lastState); // 描画要素を元に戻す
      }
      return newUndoStack;
    });
  }, [drawingElements]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      const newRedoStack = [...prev];
      const nextState = newRedoStack.pop(); // 次の状態を取り出す

      if (nextState) {
        setUndoStack((undoPrev) => [...undoPrev, drawingElements]); // 現在の状態をundoStackに保存
        setDrawingElements(nextState); // 描画要素を進める
      }
      return newRedoStack;
    });
  }, [drawingElements]);

  const handleReceivedData = useCallback((receivedActionCableData: any) => {
    // Action Cableからデータを受信した際の処理
    // サーバーから送られてくるデータ形式に合わせてパースし、drawingElementsに追加
    console.log('DEBUG: handleReceivedData received:', receivedActionCableData);
    if (receivedActionCableData.type === 'drawing_element_created' && receivedActionCableData.drawing_element) {
      const { element_type, data: drawingElementData } = receivedActionCableData.drawing_element;
      const receivedElementId = drawingElementData.id; // 受信した要素のID

      // 受信した要素が既にローカルに存在するかチェック
      if (receivedElementId && drawingElements.some(el => el.id === receivedElementId)) {
        console.log('DEBUG: Received element already exists locally, skipping:', receivedElementId);
        return; // 既にローカルにある場合は何もしない
      }

      let receivedElement: DrawingElementType | null = null;

      if (element_type === 'line') {
        receivedElement = {
          id: receivedElementId, // IDを付与
          type: 'line',
          points: drawingElementData.path.map((p: [number, number]) => ({ x: p[0], y: p[1] })),
          color: drawingElementData.color,
          brushSize: drawingElementData.lineWidth,
        };
      } else if (element_type === 'rectangle') {
        receivedElement = {
          id: receivedElementId, // IDを付与
          type: 'rectangle',
          start: { x: drawingElementData.start.x, y: drawingElementData.start.y },
          end: { x: drawingElementData.end.x, y: drawingElementData.end.y },
          color: drawingElementData.color,
          brushSize: drawingElementData.lineWidth,
        };
      } else if (element_type === 'circle') {
        receivedElement = {
          id: receivedElementId, // IDを付与
          type: 'circle',
          center: { x: drawingElementData.center.x, y: drawingElementData.center.y },
          radius: drawingElementData.radius,
          color: drawingElementData.color,
          brushSize: drawingElementData.lineWidth,
        };
      }

      if (receivedElement) {
        // Action Cable経由で受信した要素は、drawingElementsに追加する前にundoStackに現在の状態を保存
        setUndoStack((prev) => [...prev, drawingElements])
        setRedoStack([])
        setDrawingElements((prev) => [...prev, receivedElement]);
      }
    }
  }, [drawingElements])

  const { id: drawingIdParam } = useParams<{ id: string }>()
  const drawingId = drawingIdParam ? parseInt(drawingIdParam, 10) : undefined

  const { channel, status } = useDrawingChannel('DrawingChannel', drawingId, handleReceivedData)

  usePageTitle(drawing ? drawing.title : '描画ボード')

  useEffect(() => {
    const fetchDrawing = async () => {
      if (!drawingId) {
        setErrorDrawing('描画ボードIDが指定されていません。')
        setLoadingDrawing(false)
        return
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setDrawing(data)
      } catch (e: any) {
        setErrorDrawing(e.message)
      } finally {
        setLoadingDrawing(false)
      }
    }

    fetchDrawing()
  }, [drawingId])

  useEffect(() => {
    // TODO: 認証チェック
    // const token = localStorage.getItem('token')
    // if (!token) {
    //   navigate('/login')
    // }
  }, [navigate])

  const handleDrawComplete = (newElement: DrawingElementType) => {
    // 描画完了時にAction Cable経由でデータを送信
    // まずローカルの状態を更新し、ちらつきを防止
    setUndoStack((prev) => [...prev, drawingElements]) // undoStackに現在の状態を保存
    setRedoStack([]) // 新しい描画があればredoStackをクリア
    setDrawingElements((prev) => [...prev, newElement]) // ローカルに即座に描画

    if (channel && status.isConnected) {
      let elementDataToSend: any;
      if (newElement.type === 'line') {
        elementDataToSend = {
          id: newElement.id, // IDを含める
          path: newElement.points.map(p => [p.x, p.y]),
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      } else if (newElement.type === 'rectangle') {
        elementDataToSend = {
          id: newElement.id, // IDを含める
          start: newElement.start,
          end: newElement.end,
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      } else if (newElement.type === 'circle') {
        elementDataToSend = {
          id: newElement.id, // IDを含める
          center: newElement.center,
          radius: newElement.radius,
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      }

      // Action Cableで送信する際は、履歴の管理はhandleReceivedDataに任せる
      channel.perform('draw', {
        element_type: newElement.type,
        element_data: elementDataToSend,
      })
      setActionCableError(null); // 送信成功時はエラーをクリア
    } else {
      console.warn('WebSocket接続が確立されていないため、描画データを送信できません。')
      setActionCableError('描画データを送信できません。WebSocket接続が確立されていません。');
      // 送信できなかった場合は、ローカルにのみ追加し、すでにローカルに追加済みなので何もしない
    }
  }

  if (loadingDrawing) {
    return <div className="text-center mt-8">描画ボードを読み込み中...</div>
  }

  if (errorDrawing) {
    return <div className="text-center mt-8 text-red-500">エラー: {errorDrawing}</div>
  }

  if (!drawing) {
    return <div className="text-center mt-8">描画ボードが見つかりません。</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">{drawing.title}</h1>
      {actionCableError && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4 text-center">
          {actionCableError}
        </div>
      )}
      <div className="flex flex-col items-center gap-4">
        <Toolbar
          activeTool={activeTool}
          activeColor={activeColor}
          activeBrushSize={activeBrushSize}
          onToolChange={setActiveTool}
          onColorChange={setActiveColor}
          onBrushSizeChange={setActiveBrushSize}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
        />
        <Canvas
          activeTool={activeTool}
          color={activeColor}
          brushSize={activeBrushSize}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          onDrawComplete={handleDrawComplete}
          drawingElementsToRender={drawingElements}
          status={status}
        />
      </div>
    </div>
  )
}

export default DrawingBoard
