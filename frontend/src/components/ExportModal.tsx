import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpeg'>('png');

  if (!isOpen) return null;

  const handleExportClick = () => {
    onExport(selectedFormat);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4">絵をエクスポート</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">フォーマットを選択:</label>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                value="png"
                checked={selectedFormat === 'png'}
                onChange={() => setSelectedFormat('png')}
              />
              <span className="ml-2">PNG</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                value="jpeg"
                checked={selectedFormat === 'jpeg'}
                onChange={() => setSelectedFormat('jpeg')}
              />
              <span className="ml-2">JPEG</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={handleExportClick}
          >
            ダウンロード
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
