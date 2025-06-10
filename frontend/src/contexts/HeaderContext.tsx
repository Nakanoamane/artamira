import React, { createContext, useState, useContext, ReactNode } from 'react';

// ヘッダーコンテキストの型定義
interface HeaderContextType {
  isCompactHeader: boolean;
  setCompactHeader: (isCompact: boolean) => void;
  showHeader: boolean;
  setShowHeader: (show: boolean) => void;
}

// コンテキストの作成
const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

// カスタムフック：コンテキストを使用するためのヘルパー
export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};

// プロバイダーコンポーネント
interface HeaderProviderProps {
  children: ReactNode;
}

export const HeaderProvider: React.FC<HeaderProviderProps> = ({ children }) => {
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  const setCompactHeader = (isCompact: boolean) => {
    setIsCompactHeader(isCompact);
  };

  return (
    <HeaderContext.Provider value={{ isCompactHeader, setCompactHeader, showHeader, setShowHeader }}>
      {children}
    </HeaderContext.Provider>
  );
};
