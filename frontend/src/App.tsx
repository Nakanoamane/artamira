import { Routes, Route, Navigate } from 'react-router'
import DrawingBoard from './pages/DrawingBoard'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import { useAuth } from './contexts/AuthContext'
import React, { ReactNode } from 'react'
import Header from './components/Header'
import { usePageTitle } from './hooks/usePageTitle'
import DrawingList from './pages/DrawingList'
import CreateDrawingForm from './pages/CreateDrawingForm'

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
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

export default App
