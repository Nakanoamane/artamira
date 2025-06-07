import React from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  isExporting: boolean;
  exportError: string | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, isExporting, exportError }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">エクスポート</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">エクスポートするフォーマットを選択してください。</p>
            {exportError && (
              <p className="text-sm text-red-500 mt-2">{exportError}</p>
            )}
          </div>
          <div className="items-center px-4 py-3">
            {isExporting ? (
              <p className="text-stone-blue">エクスポート中...</p>
            ) : (
              <>
                <button
                  id="png-export-button"
                  data-testid="png-export-button"
                  onClick={() => onExport('png')}
                  className="px-4 py-2 bg-stone-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-moss-green focus:outline-none focus:ring-2 focus:ring-moss-green"
                >
                  PNGでエクスポート
                </button>
                <button
                  id="jpeg-export-button"
                  data-testid="jpeg-export-button"
                  onClick={() => onExport('jpeg')}
                  className="mt-2 px-4 py-2 bg-stone-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-moss-green focus:outline-none focus:ring-2 focus:ring-moss-green"
                >
                  JPEGでエクスポート
                </button>
              </>
            )}
            <button
              id="cancel-btn"
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
