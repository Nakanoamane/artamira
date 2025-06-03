import { render, screen, fireEvent } from '@testing-library/react';
import ExportModal from '../../components/ExportModal';
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
      />
    );
    expect(screen.queryByText('絵をエクスポート')).not.toBeInTheDocument();
  });

  it('モーダルが開いているときに表示されること', () => {
    render(
      <ExportModal isOpen={true} onClose={mockOnClose} onExport={mockOnExport} />
    );
    expect(screen.getByText('絵をエクスポート')).toBeInTheDocument();
  });

  it('初期選択フォーマットがPNGであること', () => {
    render(
      <ExportModal isOpen={true} onClose={mockOnClose} onExport={mockOnExport} />
    );
    const pngRadio = screen.getByLabelText('PNG') as HTMLInputElement;
    expect(pngRadio.checked).toBe(true);
  });

  it('JPEGラジオボタンを選択するとフォーマットが変更されること', () => {
    render(
      <ExportModal isOpen={true} onClose={mockOnClose} onExport={mockOnExport} />
    );
    const jpegRadio = screen.getByLabelText('JPEG') as HTMLInputElement;
    fireEvent.click(jpegRadio);
    expect(jpegRadio.checked).toBe(true);
    const pngRadio = screen.getByLabelText('PNG') as HTMLInputElement;
    expect(pngRadio.checked).toBe(false);
  });

  it('「キャンセル」ボタンをクリックすると onClose が呼び出されること', () => {
    render(
      <ExportModal isOpen={true} onClose={mockOnClose} onExport={mockOnExport} />
    );
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('「ダウンロード」ボタンをクリックすると onExport と onClose が呼び出されること', () => {
    render(
      <ExportModal isOpen={true} onClose={mockOnClose} onExport={mockOnExport} />
    );
    const downloadButton = screen.getByRole('button', { name: 'ダウンロード' });
    fireEvent.click(downloadButton);
    expect(mockOnExport).toHaveBeenCalledTimes(1);
    expect(mockOnExport).toHaveBeenCalledWith('png'); // デフォルトはPNG
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('JPEGを選択後、「ダウンロード」ボタンをクリックすると onExport と onClose が呼び出されること', () => {
    render(
      <ExportModal isOpen={true} onClose={mockOnClose} onExport={mockOnExport} />
    );
    const jpegRadio = screen.getByLabelText('JPEG') as HTMLInputElement;
    fireEvent.click(jpegRadio);

    const downloadButton = screen.getByRole('button', { name: 'ダウンロード' });
    fireEvent.click(downloadButton);
    expect(mockOnExport).toHaveBeenCalledTimes(1);
    expect(mockOnExport).toHaveBeenCalledWith('jpeg'); // JPEGが選択されていることを確認
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
