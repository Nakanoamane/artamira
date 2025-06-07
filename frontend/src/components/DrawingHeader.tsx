import React from 'react';

interface DrawingHeaderProps {
  title: string;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

const DrawingHeader: React.FC<DrawingHeaderProps> = ({ title, isDirty, lastSavedAt }) => {
  return (
    <div className="flex justify-between items-center mb-3 px-8">
      <h1 className="text-2xl font-bold text-light-cave-ochre">{title}</h1>
      <div className="flex items-center gap-2 text-right min-h-[48px]">
        {isDirty && (
          <div className="text-orange-500 text-xs">未保存の変更があります</div>
        )}
        <div className="text-gray-500 text-xs">
          最終保存: {lastSavedAt ? lastSavedAt.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false, // 24時間表記
          }) : 'まだ保存されていません'}
        </div>
      </div>
    </div>
  );
};

export default DrawingHeader;
