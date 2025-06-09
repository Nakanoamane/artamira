import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { createDrawing } from '../services/drawingService'; // 新しく作成するAPIサービス

export const useCreateDrawing = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateDrawing = async (title: string) => {
    setLoading(true);
    setError(null);

    if (!user) {
      setError('ユーザーが認証されていません。');
      setLoading(false);
      return;
    }

    try {
      const newDrawing = await createDrawing(title, user.id);
      navigate(`/drawings/${newDrawing.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { handleCreateDrawing, loading, error };
};
