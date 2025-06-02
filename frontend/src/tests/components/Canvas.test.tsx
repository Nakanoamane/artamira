import { render, screen, fireEvent } from '@testing-library/react';
import Canvas, { DrawingElementType } from '../../components/Canvas';
import { MockCanvasRenderingContext2D } from '../../setupTests'; // MockCanvasRenderingContext2D をインポート
// import 'jest-canvas-mock'; // jest-canvas-mockをインポート (Vitestでは不要)

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

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('sets isDrawing to true on mouse down', () => {
    render(<Canvas {...defaultProps} />);
    const canvas = screen.getByTestId('drawing-canvas');
    fireEvent.mouseDown(canvas);
    expect(defaultProps.setIsDrawing).toHaveBeenCalledWith(true);
  });

  it('sets isDrawing to false and nulls prevPointRef on mouse up', () => {
    render(<Canvas {...defaultProps} isDrawing={true} />);
    const canvas = screen.getByTestId('drawing-canvas');
    fireEvent.mouseUp(canvas);
    expect(defaultProps.setIsDrawing).toHaveBeenCalledWith(false);
  });

  it('sets isDrawing to false and nulls prevPointRef on mouse leave', () => {
    render(<Canvas {...defaultProps} isDrawing={true} />);
    const canvas = screen.getByTestId('drawing-canvas');
    fireEvent.mouseLeave(canvas);
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

    render(<Canvas {...defaultProps} drawingElementsToRender={drawingElements} />);

    // renderの直後にcanvasとctxを取得
    const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as unknown as MockCanvasRenderingContext2D;

    await vi.waitFor(() => {
      const canvas = screen.getByTestId('drawing-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d') as unknown as MockCanvasRenderingContext2D;

      expect(ctx.clearRect).toHaveBeenCalledTimes(2);
      expect(ctx.beginPath).toHaveBeenCalledTimes(4);
      expect(ctx.moveTo).toHaveBeenCalledTimes(4);
      expect(ctx.lineTo).toHaveBeenCalledTimes(4);
      expect(ctx.stroke).toHaveBeenCalledTimes(4);
      expect(ctx.closePath).toHaveBeenCalledTimes(4);

      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(ctx.lineTo).toHaveBeenCalledWith(10, 10);

      expect(ctx.moveTo).toHaveBeenCalledWith(20, 20);
      expect(ctx.lineTo).toHaveBeenCalledWith(30, 30);

      expect(ctx.strokeStyle).toBe('#00ff00');
      expect(ctx.lineWidth).toBe(10);
    });
  });
});
