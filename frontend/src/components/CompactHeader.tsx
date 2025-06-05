import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRightStartOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline';

const CompactHeader: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false); // ログアウト後にメニューを閉じる
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="absolute top-0 left-0 m-4 z-20">
      <div className="bg-cave-ochre text-clay-white p-2 rounded-lg shadow-md flex items-center space-x-2">
        <Link to="/" className="text-xl font-bold">Artamira</Link>
        <div className="relative">
          <button onClick={toggleMenu} className="p-1 rounded-lg hover:bg-dark-cave-ochre">
            <Bars3Icon className="h-5 w-5 text-clay-white" />
          </button>
          {isMenuOpen && (
            <div className="absolute top-8 left-0 mt-2 w-36 bg-cave-ochre rounded-md shadow-lg z-10">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-1.5 text-left text-clay-white hover:bg-dark-cave-ochre rounded-md text-sm"
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-1" />
                  ログアウト
                </button>
              ) : (
                <div className="p-1">
                  <Link to="/login" className="block px-2 py-1 rounded-lg bg-stone-blue hover:bg-dark-stone-blue text-center text-sm mb-1">ログイン</Link>
                  <Link to="/register" className="block px-2 py-1 rounded-lg bg-moss-green hover:bg-dark-moss-green text-center text-sm">登録</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default CompactHeader;
