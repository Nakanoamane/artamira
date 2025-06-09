import { User } from '../contexts/AuthContext'; // User型をインポート

interface Drawing {
  id: number;
  title: string;
}

interface DrawingsResponse {
  drawings: Drawing[];
  meta: {
    total_pages: number;
    current_page: number;
    per_page: number;
    total_count: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const createDrawing = async (title: string, userId: User['id']): Promise<Drawing> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/drawings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`, // 認証トークンが必要な場合はここで一元管理
    },
    body: JSON.stringify({ drawing: { title, user_id: userId } }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const fetchDrawingsApi = async (page: number, perPage: number): Promise<DrawingsResponse> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/drawings?page=${page}&per_page=${perPage}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
