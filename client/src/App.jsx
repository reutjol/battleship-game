import React from "react";
import "./styles/App.css";
import HomeScreen from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import GamePage from './pages/GamePage';
import LobbyPage from './pages/LobbyPage';
import NotFound from "./pages/NotFoundPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <div className="App">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        } />
        <Route path="/lobby" element={
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        } />
        <Route path="/game" element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AppRoutes />
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
