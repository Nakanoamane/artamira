import { describe, it, expect } from 'vitest';
import { parseDrawingElement, parseRawElements, RawDrawingElement } from '../../utils/drawingElementsParser';

describe('drawingElementsParser', () => {
  describe('parseDrawingElement', () => {
    it('should correctly parse a raw line element', () => {
      const rawLine: RawDrawingElement = {
        id: 1,
        element_type: 'line',
        data: {
          path: [[10, 20], [30, 40]],
          color: '#FF0000',
          lineWidth: 5,
        },
      };

      const parsed = parseDrawingElement(rawLine);
      expect(parsed).toEqual({
        id: 1,
        type: 'line',
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#FF0000',
        brushSize: 5,
      });
    });

    it('should correctly parse a raw rectangle element', () => {
      const rawRectangle: RawDrawingElement = {
        id: 2,
        element_type: 'rectangle',
        data: {
          start: { x: 50, y: 60 },
          end: { x: 70, y: 80 },
          color: '#00FF00',
          lineWidth: 3,
        },
      };

      const parsed = parseDrawingElement(rawRectangle);
      expect(parsed).toEqual({
        id: 2,
        type: 'rectangle',
        start: { x: 50, y: 60 },
        end: { x: 70, y: 80 },
        color: '#00FF00',
        brushSize: 3,
      });
    });

    it('should correctly parse a raw circle element', () => {
      const rawCircle: RawDrawingElement = {
        id: 3,
        element_type: 'circle',
        data: {
          center: { x: 100, y: 110 },
          radius: 25,
          color: '#0000FF',
          brushSize: 2,
        },
      };

      const parsed = parseDrawingElement(rawCircle);
      expect(parsed).toEqual({
        id: 3,
        type: 'circle',
        center: { x: 100, y: 110 },
        radius: 25,
        color: '#0000FF',
        brushSize: 2,
      });
    });

    it('should return null for an unknown element type', () => {
      const rawUnknown: RawDrawingElement = {
        id: 'unknown-1',
        element_type: 'unknown' as any, // 意図的に不正なタイプを渡す
        data: {},
      };

      const parsed = parseDrawingElement(rawUnknown);
      expect(parsed).toBeNull();
    });

    it('should handle missing data properties gracefully', () => {
      const rawIncompleteLine: RawDrawingElement = {
        id: 'incomplete-line',
        element_type: 'line',
        data: {
          // pathが欠落
          color: '#FF0000',
          lineWidth: 5,
        },
      };
      // エラーが発生しないこと、または期待する結果になることを確認
      const parsed = parseDrawingElement(rawIncompleteLine);
      expect(parsed).toBeNull(); // または、部分的にパースされたオブジェクトの期待値を設定
    });
  });

  describe('parseRawElements', () => {
    it('should correctly parse an array of raw elements', () => {
      const rawElements: RawDrawingElement[] = [
        {
          id: 1,
          element_type: 'line',
          data: { path: [[0, 0], [1, 1]], color: '#000000', lineWidth: 1 },
        },
        {
          id: 2,
          element_type: 'rectangle',
          data: { start: { x: 10, y: 10 }, end: { x: 20, y: 20 }, color: '#FF0000', lineWidth: 2 },
        },
      ];

      const parsed = parseRawElements(rawElements);
      expect(parsed.length).toBe(2);
      expect(parsed[0].type).toBe('line');
      expect(parsed[1].type).toBe('rectangle');
    });

    it('should filter out unparseable elements', () => {
      const rawElements: RawDrawingElement[] = [
        {
          id: 1,
          element_type: 'line',
          data: { path: [[0, 0], [1, 1]], color: '#000000', lineWidth: 1 },
        },
        {
          id: 'unknown-1',
          element_type: 'unknown' as any,
          data: {},
        },
      ];

      const parsed = parseRawElements(rawElements);
      expect(parsed.length).toBe(1);
      expect(parsed[0].type).toBe('line');
    });

    it('should return an empty array for an empty input array', () => {
      const rawElements: RawDrawingElement[] = [];
      const parsed = parseRawElements(rawElements);
      expect(parsed).toEqual([]);
    });
  });
});
