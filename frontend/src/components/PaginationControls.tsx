import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  renderPageNumbers: () => React.ReactNode[];
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  handlePreviousPage,
  handleNextPage,
  renderPageNumbers,
}) => {
  return (
    <div className="flex justify-center items-center mt-6 space-x-2">
      <button
        onClick={handlePreviousPage}
        disabled={currentPage === 1}
        className="bg-light-gray text-dark-gray font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-medium-gray"
      >
        前へ
      </button>
      {renderPageNumbers()}
      <button
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
        className="bg-light-gray text-dark-gray font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-medium-gray"
      >
        次へ
      </button>
    </div>
  );
};

export default PaginationControls;
