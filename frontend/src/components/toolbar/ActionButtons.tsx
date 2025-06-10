import React from 'react';

interface ActionButtonsProps {
  onSave: () => void;
  isDirty: boolean;
  onExportClick: () => void;
}

const ActionButtons = ({ onSave, isDirty, onExportClick }: ActionButtonsProps) => {
  return (
    <div className="mb-4 mr-4">
      <label className="block text-sm font-medium text-flint-gray mb-2">操作</label>
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-md ${isDirty ? 'bg-stone-blue text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
          onClick={onSave}
          disabled={!isDirty}
        >
          保存 {isDirty && '*'}
        </button>
        <button
          className="px-4 py-2 rounded-md border-2 border-stone-blue text-flint-gray hover:bg-stone-blue hover:text-clay-white"
          onClick={onExportClick}
        >
          エクスポート
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
