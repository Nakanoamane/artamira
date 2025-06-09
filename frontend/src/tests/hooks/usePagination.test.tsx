import { renderHook, act } from '@testing-library/react';
import usePagination from '../../hooks/usePagination';
import { vi } from 'vitest';
import React from 'react';

describe('usePagination', () => {
  let mockOnPageChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPageChange = vi.fn();
  });

  it('初期表示時に正しいページ番号を生成すること', () => {
    const { result } = renderHook(() =>
      usePagination({
        currentPage: 1,
        totalPages: 5,
        onPageChange: mockOnPageChange,
      })
    );

    const pageNumbers = result.current.renderPageNumbers();
    expect(pageNumbers.map((btn) => (btn as React.ReactElement).key)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('最大表示ページ数が制限されている場合に、正しいページ番号を生成すること', () => {
    const { result } = renderHook(() =>
      usePagination({
        currentPage: 3,
        totalPages: 10,
        onPageChange: mockOnPageChange,
        maxPagesToShow: 5,
      })
    );

    const pageNumbers = result.current.renderPageNumbers();
    expect(pageNumbers.map((btn) => (btn as React.ReactElement).key)).toEqual(['1', '2', '3', '4', '5']);

    const { result: result2 } = renderHook(() =>
      usePagination({
        currentPage: 8,
        totalPages: 10,
        onPageChange: mockOnPageChange,
        maxPagesToShow: 5,
      })
    );
    const pageNumbers2 = result2.current.renderPageNumbers();
    expect(pageNumbers2.map((btn) => (btn as React.ReactElement).key)).toEqual(['6', '7', '8', '9', '10']);

    const { result: result3 } = renderHook(() =>
      usePagination({
        currentPage: 1,
        totalPages: 3,
        onPageChange: mockOnPageChange,
        maxPagesToShow: 5,
      })
    );
    const pageNumbers3 = result3.current.renderPageNumbers();
    expect(pageNumbers3.map((btn) => (btn as React.ReactElement).key)).toEqual(['1', '2', '3']);
  });

  it('handlePreviousPageが正しいページ番号を呼び出すこと', () => {
    let currentPageProp = 3;
    const { result, rerender } = renderHook(
      (props) => usePagination(props),
      {
        initialProps: {
          currentPage: currentPageProp,
          totalPages: 5,
          onPageChange: mockOnPageChange,
          maxPagesToShow: 5,
        },
      }
    );

    act(() => {
      result.current.handlePreviousPage();
    });
    expect(mockOnPageChange).toHaveBeenCalledWith(2);

    currentPageProp = 2;
    rerender({
      currentPage: currentPageProp,
      totalPages: 5,
      onPageChange: mockOnPageChange,
      maxPagesToShow: 5,
    });
    mockOnPageChange.mockClear();

    act(() => {
      result.current.handlePreviousPage();
    });
    expect(mockOnPageChange).toHaveBeenCalledWith(1);

    currentPageProp = 1;
    rerender({
      currentPage: currentPageProp,
      totalPages: 5,
      onPageChange: mockOnPageChange,
      maxPagesToShow: 5,
    });
    mockOnPageChange.mockClear();

    act(() => {
      result.current.handlePreviousPage();
    });
    expect(mockOnPageChange).not.toHaveBeenCalled();
  });

  it('handleNextPageが正しいページ番号を呼び出すこと', () => {
    let currentPageProp = 1;
    const { result, rerender } = renderHook(
      (props) => usePagination(props),
      {
        initialProps: {
          currentPage: currentPageProp,
          totalPages: 5,
          onPageChange: mockOnPageChange,
          maxPagesToShow: 5,
        },
      }
    );

    act(() => {
      result.current.handleNextPage();
    });
    expect(mockOnPageChange).toHaveBeenCalledWith(2);

    currentPageProp = 2;
    rerender({
      currentPage: currentPageProp,
      totalPages: 5,
      onPageChange: mockOnPageChange,
      maxPagesToShow: 5,
    });
    mockOnPageChange.mockClear();

    act(() => {
      result.current.handleNextPage();
    });
    expect(mockOnPageChange).toHaveBeenCalledWith(3);

    currentPageProp = 3;
    rerender({
      currentPage: currentPageProp,
      totalPages: 5,
      onPageChange: mockOnPageChange,
      maxPagesToShow: 5,
    });
    mockOnPageChange.mockClear();

    currentPageProp = 5;
    rerender({
      currentPage: currentPageProp,
      totalPages: 5,
      onPageChange: mockOnPageChange,
      maxPagesToShow: 5,
    });

    act(() => {
      result.current.handleNextPage();
    });
    expect(mockOnPageChange).not.toHaveBeenCalled();
  });

  it('renderPageNumbersがボタンのクリックイベントを正しく伝播すること', () => {
    const { result } = renderHook(() =>
      usePagination({
        currentPage: 1,
        totalPages: 3,
        onPageChange: mockOnPageChange,
      })
    );

    const pageNumbers = result.current.renderPageNumbers();
    const secondPageButton = pageNumbers[1] as React.ReactElement<{ onClick: () => void; }>;

    act(() => {
      secondPageButton.props.onClick();
    });

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });
});
