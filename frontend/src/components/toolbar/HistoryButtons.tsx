import React from 'react';

interface HistoryButtonsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryButtons = ({ onUndo, onRedo, canUndo, canRedo }: HistoryButtonsProps) => {
  return (
    <div className="mb-4 mr-4">
      <label className="block text-sm font-medium text-flint-gray mb-2">履歴</label>
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-md ${canUndo ? 'bg-moss-green text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          className={`px-4 py-2 rounded-md ${canRedo ? 'bg-moss-green text-clay-white' : 'bg-light-gray text-medium-gray cursor-not-allowed'}`}
          onClick={onRedo}
          disabled={!canRedo}
        >
          Redo
        </button>
      </div>
    </div>
  );
};

export default HistoryButtons;
