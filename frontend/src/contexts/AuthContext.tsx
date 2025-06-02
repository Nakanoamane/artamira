import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authService';

interface User {
  id: number;
  email_address: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email_address: string, password: string) => Promise<boolean>;
  register: (email_address: string, password: string, password_confirmation: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email_address: string, password: string) => {
    const response = await apiLogin(email_address, password);
    if (response.user) {
      setUser(response.user);
      return true;
    }
    return false;
  };

  const register = async (email_address: string, password: string, password_confirmation: string) => {
    const response = await apiRegister(email_address, password, password_confirmation);
    if (response.user) {
      setUser(response.user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
