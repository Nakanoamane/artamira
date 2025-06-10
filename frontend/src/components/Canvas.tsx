import { forwardRef, useEffect, useRef, useCallback, useState } from 'react'

interface Point {
  x: number
  y: number
}

export interface LineElement {
  id?: string
  type: 'line'
  points: Point[] // [start, end]
  color: string
  brushSize: number
}

export interface RectElement {
  id?: string
  type: 'rectangle'
  start: Point
  end: Point
  color: string
  brushSize: number
}

export interface CircleElement {
  id?: string
  type: 'circle'
  center: Point
  radius: number
  color: string
  brushSize: number
}

export type DrawingElementType = LineElement | RectElement | CircleElement

export interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  drawingElements: DrawingElementType[];
  setDrawingElements: React.Dispatch<React.SetStateAction<DrawingElementType[]>>;
  activeTool: string;
  activeColor: string;
  activeBrushSize: number;
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  onDrawComplete: (drawingElement: DrawingElementType) => void;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ activeTool, activeColor, activeBrushSize, isDrawing, setIsDrawing, onDrawComplete, canvasRef, drawingElements }) => {
    const localCanvasRef = canvasRef; // Propとして渡されたrefを使用
    const prevPointRef = useRef<Point | null>(null);
    const animationFrameId = useRef<number | null>(null); // requestAnimationFrame のIDを保持
    const [tempDrawingElement, setTempDrawingElement] = useState<DrawingElementType | null>(null); // 仮描画要素の状態

    useEffect(() => {
      const canvas = localCanvasRef.current;
      if (!canvas) return;

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, [localCanvasRef]);

    useEffect(() => {
      const canvas = localCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawingElements.forEach((element) => {
        drawElement(ctx, element);
      });

      // 仮描画要素があれば描画
      if (tempDrawingElement) {
        drawElement(ctx, tempDrawingElement);
      }
    }, [drawingElements, tempDrawingElement, localCanvasRef]);

    const drawElement = (
      ctx: CanvasRenderingContext2D,
      element: DrawingElementType
    ) => {
      try {
        ctx.beginPath();
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.brushSize;

        if (element.type === 'line' && element.color === '#FFFFFF') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
        }

        if (element.type === 'line') {
          if (element.points.length > 0) {
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
          }
        } else if (element.type === 'rectangle') {
          const width = element.end.x - element.start.x;
          const height = element.end.y - element.start.y;
          ctx.rect(element.start.x, element.start.y, width, height);
        } else if (element.type === 'circle') {
          ctx.arc(element.center.x, element.center.y, element.radius, 0, 2 * Math.PI);
        }

        ctx.stroke();
        ctx.closePath();
      } catch (error) {
        console.error('描画中にエラーが発生しました:', error);
      }
    };

    const drawElements = useCallback(() => {
      const canvas = localCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawingElements.forEach(element => {
        drawElement(ctx, element);
      });
      if (tempDrawingElement) {
        drawElement(ctx, tempDrawingElement);
      }
    }, [localCanvasRef, drawingElements, tempDrawingElement]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const canvas = localCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      prevPointRef.current = point;

      // ペンや消しゴムの場合は、新しいストロークの開始点としてtempDrawingElementを初期化
      if (activeTool === 'pen' || activeTool === 'eraser') {
        setTempDrawingElement({
          type: 'line',
          points: [point],
          color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
          brushSize: activeBrushSize,
        });
      }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = localCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (prevPointRef.current) {
        if (activeTool === 'pen' || activeTool === 'eraser') {
          // ペンと消しゴムは点を蓄積
          setTempDrawingElement((prevTemp) => {
            if (prevTemp && prevTemp.type === 'line') {
              // 既存の線に点を追加
              const newPoints = [...prevTemp.points, currentPoint];
              return {
                ...prevTemp,
                points: newPoints,
              };
            }
            // handleMouseDownで初期化されているはずなので、このパスは通常通らない
            return {
              type: 'line',
              points: [prevPointRef.current!, currentPoint],
              color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
              brushSize: activeBrushSize,
            };
          });
          prevPointRef.current = currentPoint; // 次の点の始点をすぐに更新

          // requestAnimationFrameを介して描画をスケジュール
          if (animationFrameId.current === null) {
            animationFrameId.current = requestAnimationFrame(() => {
              drawElements(); // 描画要素と仮描画要素を再描画
              animationFrameId.current = null; // リセット
            });
          }
        } else if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
          // 図形ツールは仮描画を更新
          let newTempElement: DrawingElementType | null = null;
          if (activeTool === 'line') {
            newTempElement = {
              type: 'line',
              points: [prevPointRef.current, currentPoint],
              color: activeColor,
              brushSize: activeBrushSize,
            };
          } else if (activeTool === 'rectangle') {
            newTempElement = {
              type: 'rectangle',
              start: prevPointRef.current,
              end: currentPoint,
              color: activeColor,
              brushSize: activeBrushSize,
            };
          } else if (activeTool === 'circle') {
            const radius = Math.sqrt(
              Math.pow(currentPoint.x - prevPointRef.current.x, 2) +
              Math.pow(currentPoint.y - prevPointRef.current.y, 2)
            );
            newTempElement = {
              type: 'circle',
              center: prevPointRef.current,
              radius,
              color: activeColor,
              brushSize: activeBrushSize,
            };
          }
          setTempDrawingElement(newTempElement); // 仮描画要素を更新
          // 図形ツールの場合も、更新後にすぐに描画をトリガー
          if (animationFrameId.current === null) {
            animationFrameId.current = requestAnimationFrame(() => {
              drawElements();
              animationFrameId.current = null;
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (tempDrawingElement) {
        onDrawComplete(tempDrawingElement);
        setTempDrawingElement(null);
      }
      prevPointRef.current = null;
    };

    const handleMouseLeave = () => {
      if (isDrawing) {
        // ドラッグ中にキャンバスからマウスが離れた場合も、描画を完了させる
        handleMouseUp();
      }
    };

    return (
      <div className="relative bg-clay-white px-4" style={{ width: CANVAS_WIDTH + 32, height: CANVAS_HEIGHT }}>
        <div className="bg-white" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={localCanvasRef}
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
              touchAction: 'none', // タッチイベントのデフォルト動作を無効化
            }}
          />
        </div>
      </div>
    );
  }
);

Canvas.displayName = 'Canvas'

export default Canvas
