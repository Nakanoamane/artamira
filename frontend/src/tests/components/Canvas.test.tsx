/// <reference types="vitest/globals" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import Canvas from '../../components/Canvas';
import { DrawingElementType } from '../../utils/drawingElementsParser';
import { MockCanvasRenderingContext2D } from '../../setupTests';
import { vi } from 'vitest';

describe('Canvas', () => {
  const defaultProps = {
    canvasRef: { current: null as HTMLCanvasElement | null },
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

  beforeEach(() => {
    // `vi.clearAllMocks()` はすべてのモックの呼び出し履歴をクリアしますが、モック関数自体は再作成されません。
    // defaultProps.setIsDrawing は describe スコープで一度だけ作成されているため、
    // 各テストで新しいモック関数を割り当てる必要があります。
    // defaultProps.setIsDrawing.mockClear(); // 削除
    defaultProps.onDrawComplete.mockClear();
    // 他のモック関数もあれば同様にクリア
    vi.clearAllMocks(); // これも実行しておく

    // Reset canvasRef.current before each test
    defaultProps.canvasRef.current = null;
  });

  afterAll(() => {
    // window.HTMLCanvasElement = originalCanvas; // 不要な行は削除
  });

  it('renders canvas element', () => {
    render(<Canvas {...defaultProps} />);
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument();
    // Mock the current ref to the actual canvas element for subsequent interactions
    defaultProps.canvasRef.current = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
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

    render(<Canvas {...defaultProps} drawingElements={drawingElements} />); // Pass drawingElements

    const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
    defaultProps.canvasRef.current = canvas as HTMLCanvasElement; // ref を設定
    const ctx = canvas.getContext('2d') as unknown as MockCanvasRenderingContext2D;

    // Canvasの初期化と描画要素の描画でclearRectが呼ばれることを期待
    // drawingElementsToRender が初期プロップとして渡されるため、useEffectは一度だけトリガーされる
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
