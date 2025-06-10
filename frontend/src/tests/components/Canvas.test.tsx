/// <reference types="vitest/globals" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import Canvas from '../../components/Canvas';
import { DrawingElementType } from '../../utils/drawingElementsParser';
import { MockCanvasRenderingContext2D } from '../../setupTests';
import { vi, Mock } from 'vitest';
import React, { useRef } from 'react';

describe('Canvas', () => {
  const defaultProps: {
    activeTool: string;
    activeColor: string;
    activeBrushSize: number;
    onDrawComplete: Mock<(drawingElement: DrawingElementType) => void>;
    drawingElements: DrawingElementType[];
    setDrawingElements: React.Dispatch<React.SetStateAction<DrawingElementType[]>>;
    status: { isConnected: boolean; error: null | string };
  } = {
    // canvasRef: { current: null as HTMLCanvasElement | null }, // 削除
    activeTool: 'pen',
    activeColor: '#000000',
    activeBrushSize: 5,
    onDrawComplete: vi.fn(),
    drawingElements: [],
    setDrawingElements: vi.fn(),
    status: { isConnected: true, error: null },
  };

  // Canvas APIのモックはsetupTests.tsで処理されるため、ここでは不要
  // let originalCanvas: any; // 不要な変数は削除

  beforeAll(() => {
    // originalCanvas = window.HTMLCanvasElement; // 不要な行は削除
    window.HTMLCanvasElement.prototype.toDataURL = vi.fn((type: string) => {
      return `data:${type};base64,mocked_image_data`;
    });
  });

  // テスト用のラッパーコンポーネント
  const TestCanvasWrapper = ({ initialProps }: { initialProps: typeof defaultProps }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    return (
      <Canvas {...initialProps} ref={canvasRef} />
    );
  };

  beforeEach(() => {
    defaultProps.onDrawComplete.mockClear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    // window.HTMLCanvasElement = originalCanvas; // 不要な行は削除
  });

  it('renders canvas element', () => {
    render(<TestCanvasWrapper initialProps={defaultProps} />);
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument();
  });

  it('draws elements to render on canvas', async () => {
    const drawingElements: DrawingElementType[] = [
      {
        type: 'line',
        id: 'test-line-1',
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        color: '#FF0000',
        brushSize: 5
      },
      {
        type: 'line',
        id: 'test-line-2',
        points: [{ x: 20, y: 20 }, { x: 30, y: 30 }],
        color: '#00FF00',
        brushSize: 10
      },
    ];

    render(<TestCanvasWrapper initialProps={{ ...defaultProps, drawingElements }} />);

    const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as unknown as MockCanvasRenderingContext2D;

    // Canvasの初期化と描画要素の描画でclearRectが呼ばれることを期待
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);

    // drawingElementsToRender の変更は初回レンダリング後に発生すると仮定
    // ここでは、useEffect がトリガーされた後の描画を確認する
    expect(ctx.beginPath).toHaveBeenCalledTimes(drawingElements.length);
    expect(ctx.moveTo).toHaveBeenCalledTimes(drawingElements.length);
    expect(ctx.lineTo).toHaveBeenCalledTimes(drawingElements.length);
    expect(ctx.stroke).toHaveBeenCalledTimes(drawingElements.length);
    expect(ctx.closePath).toHaveBeenCalledTimes(drawingElements.length);

    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 10);

    expect(ctx.moveTo).toHaveBeenCalledWith(20, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(30, 30);

    // 最後の描画要素の色とブラシサイズが適用されていることを確認
    expect(ctx.strokeStyle).toBe('#00ff00');
    expect(ctx.lineWidth).toBe(10);
  });
});
