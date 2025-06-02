const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: number;
  email_address: string;
  // 他のユーザープロパティ
}

interface AuthResponse {
  message?: string;
  user?: User;
  errors?: string[];
  error?: string;
}

export const login = async (email_address: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_address, password }),
    credentials: 'include', // セッションクッキーを送信
  });

  const data: AuthResponse = await response.json();

  if (!response.ok) {
    // エラーハンドリング
    console.error('Login failed:', data.error || data.errors);
    return { error: data.error || (data.errors ? data.errors.join(', ') : 'Unknown error') };
  }
  return data;
};

export const register = async (email_address: string, password: string, password_confirmation: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user: { email_address, password, password_confirmation } }),
    credentials: 'include',
  });

  const data: AuthResponse = await response.json();

  if (!response.ok) {
    console.error('Registration failed:', data.error || data.errors);
    return { error: data.error || (data.errors ? data.errors.join(', ') : 'Unknown error') };
  }
  return data;
};

export const logout = async (): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/logout`, {
    method: 'DELETE',
    credentials: 'include',
  });

  // ログアウトは通常204 No Contentを返すため、json()は呼ばない
  if (!response.ok) {
    const data: AuthResponse = await response.json(); // エラー時はJSONレスポンスがある可能性も考慮
    console.error('Logout failed:', data.error);
    return { error: data.error || 'Unknown error during logout' };
  }
  return { message: "Logout successful" };
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 401) { // Not authenticated
      return null;
    }

    if (!response.ok) {
      console.error('Failed to fetch current user:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};
