import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from '../../components/Toolbar';
import userEvent from '@testing-library/user-event';

describe('Toolbar', () => {
  let defaultProps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
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
      onSave: vi.fn(),
      isSaveEnabled: false,
      onExportClick: vi.fn(),
    };
  });

  it('renders toolbar elements correctly', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText('ツールバー')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ペン' })).toBeInTheDocument();
    expect(screen.getByLabelText('色を選択トグル')).toBeInTheDocument();
    expect(screen.getByLabelText('ブラシサイズ: 5px')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
  });

  it('updates active tool style when activeTool prop changes', () => {
    const { rerender } = render(<Toolbar {...defaultProps} activeTool="pen" />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-blue-500');

    rerender(<Toolbar {...defaultProps} activeTool="eraser" />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-gray-200');
  });

  it('calls onToolChange when tool button is clicked', async () => {
    render(<Toolbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'ペン' }));
    expect(defaultProps.onToolChange).toHaveBeenCalledWith('pen');
  });

  it('calls onColorChange when color picker value changes', async () => {
    render(<Toolbar {...defaultProps} />);
    const colorPickerToggle = screen.getByLabelText('色を選択トグル');
    await userEvent.click(colorPickerToggle);
    defaultProps.onColorChange('#ff0000');
    expect(defaultProps.onColorChange).toHaveBeenCalledWith('#ff0000');
  });

  it('calls onBrushSizeChange when brush size slider value changes', async () => {
    render(<Toolbar {...defaultProps} />);
    const brushSizeSlider = screen.getByLabelText('ブラシサイズ: 5px');
    fireEvent.change(brushSizeSlider, { target: { value: '10' } });
    expect(defaultProps.onBrushSizeChange).toHaveBeenCalledWith(10);
  });

  it('色変更時にonColorChangeが呼ばれること', async () => {
    render(<Toolbar {...defaultProps} />);
    const colorPickerToggle = screen.getByLabelText('色を選択トグル');
    await userEvent.click(colorPickerToggle);
    defaultProps.onColorChange('#FF0000');
    expect(defaultProps.onColorChange).toHaveBeenCalledWith('#FF0000');
  });

  it('ブラシサイズ変更時にonBrushSizeChangeが呼ばれること', async () => {
    render(<Toolbar {...defaultProps} />);
    const brushSizeSlider = screen.getByLabelText('ブラシサイズ: 5px');
    fireEvent.change(brushSizeSlider, { target: { value: '10' } });
    expect(defaultProps.onBrushSizeChange).toHaveBeenCalledWith(10);
  });

  it('calls onSave when save button is clicked', async () => {
    render(<Toolbar {...defaultProps} isSaveEnabled={true} />);
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('save button is enabled when isSaveEnabled is true', () => {
    render(<Toolbar {...defaultProps} isSaveEnabled={true} />);
    expect(screen.getByRole('button', { name: '保存' })).not.toBeDisabled();
  });

  it('save button is disabled when isSaveEnabled is false', () => {
    render(<Toolbar {...defaultProps} isSaveEnabled={false} />);
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('calls onExportClick when export button is clicked', async () => {
    render(<Toolbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));
    expect(defaultProps.onExportClick).toHaveBeenCalled();
  });
});
