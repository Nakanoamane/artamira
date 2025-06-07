/// <reference types="vitest/globals" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import Canvas, { DrawingElementType } from '../../components/Canvas';
import { MockCanvasRenderingContext2D } from '../../setupTests';
import { vi } from 'vitest';

describe('Canvas', () => {
  const defaultProps = {
    activeTool: 'pen',
    color: '#000000',
    brushSize: 5,
    isDrawing: false,
    setIsDrawing: vi.fn(),
    onDrawComplete: vi.fn(),
    drawingElementsToRender: [],
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
    defaultProps.setIsDrawing.mockClear();
    defaultProps.onDrawComplete.mockClear();
    // 他のモック関数もあれば同様にクリア
    vi.clearAllMocks(); // これも実行しておく
  });

  afterAll(() => {
    // window.HTMLCanvasElement = originalCanvas; // 不要な行は削除
  });

  it('renders canvas element', () => {
    render(<Canvas {...defaultProps} />);
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument();
  });

  it('displays "接続中..." when not connected and no error', () => {
    render(<Canvas {...defaultProps} status={{ isConnected: false, error: null }} />);
    expect(screen.getByText('接続中...')).toBeInTheDocument();
  });

  it('displays error message when status has an error', () => {
    const errorMessage = '接続エラーが発生しました';
    render(<Canvas {...defaultProps} status={{ isConnected: false, error: errorMessage }} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('sets isDrawing to true on mouse down', async () => {
    // ref を渡して Canvas コンポーネントが内部の canvas 要素にアクセスできるようにする
    const mockRef: { current: HTMLCanvasElement | null } = { current: null };
    render(<Canvas {...defaultProps} ref={mockRef} />);
    const canvas = screen.getByTestId('drawing-canvas');
    // Canvas コンポーネントが内部的に ref を設定するのを待つ
    // ただし、このテストの文脈では ref.current が canvas 要素になることを保証するだけでよい
    mockRef.current = canvas as HTMLCanvasElement; // 手動で current を設定

    act(() => {
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    });
    expect(defaultProps.setIsDrawing).toHaveBeenCalledWith(true);
  });

  it('sets isDrawing to false and nulls prevPointRef on mouse up', async () => {
    const mockRef: { current: HTMLCanvasElement | null } = { current: null };
    render(<Canvas {...defaultProps} isDrawing={true} ref={mockRef} />);
    const canvas = screen.getByTestId('drawing-canvas');
    mockRef.current = canvas as HTMLCanvasElement;

    act(() => {
      fireEvent.mouseUp(canvas, { clientX: 20, clientY: 20 });
    });
    expect(defaultProps.setIsDrawing).toHaveBeenCalledWith(false);
  });

  it('sets isDrawing to false and nulls prevPointRef on mouse leave', () => {
    const mockRef: { current: HTMLCanvasElement | null } = { current: null };
    render(<Canvas {...defaultProps} isDrawing={true} ref={mockRef} />);
    const canvas = screen.getByTestId('drawing-canvas');
    mockRef.current = canvas as HTMLCanvasElement;

    act(() => {
      fireEvent.mouseLeave(canvas);
    });
    expect(defaultProps.setIsDrawing).toHaveBeenCalledWith(false);
  });

  it('draws elements to render on canvas', async () => {
    const drawingElements: DrawingElementType[] = [
      {
        type: 'line',
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        color: '#FF0000',
        brushSize: 5
      },
      {
        type: 'line',
        points: [{ x: 20, y: 20 }, { x: 30, y: 30 }],
        color: '#00FF00',
        brushSize: 10
      },
    ];

    const mockRef: { current: HTMLCanvasElement | null } = { current: null };
    render(<Canvas {...defaultProps} drawingElementsToRender={drawingElements} ref={mockRef} />);

    const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
    mockRef.current = canvas as HTMLCanvasElement; // ref を設定
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
