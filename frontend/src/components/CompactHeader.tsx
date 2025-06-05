import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRightStartOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline';

const CompactHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false); // ログアウト後にメニューを閉じる
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-cave-ochre text-clay-white p-4 shadow-md flex items-center">
      <Link to="/" className="text-2xl font-bold mr-4">Artamira</Link>
      <div className="relative">
        <button onClick={toggleMenu} className="p-2 rounded-lg hover:bg-dark-cave-ochre">
          <Bars3Icon className="h-6 w-6 text-clay-white" />
        </button>
        {isMenuOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-cave-ochre rounded-md shadow-lg z-10">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-left text-clay-white hover:bg-dark-cave-ochre rounded-md"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5 mr-2" />
                ログアウト
              </button>
            ) : (
              <div className="p-2">
                <Link to="/login" className="block px-2 py-1.5 rounded-lg bg-stone-blue hover:bg-dark-stone-blue text-center mb-2">ログイン</Link>
                <Link to="/register" className="block px-2 py-1.5 rounded-lg bg-moss-green hover:bg-dark-moss-green text-center">登録</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default CompactHeader;
