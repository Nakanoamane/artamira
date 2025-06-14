import { forwardRef, useEffect, useRef, useState, useCallback } from 'react'
import { Point, DrawingElementType } from "../utils/drawingElementsParser";
import { drawAllElements } from '../utils/canvasDrawing';

export interface CanvasProps {
  drawingElements: DrawingElementType[];
  activeTool: string;
  activeColor: string;
  activeBrushSize: number;
  onDrawComplete: (drawingElement: DrawingElementType) => void;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ activeTool, activeColor, activeBrushSize, onDrawComplete, drawingElements }, ref) => {
    const canvasRefObject = ref as React.RefObject<HTMLCanvasElement>;

    const [isDrawing, setIsDrawing] = useState(false);
    const prevPointRef = useRef<Point | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const [tempDrawingElement, setTempDrawingElement] = useState<DrawingElementType | null>(null);
    const drawingCompletedRef = useRef(false);

    // Canvasの初期設定 (幅/高さ、コンテキスト設定) は一度だけ実行されるべき
    useEffect(() => {
      const canvas = canvasRefObject.current;
      if (!canvas) return;

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, [canvasRefObject]);

    // 描画要素の更新時の描画
    useEffect(() => {
      const canvas = canvasRefObject.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawAllElements(ctx, canvas, drawingElements, tempDrawingElement);
    }, [drawingElements, tempDrawingElement, canvasRefObject]);

    // イベントハンドラーをuseCallbackでラップし、依存配列を適切に設定
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      drawingCompletedRef.current = false;
      const canvas = canvasRefObject.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      prevPointRef.current = point;

      if (activeTool === 'pen' || activeTool === 'eraser') {
        setTempDrawingElement({
          type: 'line',
          id: undefined,
          temp_id: `temp-${Date.now()}`,
          points: [point],
          color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
          brushSize: activeBrushSize,
        });
      }
    }, [activeTool, activeColor, activeBrushSize, canvasRefObject]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRefObject.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (prevPointRef.current) {
        if (activeTool === 'pen' || activeTool === 'eraser') {
          setTempDrawingElement((prevTemp) => {
            if (prevTemp && prevTemp.type === 'line') {
              const newPoints = [...prevTemp.points, currentPoint];
              return {
                ...prevTemp,
                points: newPoints,
              };
            }
            return {
              type: 'line',
              id: undefined,
              temp_id: `temp-${Date.now()}`,
              points: [prevPointRef.current!, currentPoint],
              color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
              brushSize: activeBrushSize,
            };
          });
          prevPointRef.current = currentPoint;

          if (animationFrameId.current === null) {
            animationFrameId.current = requestAnimationFrame(() => {
              const canvas = canvasRefObject.current;
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              drawAllElements(ctx, canvas, drawingElements, tempDrawingElement);
              animationFrameId.current = null;
            });
          }
        } else if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
          let newTempElement: DrawingElementType | null = null;
          if (activeTool === 'line') {
            newTempElement = {
              type: 'line',
              id: undefined,
              temp_id: `temp-${Date.now()}`,
              points: [prevPointRef.current!, currentPoint],
              color: activeColor,
              brushSize: activeBrushSize,
            };
          } else if (activeTool === 'rectangle') {
            newTempElement = {
              type: 'rectangle',
              id: undefined,
              temp_id: `temp-${Date.now()}`,
              start: prevPointRef.current!,
              end: currentPoint,
              color: activeColor,
              brushSize: activeBrushSize,
            };
          } else if (activeTool === 'circle') {
            const radius = Math.sqrt(
              Math.pow(currentPoint.x - prevPointRef.current!.x, 2) +
              Math.pow(currentPoint.y - prevPointRef.current!.y, 2)
            );
            newTempElement = {
              type: 'circle',
              id: undefined,
              temp_id: `temp-${Date.now()}`,
              center: prevPointRef.current!,
              radius,
              color: activeColor,
              brushSize: activeBrushSize,
            };
          }
          setTempDrawingElement(newTempElement);

          if (animationFrameId.current === null) {
            animationFrameId.current = requestAnimationFrame(() => {
              const canvas = canvasRefObject.current;
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              drawAllElements(ctx, canvas, drawingElements, tempDrawingElement);
              animationFrameId.current = null;
            });
          }
        }
      }
    }, [isDrawing, activeTool, activeColor, activeBrushSize, canvasRefObject, prevPointRef, drawingElements, tempDrawingElement]);

    const handleMouseUp = useCallback(() => {
      setIsDrawing(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (tempDrawingElement && !drawingCompletedRef.current) {
        console.trace("[Canvas] handleMouseUp: Calling onDrawComplete.");
        onDrawComplete(tempDrawingElement);
        drawingCompletedRef.current = true;
        setTempDrawingElement(null);
      }
      prevPointRef.current = null;
    }, [onDrawComplete, tempDrawingElement]);

    const handleMouseLeave = useCallback(() => {
      if (isDrawing) {
        setIsDrawing(false);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
        if (tempDrawingElement && !drawingCompletedRef.current) {
          console.trace("[Canvas] handleMouseLeave: Calling onDrawComplete.");
          onDrawComplete(tempDrawingElement);
          drawingCompletedRef.current = true;
          setTempDrawingElement(null);
        }
        prevPointRef.current = null;
      }
    }, [isDrawing, onDrawComplete, tempDrawingElement]);

    return (
      <div className="relative bg-clay-white px-4" style={{ width: CANVAS_WIDTH + 32, height: CANVAS_HEIGHT }}>
        <div className="bg-white" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={canvasRefObject}
            data-testid="drawing-canvas"
            className="border border-gray-300 shadow-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              cursor: isDrawing ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
          />
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas'

export default Canvas
