import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../../hooks/usePageTitle';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  usePageTitle('登録');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirmation) {
      setError('パスワードとパスワード（確認）が一致しません。');
      return;
    }
    const success = await register(email, password, passwordConfirmation);
    if (success) {
      navigate('/'); // 登録成功後、トップページへリダイレクト
    } else {
      setError('登録に失敗しました。メールアドレスが既に使用されているか、パスワードが短すぎます。');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-clay-white">
      <div className="px-8 py-6 mt-4 text-left bg-clay-white shadow-lg">
        <h3 className="text-2xl font-bold text-center">アカウント作成</h3>
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
            <div className="mt-4">
              <label className="block text-flint-gray" htmlFor="passwordConfirmation">Password (確認)</label>
              <input
                type="password"
                placeholder="Password (確認)"
                className="w-full px-4 py-2 mt-2 border border-light-gray rounded-md focus:outline-none focus:ring-1 focus:ring-cave-ochre"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                name="password_confirmation"
              />
            </div>
            {error && <p className="text-status-danger text-xs mt-2">{error}</p>}
            <div className="flex items-baseline justify-between">
              <a href="/login" className="text-sm text-stone-blue hover:underline">ログイン</a>
              <button
                type="submit"
                className="px-6 py-2 mt-4 text-clay-white bg-cave-ochre rounded-lg hover:bg-dark-cave-ochre"
              >
                登録
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
