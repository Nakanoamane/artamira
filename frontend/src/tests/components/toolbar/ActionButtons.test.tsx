import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionButtons from '../../../components/toolbar/ActionButtons';

describe('ActionButtons', () => {
  const mockOnSave = vi.fn();
  const mockOnExportClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders save and export buttons correctly', () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={false} onExportClick={mockOnExportClick} />);

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'エクスポート' })).toBeInTheDocument();
  });

  it('save button is enabled when isDirty is true', () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={true} onExportClick={mockOnExportClick} />);
    expect(screen.getByRole('button', { name: /保存/ })).not.toBeDisabled();
  });

  it('save button is disabled when isDirty is false', () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={false} onExportClick={mockOnExportClick} />);
    expect(screen.getByRole('button', { name: /保存/ })).toBeDisabled();
  });

  it('displays asterisk next to save button when isDirty is true', () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={true} onExportClick={mockOnExportClick} />);
    expect(screen.getByRole('button', { name: '保存 *' })).toBeInTheDocument();
  });

  it('does not display asterisk when isDirty is false', () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={false} onExportClick={mockOnExportClick} />);
    expect(screen.queryByRole('button', { name: '保存 *' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked and isDirty is true', async () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={true} onExportClick={mockOnExportClick} />);
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when save button is clicked and isDirty is false', async () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={false} onExportClick={mockOnExportClick} />);
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onExportClick when export button is clicked', async () => {
    render(<ActionButtons onSave={mockOnSave} isDirty={false} onExportClick={mockOnExportClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'エクスポート' }));
    expect(mockOnExportClick).toHaveBeenCalledTimes(1);
  });
});
