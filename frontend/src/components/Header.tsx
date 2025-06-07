import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="text-dark-cave-ochre p-4 flex justify-between items-center">
      <Link to="/" className="hover:opacity-80 transition-opacity duration-200">
        <img src="/images/logo-text-icon.svg" alt="Artamira Logo" className="h-8" />
      </Link>
      <nav>
        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <span>ようこそ、{user?.email_address}さん</span>
            <button onClick={handleLogout} className="group relative flex items-center px-3 py-1.5 rounded-lg text-sm hover:bg-dark-cave-ochre transition-colors duration-200 hover:text-clay-white">
              <ArrowRightStartOnRectangleIcon className="h-5 w-4" />
              <span className="text-dark-cave-ochre absolute -bottom-6 right-1/2 translate-x-1/2 mt-1 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                ログアウト
              </span>
            </button>
          </div>
        ) : (
          <div className="space-x-4 text-clay-white">
            <Link to="/login" className="px-4 py-2 rounded-lg bg-stone-blue hover:bg-dark-stone-blue">ログイン</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-moss-green hover:bg-dark-moss-green">登録</Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
