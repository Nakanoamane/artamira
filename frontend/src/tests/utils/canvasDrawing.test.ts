/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawElement, drawAllElements } from '../../utils/canvasDrawing';
import { DrawingElementType, Point, LineElement, RectangleElement as RectElement, CircleElement } from '../../utils/drawingElementsParser';

// Mock CanvasRenderingContext2D
class MockCanvasRenderingContext2D {
  beginPath = vi.fn();
  strokeStyle = '';
  lineWidth = 0;
  globalCompositeOperation = '';
  moveTo = vi.fn();
  lineTo = vi.fn();
  rect = vi.fn();
  arc = vi.fn();
  stroke = vi.fn();
  closePath = vi.fn();
  clearRect = vi.fn();

  constructor() {
    vi.clearAllMocks();
  }
}

describe('canvasDrawing', () => {
  let mockCtx: MockCanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCtx = new MockCanvasRenderingContext2D();
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(() => mockCtx),
    } as unknown as HTMLCanvasElement;
  });

  describe('drawElement', () => {
    it('線要素を正しく描画する', () => {
      const lineElement: LineElement = {
        type: 'line',
        id: '1',
        points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
        color: '#FF0000',
        brushSize: 2,
      };

      drawElement(mockCtx as unknown as CanvasRenderingContext2D, lineElement);

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
      expect(mockCtx.strokeStyle).toBe('#FF0000');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 20);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
      expect(mockCtx.globalCompositeOperation).toBe('source-over');
    });

    it('消しゴムの線要素を正しく描画する', () => {
      const eraserElement: LineElement = {
        type: 'line',
        id: '2',
        points: [{ x: 30, y: 30 }, { x: 40, y: 40 }],
        color: '#FFFFFF',
        brushSize: 5,
      };

      drawElement(mockCtx as unknown as CanvasRenderingContext2D, eraserElement);

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
      expect(mockCtx.strokeStyle).toBe('#FFFFFF');
      expect(mockCtx.lineWidth).toBe(5);
      expect(mockCtx.moveTo).toHaveBeenCalledWith(30, 30);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(40, 40);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
      expect(mockCtx.globalCompositeOperation).toBe('destination-out');
    });

    it('長方形要素を正しく描画する', () => {
      const rectElement: RectElement = {
        type: 'rectangle',
        id: '3',
        start: { x: 50, y: 50 },
        end: { x: 100, y: 100 },
        color: '#0000FF',
        brushSize: 3,
      };

      drawElement(mockCtx as unknown as CanvasRenderingContext2D, rectElement);

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
      expect(mockCtx.strokeStyle).toBe('#0000FF');
      expect(mockCtx.lineWidth).toBe(3);
      expect(mockCtx.rect).toHaveBeenCalledWith(50, 50, 50, 50);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
      expect(mockCtx.globalCompositeOperation).toBe('source-over');
    });

    it('円要素を正しく描画する', () => {
      const circleElement: CircleElement = {
        type: 'circle',
        id: '4',
        center: { x: 150, y: 150 },
        radius: 25,
        color: '#00FF00',
        brushSize: 4,
      };

      drawElement(mockCtx as unknown as CanvasRenderingContext2D, circleElement);

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
      expect(mockCtx.strokeStyle).toBe('#00FF00');
      expect(mockCtx.lineWidth).toBe(4);
      expect(mockCtx.arc).toHaveBeenCalledWith(150, 150, 25, 0, 2 * Math.PI);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
      expect(mockCtx.globalCompositeOperation).toBe('source-over');
    });
  });

  describe('drawAllElements', () => {
    it('キャンバスをクリアし、すべての描画要素と一時描画要素を正しく描画する', () => {
      const drawingElements: DrawingElementType[] = [
        {
          type: 'line',
          id: '1',
          points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          color: '#FF0000',
          brushSize: 2,
        },
        {
          type: 'rectangle',
          id: '2',
          start: { x: 50, y: 50 },
          end: { x: 100, y: 100 },
          color: '#0000FF',
          brushSize: 3,
        },
      ];
      const tempDrawingElement: DrawingElementType = {
        type: 'circle',
        id: 'temp',
        center: { x: 150, y: 150 },
        radius: 25,
        color: '#00FF00',
        brushSize: 4,
      };

      drawAllElements(mockCtx as unknown as CanvasRenderingContext2D, mockCanvas, drawingElements, tempDrawingElement);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
      // drawingElements の要素数 + tempDrawingElement の 1 = 3回 drawElement が呼ばれる
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(3);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(3);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(3);
    });

    it('一時描画要素がない場合でも正しく描画する', () => {
      const drawingElements: DrawingElementType[] = [
        {
          type: 'line',
          id: '1',
          points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          color: '#FF0000',
          brushSize: 2,
        },
      ];

      drawAllElements(mockCtx as unknown as CanvasRenderingContext2D, mockCanvas, drawingElements, null);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
      // drawingElements の要素数 = 1回 drawElement が呼ばれる
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(1);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
      expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
    });

    it('描画要素がない場合でも正しく描画する', () => {
      drawAllElements(mockCtx as unknown as CanvasRenderingContext2D, mockCanvas, [], null);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
      expect(mockCtx.beginPath).not.toHaveBeenCalled();
      expect(mockCtx.stroke).not.toHaveBeenCalled();
      expect(mockCtx.closePath).not.toHaveBeenCalled();
    });
  });
});
