import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import Canvas, { DrawingElementType } from '../components/Canvas'
import Toolbar from '../components/Toolbar'
import ExportModal from '../components/ExportModal'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDrawingChannel } from '../hooks/useDrawingChannel'
import { useParams } from 'react-router'
import { useHeader } from '../contexts/HeaderContext'

interface Drawing {
  id: number;
  title: string;
  last_saved_at?: string;
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
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { id } = useParams<{ id: string }>()
  const { setCompactHeader } = useHeader()

  useEffect(() => {
    setCompactHeader(true)
    return () => {
      setCompactHeader(false)
    }
  }, [setCompactHeader])

  // Undo/Redo Functions
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      const newUndoStack = [...prev];
      const lastState = newUndoStack.pop(); // 最後の状態を取り出す

      if (lastState) {
        setRedoStack((redoPrev) => [...redoPrev, drawingElements]); // 現在の状態をredoStackに保存
        setDrawingElements(lastState); // 描画要素を元に戻す
        setIsDirty(true); // UndoでもDirtyになる
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
        setIsDirty(true); // RedoでもDirtyになる
      }
      return newRedoStack;
    });
  }, [drawingElements]);

  const handleReceivedData = useCallback((receivedActionCableData: any) => {
    if (receivedActionCableData.type === 'drawing_element_created' && receivedActionCableData.drawing_element) {
      const { element_type, data: drawingElementData } = receivedActionCableData.drawing_element;
      const receivedElementId = drawingElementData.id;

      if (receivedElementId && drawingElements.some(el => el.id === receivedElementId)) {
        return;
      }

      let receivedElement: DrawingElementType | null = null;

      if (element_type === 'line') {
        receivedElement = {
          id: receivedElementId,
          type: 'line',
          points: drawingElementData.path.map((p: [number, number]) => ({ x: p[0], y: p[1] })),
          color: drawingElementData.color,
          brushSize: drawingElementData.lineWidth,
        };
      } else if (element_type === 'rectangle') {
        receivedElement = {
          id: receivedElementId,
          type: 'rectangle',
          start: { x: drawingElementData.start.x, y: drawingElementData.start.y },
          end: { x: drawingElementData.end.x, y: drawingElementData.end.y },
          color: drawingElementData.color,
          brushSize: drawingElementData.lineWidth,
        };
      } else if (element_type === 'circle') {
        receivedElement = {
          id: receivedElementId,
          type: 'circle',
          center: { x: drawingElementData.center.x, y: drawingElementData.center.y },
          radius: drawingElementData.radius,
          color: drawingElementData.color,
          brushSize: drawingElementData.lineWidth,
        };
      }

      if (receivedElement) {
        setUndoStack((prev) => [...prev, drawingElements])
        setRedoStack([])
        setDrawingElements((prev) => [...prev, receivedElement]);
        setIsDirty(true); // 他のユーザーからの描画でもDirtyになる
      }
    } else if (receivedActionCableData.type === 'drawing_saved' && receivedActionCableData.drawing_id === drawing?.id) {
      // 保存完了通知を受信した場合
      setIsDirty(false);
      setLastSavedAt(receivedActionCableData.last_saved_at ? new Date(receivedActionCableData.last_saved_at) : null);
    }
  }, [drawingElements, drawing?.id]);

  const drawingId = id ? parseInt(id, 10) : undefined

  const { channel, status } = useDrawingChannel('DrawingChannel', drawingId, handleReceivedData)

  usePageTitle(drawing ? drawing.title : '描画ボード')

  useEffect(() => {
    const fetchDrawingData = async () => {
      if (!drawingId) {
        setErrorDrawing('描画ボードIDが指定されていません。')
        setLoadingDrawing(false)
        return
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}/elements`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        // Drawingモデルのタイトルも取得できるように変更
        setDrawing({ id: drawingId, title: data.drawing_title || '無題のボード' });
        setDrawingElements(data.drawing_elements || []);
        setLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
        setIsDirty(false); // 初期ロード時はDirtyではない
      } catch (e: any) {
        setErrorDrawing(e.message)
      } finally {
        setLoadingDrawing(false)
      }
    }

    fetchDrawingData()
  }, [drawingId])

  useEffect(() => {
    // TODO: 認証チェック
  }, [navigate])

  const handleDrawComplete = (newElement: DrawingElementType) => {
    setUndoStack((prev) => [...prev, drawingElements])
    setRedoStack([])
    setDrawingElements((prev) => [...prev, newElement])
    setIsDirty(true); // 描画操作でDirtyにする

    if (channel && status.isConnected) {
      let elementDataToSend: any;
      if (newElement.type === 'line') {
        elementDataToSend = {
          id: newElement.id,
          path: newElement.points.map(p => [p.x, p.y]),
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      } else if (newElement.type === 'rectangle') {
        elementDataToSend = {
          id: newElement.id,
          start: newElement.start,
          end: newElement.end,
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      } else if (newElement.type === 'circle') {
        elementDataToSend = {
          id: newElement.id,
          center: newElement.center,
          radius: newElement.radius,
          color: newElement.color,
          lineWidth: newElement.brushSize,
        };
      }

      channel.perform('draw', {
        element_type: newElement.type,
        element_data: elementDataToSend,
      })
      setActionCableError(null);
    } else {
      console.warn('WebSocket接続が確立されていないため、描画データを送信できません。')
      setActionCableError('描画データを送信できません。WebSocket接続が確立されていません。');
    }
  }

  const handleSave = async () => {
    if (!drawingId || !isDirty) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings/${drawingId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsDirty(false);
      setLastSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
      console.log('Drawing saved successfully:', data);
    } catch (e: any) {
      console.error('Failed to save drawing:', e);
      // エラーメッセージをユーザーに表示するなどの処理
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const handleCloseExportModal = () => {
    setIsExportModalOpen(false);
  };

  const handleExport = (format: 'png' | 'jpeg') => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const image = canvas.toDataURL(`image/${format}`);
    const link = document.createElement('a');
    link.href = image;
    link.download = `${drawing?.title || 'untitled'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="flex justify-between items-center mb-3 px-8">
        <h1 className="text-2xl font-bold text-light-cave-ochre">{drawing.title}</h1>
        <div className="flex items-center gap-2 text-right min-h-[48px]">
          {isDirty && (
            <div className="text-orange-500 text-xs">未保存の変更があります</div>
          )}
          {lastSavedAt && (
            <div className="text-gray-500 text-xs">
              最終保存: {lastSavedAt ? lastSavedAt.toLocaleString('ja-JP', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false, // 24時間表記
              }) : 'まだ保存されていません'}
            </div>
          )}
        </div>
      </div>
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
          onSave={handleSave}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          onExportClick={handleExportClick}
        />
        <Canvas
          ref={canvasRef}
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
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={handleCloseExportModal}
        onExport={handleExport}
      />
    </div>
  )
}

export default DrawingBoard
