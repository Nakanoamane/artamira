import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../hooks/usePageTitle';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  usePageTitle('ログイン');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await login(email, password);
    if (success) {
      navigate('/'); // ログイン成功後、トップページへリダイレクト
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-rock-linen">
      <div className="px-8 py-6 mt-4 text-left bg-rock-linen shadow-lg">
        <h3 className="text-2xl font-bold text-center">ログイン</h3>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block text-flint-gray" htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 mt-2 border border-light-gray rounded-md focus:outline-none focus:ring-1 focus:ring-cave-ochre"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                name="email"
              />
            </div>
            <div className="mt-4">
              <label className="block text-flint-gray" htmlFor="password">Password</label>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 mt-2 border border-light-gray rounded-md focus:outline-none focus:ring-1 focus:ring-cave-ochre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                name="password"
              />
            </div>
            {error && <p className="text-status-danger text-xs mt-2">{error}</p>}
            <div className="flex items-baseline justify-between">
              <button
                type="submit"
                className="px-6 py-2 mt-4 text-clay-white bg-cave-ochre rounded-lg hover:bg-dark-cave-ochre"
              >
                ログイン
              </button>
              <a href="/register" className="text-sm text-stone-blue hover:underline">アカウント作成</a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
