import { forwardRef, useEffect, useRef, useCallback, useState } from 'react'
import { Point, LineElement, RectangleElement as RectElement, CircleElement, DrawingElementType } from "../utils/drawingElementsParser";
import { drawElement, drawAllElements } from '../utils/canvasDrawing';

// interface Point {
//   x: number
//   y: number
// }

// export interface LineElement {
//   id?: string
//   type: 'line'
//   points: Point[] // [start, end]
//   color: string
//   brushSize: number
// }

// export interface RectElement {
//   id?: string
//   type: 'rectangle'
//   start: Point
//   end: Point
//   color: string
//   brushSize: number
// }

// export interface CircleElement {
//   id?: string
//   type: 'circle'
//   center: Point
//   radius: number
//   color: string
//   brushSize: number
// }

// export type DrawingElementType = LineElement | RectElement | CircleElement

export interface CanvasProps {
  drawingElements: DrawingElementType[];
  setDrawingElements: React.Dispatch<React.SetStateAction<DrawingElementType[]>>;
  activeTool: string;
  activeColor: string;
  activeBrushSize: number;
  onDrawComplete: (drawingElement: DrawingElementType) => void;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ activeTool, activeColor, activeBrushSize, onDrawComplete, drawingElements }, ref) => {
    // ref が React.RefObject<HTMLCanvasElement> であることをアサート
    const canvasRefObject = ref as React.RefObject<HTMLCanvasElement>;

    const [isDrawing, setIsDrawing] = useState(false); // isDrawingステートをCanvas内部に移動
    const prevPointRef = useRef<Point | null>(null);
    const animationFrameId = useRef<number | null>(null); // requestAnimationFrame のIDを保持
    const [tempDrawingElement, setTempDrawingElement] = useState<DrawingElementType | null>(null); // 仮描画要素の状態
    const drawingCompletedRef = useRef(false); // 描画が完了したかどうかを追跡するref

    useEffect(() => {
      const canvas = canvasRefObject.current; // canvasRefObject に変更
      if (!canvas) return;

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, [canvasRefObject]); // 依存配列を canvasRefObject に変更

    useEffect(() => {
      const canvas = canvasRefObject.current; // canvasRefObject に変更
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawAllElements(ctx, canvas, drawingElements, tempDrawingElement);
    }, [drawingElements, tempDrawingElement, canvasRefObject]); // 依存配列を canvasRefObject に変更

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      drawingCompletedRef.current = false; // 新しい描画の開始時にフラグをリセット
      const canvas = canvasRefObject.current; // canvasRefObject に変更
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
          id: `temp-${Date.now()}`,
          points: [point],
          color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
          brushSize: activeBrushSize,
        });
      }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRefObject.current; // canvasRefObject に変更
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
              id: `temp-${Date.now()}`,
              points: [prevPointRef.current!, currentPoint],
              color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
              brushSize: activeBrushSize,
            };
          });
          prevPointRef.current = currentPoint; // 次の点の始点をすぐに更新

          // requestAnimationFrameを介して描画をスケジュール
          if (animationFrameId.current === null) {
            animationFrameId.current = requestAnimationFrame(() => {
              const canvas = canvasRefObject.current; // canvasRefObject に変更
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              drawAllElements(ctx, canvas, drawingElements, tempDrawingElement);
              animationFrameId.current = null; // リセット
            });
          }
        } else if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
          // 図形ツールは仮描画を更新
          let newTempElement: DrawingElementType | null = null;
          if (activeTool === 'line') {
            newTempElement = {
              type: 'line',
              id: `temp-${Date.now()}`,
              points: [prevPointRef.current!, currentPoint],
              color: activeColor,
              brushSize: activeBrushSize,
            };
          } else if (activeTool === 'rectangle') {
            newTempElement = {
              type: 'rectangle',
              id: `temp-${Date.now()}`,
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
              id: `temp-${Date.now()}`,
              center: prevPointRef.current!,
              radius,
              color: activeColor,
              brushSize: activeBrushSize,
            };
          }
          setTempDrawingElement(newTempElement); // 仮描画要素を更新
          // 図形ツールの場合も、更新後にすぐに描画をトリガー
          if (animationFrameId.current === null) {
            animationFrameId.current = requestAnimationFrame(() => {
              const canvas = canvasRefObject.current; // canvasRefObject に変更
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              drawAllElements(ctx, canvas, drawingElements, tempDrawingElement);
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
      if (tempDrawingElement && !drawingCompletedRef.current) {
        console.log("Canvas: Calling onDrawComplete from handleMouseUp.", tempDrawingElement);
        onDrawComplete(tempDrawingElement);
        drawingCompletedRef.current = true; // 描画完了フラグを設定
        setTempDrawingElement(null); // 仮描画要素をクリア
      }
      prevPointRef.current = null;
    };

    const handleMouseLeave = () => {
      if (isDrawing) {
        // ドラッグ中にキャンバスからマウスが離れた場合、描画を完了させる
        setIsDrawing(false);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
        if (tempDrawingElement && !drawingCompletedRef.current) {
          console.log("Canvas: Calling onDrawComplete from handleMouseLeave.", tempDrawingElement);
          onDrawComplete(tempDrawingElement);
          drawingCompletedRef.current = true; // 描画完了フラグを設定
          setTempDrawingElement(null);
        }
        prevPointRef.current = null;
      }
    };

    return (
      <div className="relative bg-clay-white px-4" style={{ width: CANVAS_WIDTH + 32, height: CANVAS_HEIGHT }}>
        <div className="bg-white" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={canvasRefObject} // canvasRefObject に変更
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
