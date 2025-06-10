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
    expect(screen.getByLabelText('色を選択トグル')).toBeInTheDocument();
    expect(screen.getByLabelText('ブラシサイズ: 5px')).toBeInTheDocument();
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
});
