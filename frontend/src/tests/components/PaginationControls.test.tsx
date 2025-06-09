import { render, screen, fireEvent } from '@testing-library/react';
import PaginationControls from '../../components/PaginationControls';
import { vi } from 'vitest';
import React from 'react';

describe('PaginationControls', () => {
  const mockHandlePreviousPage = vi.fn();
  const mockHandleNextPage = vi.fn();
  const mockRenderPageNumbers = vi.fn();

  beforeEach(() => {
    mockHandlePreviousPage.mockReset();
    mockHandleNextPage.mockReset();
    mockRenderPageNumbers.mockReset();
  });

  it('「前へ」と「次へ」ボタン、およびページ番号を正しくレンダリングすること', () => {
    mockRenderPageNumbers.mockReturnValue([<button key="1">1</button>, <button key="2">2</button>]);

    render(
      <PaginationControls
        currentPage={1}
        totalPages={2}
        handlePreviousPage={mockHandlePreviousPage}
        handleNextPage={mockHandleNextPage}
        renderPageNumbers={mockRenderPageNumbers}
      />
    );

    expect(screen.getByText('前へ')).toBeInTheDocument();
    expect(screen.getByText('次へ')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(mockRenderPageNumbers).toHaveBeenCalledTimes(1);
  });

  it('最初のページで「前へ」ボタンが無効になること', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={5}
        handlePreviousPage={mockHandlePreviousPage}
        handleNextPage={mockHandleNextPage}
        renderPageNumbers={mockRenderPageNumbers}
      />
    );

    expect(screen.getByText('前へ')).toBeDisabled();
  });

  it('最後のページで「次へ」ボタンが無効になること', () => {
    render(
      <PaginationControls
        currentPage={5}
        totalPages={5}
        handlePreviousPage={mockHandlePreviousPage}
        handleNextPage={mockHandleNextPage}
        renderPageNumbers={mockRenderPageNumbers}
      />
    );

    expect(screen.getByText('次へ')).toBeDisabled();
  });

  it('「前へ」ボタンをクリックするとhandlePreviousPageが呼び出されること', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        handlePreviousPage={mockHandlePreviousPage}
        handleNextPage={mockHandleNextPage}
        renderPageNumbers={mockRenderPageNumbers}
      />
    );

    fireEvent.click(screen.getByText('前へ'));
    expect(mockHandlePreviousPage).toHaveBeenCalledTimes(1);
  });

  it('「次へ」ボタンをクリックするとhandleNextPageが呼び出されること', () => {
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        handlePreviousPage={mockHandlePreviousPage}
        handleNextPage={mockHandleNextPage}
        renderPageNumbers={mockRenderPageNumbers}
      />
    );

    fireEvent.click(screen.getByText('次へ'));
    expect(mockHandleNextPage).toHaveBeenCalledTimes(1);
  });
});
