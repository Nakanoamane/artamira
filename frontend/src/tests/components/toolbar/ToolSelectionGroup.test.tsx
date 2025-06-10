import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolSelectionGroup from '../../../components/toolbar/ToolSelectionGroup';
import { TOOLS } from '../../../constants/tools';

describe('ToolSelectionGroup', () => {
  const mockSetActiveTool = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tool buttons correctly', () => {
    render(<ToolSelectionGroup activeTool={TOOLS.PEN} setActiveTool={mockSetActiveTool} />);

    expect(screen.getByRole('button', { name: 'ペン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '消しゴム' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '直線' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '四角' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '円' })).toBeInTheDocument();
  });

  it('applies active style to the active tool button', () => {
    const { rerender } = render(<ToolSelectionGroup activeTool={TOOLS.PEN} setActiveTool={mockSetActiveTool} />);
    expect(screen.getByRole('button', { name: 'ペン' })).toHaveClass('bg-cave-ochre');
    expect(screen.getByRole('button', { name: '消しゴム' })).not.toHaveClass('bg-cave-ochre');

    rerender(<ToolSelectionGroup activeTool={TOOLS.ERASER} setActiveTool={mockSetActiveTool} />);
    expect(screen.getByRole('button', { name: 'ペン' })).not.toHaveClass('bg-cave-ochre');
    expect(screen.getByRole('button', { name: '消しゴム' })).toHaveClass('bg-cave-ochre');
  });

  it('calls setActiveTool with the correct tool name when a button is clicked', async () => {
    render(<ToolSelectionGroup activeTool={TOOLS.PEN} setActiveTool={mockSetActiveTool} />);

    await userEvent.click(screen.getByRole('button', { name: '消しゴム' }));
    expect(mockSetActiveTool).toHaveBeenCalledTimes(1);
    expect(mockSetActiveTool).toHaveBeenCalledWith(TOOLS.ERASER);

    await userEvent.click(screen.getByRole('button', { name: '直線' }));
    expect(mockSetActiveTool).toHaveBeenCalledTimes(2);
    expect(mockSetActiveTool).toHaveBeenCalledWith(TOOLS.LINE);
  });
});
