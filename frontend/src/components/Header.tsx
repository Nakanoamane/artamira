import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold">Artamira</Link>
      <nav>
        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <span>ようこそ、{user?.email_address}さん</span>
            <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-700">
              ログアウト
            </button>
          </div>
        ) : (
          <div className="space-x-4">
            <Link to="/login" className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800">ログイン</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600">登録</Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
