import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import StationDetails from './pages/StationDetails';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider, useUser } from './context/UserContext';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useUser();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <UserProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/map" element={<MapPage />} />
                      <Route path="/station/:id" element={<StationDetails />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </UserProvider>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;