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
      setActiveTool: vi.fn(),
      setActiveColor: vi.fn(),
      setActiveBrushSize: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      canUndo: false,
      canRedo: false,
      onSave: vi.fn(),
      isDirty: false,
      onExportClick: vi.fn(),
    };
  });

  it('renders toolbar elements correctly', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'ペン' })).toBeInTheDocument();
    expect(screen.getByLabelText('色を選択トグル')).toBeInTheDocument();
    expect(screen.getByLabelText('ブラシサイズ: 5px')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
  });

  it('updates active tool style when activeTool prop changes', () => {
    const { rerender } = render(<Toolbar {...defaultProps} activeTool="pen" />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-cave-ochre');

    rerender(<Toolbar {...defaultProps} activeTool="eraser" />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-light-gray');
  });

  it('calls setActiveTool when tool button is clicked', async () => {
    render(<Toolbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'ペン' }));
    expect(defaultProps.setActiveTool).toHaveBeenCalledWith('pen');
  });

  it('calls setActiveColor when color picker value changes', async () => {
    render(<Toolbar {...defaultProps} />);
    const colorPickerToggle = screen.getByLabelText('色を選択トグル');
    await userEvent.click(colorPickerToggle);
    defaultProps.setActiveColor('#ff0000');
    expect(defaultProps.setActiveColor).toHaveBeenCalledWith('#ff0000');
  });

  it('calls setActiveBrushSize when brush size slider value changes', async () => {
    render(<Toolbar {...defaultProps} />);
    const brushSizeSlider = screen.getByLabelText('ブラシサイズ: 5px');
    fireEvent.change(brushSizeSlider, { target: { value: '10' } });
    expect(defaultProps.setActiveBrushSize).toHaveBeenCalledWith(10);
  });

  it('色変更時にsetActiveColorが呼ばれること', async () => {
    render(<Toolbar {...defaultProps} />);
    const colorPickerToggle = screen.getByLabelText('色を選択トグル');
    await userEvent.click(colorPickerToggle);
    defaultProps.setActiveColor('#FF0000');
    expect(defaultProps.setActiveColor).toHaveBeenCalledWith('#FF0000');
  });

  it('ブラシサイズ変更時にsetActiveBrushSizeが呼ばれること', async () => {
    render(<Toolbar {...defaultProps} />);
    const brushSizeSlider = screen.getByLabelText('ブラシサイズ: 5px');
    fireEvent.change(brushSizeSlider, { target: { value: '10' } });
    expect(defaultProps.setActiveBrushSize).toHaveBeenCalledWith(10);
  });

  it('calls onSave when save button is clicked and isDirty is true', async () => {
    render(<Toolbar {...defaultProps} isDirty={true} />);
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('save button is enabled when isDirty is true', () => {
    render(<Toolbar {...defaultProps} isDirty={true} />);
    expect(screen.getByRole('button', { name: /保存/ })).not.toBeDisabled();
  });

  it('save button is disabled when isDirty is false', () => {
    render(<Toolbar {...defaultProps} isDirty={false} />);
    expect(screen.getByRole('button', { name: /保存/ })).toBeDisabled();
  });

  it('does not display asterisk when isDirty is false', () => {
    render(<Toolbar {...defaultProps} isDirty={false} />);
    expect(screen.queryByRole('button', { name: '保存 *' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  it('calls onExportClick when export button is clicked', async () => {
    render(<Toolbar {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));
    expect(defaultProps.onExportClick).toHaveBeenCalled();
  });
});
