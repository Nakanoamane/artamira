import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import DrawingBoard from './pages/DrawingBoard'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import { useAuth } from './contexts/AuthContext'
import React, { ReactNode } from 'react'
import Header from './components/Header'
import DrawingList from './pages/DrawingList'
import CreateDrawingForm from './pages/CreateDrawingForm'
import { HeaderProvider, useHeader } from './contexts/HeaderContext'
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ArrowPathIcon className="h-8 w-8 animate-spin mr-3" />
        <div className="text-2xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { loading } = useAuth();
  const { showHeader } = useHeader();

  return (
    <div className="min-h-screen bg-clay-white text-charcoal-black">
      {!loading && showHeader && <Header />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/drawings"
          element={
            <ProtectedRoute>
              <DrawingList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drawings/new"
          element={
            <ProtectedRoute>
              <CreateDrawingForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drawings/:id"
          element={
            <ProtectedRoute>
              <DrawingBoard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/drawings" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <HeaderProvider>
      <AppContent />
    </HeaderProvider>
  )
}

export default App
