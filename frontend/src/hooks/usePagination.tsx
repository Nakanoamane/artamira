import React from 'react';

interface UsePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  maxPagesToShow?: number;
}

interface UsePaginationResult {
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  renderPageNumbers: () => React.ReactNode[];
}

const usePagination = ({ currentPage, totalPages, onPageChange, maxPagesToShow = 5 }: UsePaginationProps): UsePaginationResult => {
  const handlePreviousPage = () => {
    onPageChange(Math.max(currentPage - 1, 1));
  };

  const handleNextPage = () => {
    onPageChange(Math.min(currentPage + 1, totalPages));
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`mx-1 px-3 py-1 rounded ${currentPage === i ? 'bg-cave-ochre text-clay-white' : 'bg-light-gray text-dark-gray hover:bg-medium-gray'}`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };

  return {
    handlePreviousPage,
    handleNextPage,
    renderPageNumbers,
  };
};

export default usePagination;
