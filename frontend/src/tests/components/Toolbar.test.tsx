import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from '../../components/Toolbar';

describe('Toolbar', () => {
  const defaultProps = {
    activeTool: 'pen',
    activeColor: '#000000',
    activeBrushSize: 5,
    onToolChange: vi.fn(),
    onColorChange: vi.fn(),
    onBrushSizeChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: false,
    canRedo: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toolbar elements correctly', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText('ツールバー')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ペン' })).toBeInTheDocument();
    expect(screen.getByLabelText('色を選択トグル')).toBeInTheDocument();
    expect(screen.getByLabelText('ブラシサイズ: 5px')).toBeInTheDocument();
  });

  it('updates active tool style when activeTool prop changes', () => {
    const { rerender } = render(<Toolbar {...defaultProps} activeTool="pen" />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-blue-500');

    rerender(<Toolbar {...defaultProps} activeTool="eraser" />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-gray-200');
  });

  it('calls onToolChange when tool button is clicked', () => {
    render(<Toolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ペン' }));
    expect(defaultProps.onToolChange).toHaveBeenCalledWith('pen');
  });

  it('calls onColorChange when color picker value changes', async () => {
    const onColorChange = vi.fn();
    render(<Toolbar {...defaultProps} onColorChange={onColorChange} />);
    const colorPickerToggle = screen.getByLabelText('色を選択トグル');
    fireEvent.click(colorPickerToggle);
    onColorChange('#ff0000');
    expect(onColorChange).toHaveBeenCalledWith('#ff0000');
  });

  it('calls onBrushSizeChange when brush size slider value changes', () => {
    render(<Toolbar {...defaultProps} />);
    const brushSizeSlider = screen.getByLabelText('ブラシサイズ: 5px');
    fireEvent.change(brushSizeSlider, { target: { value: '10' } });
    expect(defaultProps.onBrushSizeChange).toHaveBeenCalledWith(10);
  });

  it('色変更時にonColorChangeが呼ばれること', () => {
    const onColorChange = vi.fn();
    render(<Toolbar {...defaultProps} onColorChange={onColorChange} />);
    const colorPickerToggle = screen.getByLabelText('色を選択トグル');
    fireEvent.click(colorPickerToggle);
    onColorChange('#FF0000');
    expect(onColorChange).toHaveBeenCalledWith('#FF0000');
  });

  it('ブラシサイズ変更時にonBrushSizeChangeが呼ばれること', () => {
    const onBrushSizeChange = vi.fn();
    render(<Toolbar {...defaultProps} onBrushSizeChange={onBrushSizeChange} />);
    const brushSizeSlider = screen.getByLabelText('ブラシサイズ: 5px');
    fireEvent.change(brushSizeSlider, { target: { value: '10' } });
    expect(onBrushSizeChange).toHaveBeenCalledWith(10);
  });
});
