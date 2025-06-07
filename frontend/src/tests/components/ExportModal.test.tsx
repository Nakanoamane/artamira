import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportModal } from '../../components/ExportModal';
import { vi, describe, it, expect } from 'vitest';

describe('ExportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnExport.mockClear();
  });

  it('モーダルが閉じているときに表示されないこと', () => {
    render(
      <ExportModal
        isOpen={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
        exportError={null}
      />
    );
    expect(screen.queryByText('エクスポート')).not.toBeInTheDocument();
  });

  it('モーダルが開いているときに表示されること', () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
        exportError={null}
      />
    );
    expect(screen.getByText('エクスポート')).toBeInTheDocument();
  });

  it('エクスポート中に「エクスポート中...」が表示され、エクスポートボタンが非表示になること', () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={true}
        exportError={null}
      />
    );
    expect(screen.getByText('エクスポート中...')).toBeInTheDocument();
    expect(screen.queryByTestId('png-export-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('jpeg-export-button')).not.toBeInTheDocument();
  });

  it('exportErrorがある場合、エラーメッセージが表示されること', () => {
    const errorMessage = 'エクスポートに失敗しました。';
    render(
      <ExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
        exportError={errorMessage}
      />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('「キャンセル」ボタンをクリックすると onClose が呼び出されること', async () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
        exportError={null}
      />
    );
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    await userEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('PNGでエクスポートボタンをクリックすると onExport がPNGフォーマットで呼び出されること', async () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
        exportError={null}
      />
    );
    const pngExportButton = screen.getByTestId('png-export-button');
    await userEvent.click(pngExportButton);
    expect(mockOnExport).toHaveBeenCalledTimes(1);
    expect(mockOnExport).toHaveBeenCalledWith('png');
  });

  it('JPEGでエクスポートボタンをクリックすると onExport がJPEGフォーマットで呼び出されること', async () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isExporting={false}
        exportError={null}
      />
    );
    const jpegExportButton = screen.getByTestId('jpeg-export-button');
    await userEvent.click(jpegExportButton);
    expect(mockOnExport).toHaveBeenCalledTimes(1);
    expect(mockOnExport).toHaveBeenCalledWith('jpeg');
  });
});
