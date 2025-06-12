import { DrawingElementType, Point } from './drawingElementsParser';

/**
 * 単一の描画要素をキャンバスに描画します。
 * @param ctx CanvasRenderingContext2D オブジェクト
 * @param element 描画する要素
 */
export const drawElement = (
  ctx: CanvasRenderingContext2D,
  element: DrawingElementType
) => {
  console.log("[drawElement] Attempting to draw element:", element);
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
      } else {
        console.warn("[drawElement] Line element has no points:", element);
      }
    } else if (element.type === 'rectangle') {
      const width = element.end.x - element.start.x;
      const height = element.end.y - element.start.y;
      // Check for zero width/height rectangles that might not be visible
      if (width === 0 || height === 0) {
        console.warn("[drawElement] Rectangle has zero width or height:", element);
      }
      ctx.rect(element.start.x, element.start.y, width, height);
    } else if (element.type === 'circle') {
      // Check for zero radius circles
      if (element.radius === 0) {
        console.warn("[drawElement] Circle has zero radius:", element);
      }
      ctx.arc(element.center.x, element.center.y, element.radius, 0, 2 * Math.PI);
    }

    ctx.stroke();
    ctx.closePath();
  } catch (error) {
    console.error('描画中にエラーが発生しました:', error);
  }
};

/**
 * 複数の描画要素と一時描画要素をキャンバスに描画します。
 * @param ctx CanvasRenderingContext2D オブジェクト
 * @param canvas HTMLCanvasElement オブジェクト
 * @param drawingElements 描画する要素の配列
 * @param tempDrawingElement 一時描画要素 (存在する場合)
 */
export const drawAllElements = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  drawingElements: DrawingElementType[],
  tempDrawingElement: DrawingElementType | null
) => {
  console.log("[drawAllElements] Clearing canvas and drawing elements.");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawingElements.forEach(element => {
    drawElement(ctx, element);
  });
  if (tempDrawingElement) {
    drawElement(ctx, tempDrawingElement);
  }
};
