import { Routes, Route, Navigate } from 'react-router-dom'
import DrawingBoard from './pages/DrawingBoard'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import { useAuth } from './contexts/AuthContext'
import React, { ReactNode } from 'react'
import Header from './components/Header'
import CompactHeader from './components/CompactHeader'
import DrawingList from './pages/DrawingList'
import CreateDrawingForm from './pages/CreateDrawingForm'
import { HeaderProvider, useHeader } from './contexts/HeaderContext'

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

const AppContent: React.FC = () => {
  const { isCompactHeader } = useHeader();

  return (
    <div className="min-h-screen bg-gray-100">
      {isCompactHeader ? <CompactHeader /> : <Header />}
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
