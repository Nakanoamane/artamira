/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

export class MockCanvasRenderingContext2D {
  // メソッド
  clearRect = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  stroke = vi.fn();
  closePath = vi.fn();
  arc = vi.fn();
  ellipse = vi.fn();
  fillRect = vi.fn();
  fillText = vi.fn();
  strokeRect = vi.fn();
  setLineDash = vi.fn();
  getLineDash = vi.fn(() => []);
  measureText = vi.fn(() => ({ width: 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 0 }));

  // プロパティ (Getter/Setter を使用してスパイ可能にする)
  #fillStyle: string = '';
  get fillStyle() { return this.#fillStyle; }
  set fillStyle(v: string) { this.#fillStyle = v; }

  #strokeStyle: string = '';
  get strokeStyle() { return this.#strokeStyle; }
  set strokeStyle(v: string) { this.#strokeStyle = v.toLowerCase(); }

  #lineWidth: number = 0;
  get lineWidth() { return this.#lineWidth; }
  set lineWidth(v: number) { this.#lineWidth = v; }

  #lineCap: CanvasLineCap = 'butt';
  get lineCap() { return this.#lineCap; }
  set lineCap(v: CanvasLineCap) { this.#lineCap = v; }

  #lineJoin: CanvasLineJoin = 'miter';
  get lineJoin() { return this.#lineJoin; }
  set lineJoin(v: CanvasLineJoin) { this.#lineJoin = v; }

  #globalAlpha: number = 1;
  get globalAlpha() { return this.#globalAlpha; }
  set globalAlpha(v: number) { this.#globalAlpha = v; }

  #font: string = '';
  get font() { return this.#font; }
  set font(v: string) { this.#font = v; }

  #textAlign: CanvasTextAlign = 'start';
  get textAlign() { return this.#textAlign; }
  set textAlign(v: CanvasTextAlign) { this.#textAlign = v; }

  #textBaseline: CanvasTextBaseline = 'alphabetic';
  get textBaseline() { return this.#textBaseline; }
  set textBaseline(v: CanvasTextBaseline) { this.#textBaseline = v; }

  #direction: CanvasDirection = 'ltr';
  get direction() { return this.#direction; }
  set direction(v: CanvasDirection) { this.#direction = v; }
}

export let singleMockContextInstance: MockCanvasRenderingContext2D; // 単一のインスタンスを保持するグローバル変数

beforeAll(() => {
  // すべてのテストの前に単一のモックインスタンスを初期化
  singleMockContextInstance = new MockCanvasRenderingContext2D();

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn(() => singleMockContextInstance), // 常に同じインスタンスを返す
  });

  // composedPathをモック
  Object.defineProperty(Event.prototype, 'composedPath', {
    value: vi.fn(() => []),
    configurable: true,
  });
});

afterEach(() => {
  const mockGetContext = HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>;
  mockGetContext.mockClear(); // getContext自体の呼び出し履歴をクリア

  // 単一のモックコンテキストインスタンスのすべてのスパイをクリア
  if (singleMockContextInstance) {
    (Object.keys(singleMockContextInstance) as Array<keyof MockCanvasRenderingContext2D>).forEach((key) => {
      const prop = singleMockContextInstance[key];
      if (typeof prop === 'function' && vi.isMockFunction(prop)) {
        prop.mockClear();
      }
    });
  }
  cleanup();
});
