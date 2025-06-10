import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryButtons from '../../../components/toolbar/HistoryButtons';

describe('HistoryButtons', () => {
  const mockOnUndo = vi.fn();
  const mockOnRedo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders undo and redo buttons correctly', () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={false} />);

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

  it('undo button is enabled when canUndo is true', () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={true} canRedo={false} />);
    expect(screen.getByRole('button', { name: 'Undo' })).not.toBeDisabled();
  });

  it('undo button is disabled when canUndo is false', () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={false} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('redo button is enabled when canRedo is true', () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={true} />);
    expect(screen.getByRole('button', { name: 'Redo' })).not.toBeDisabled();
  });

  it('redo button is disabled when canRedo is false', () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={false} />);
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('calls onUndo when undo button is clicked and canUndo is true', async () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={true} canRedo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });

  it('does not call onUndo when undo button is clicked and canUndo is false', async () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(mockOnUndo).not.toHaveBeenCalled();
  });

  it('calls onRedo when redo button is clicked and canRedo is true', async () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={true} />);
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(mockOnRedo).toHaveBeenCalledTimes(1);
  });

  it('does not call onRedo when redo button is clicked and canRedo is false', async () => {
    render(<HistoryButtons onUndo={mockOnUndo} onRedo={mockOnRedo} canUndo={false} canRedo={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(mockOnRedo).not.toHaveBeenCalled();
  });
});
