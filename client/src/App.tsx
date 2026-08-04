import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { NoGroup } from './pages/NoGroup';
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { Members } from './pages/Members';
import { Profile } from './pages/Profile';
import { Settlements } from './pages/Settlements';

import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, group, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xl mx-auto animate-pulse">
            E
          </div>
          <p className="text-xs text-zinc-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!group && location.pathname !== '/no-group' && location.pathname !== '/profile') {
    return <Navigate to="/no-group" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col antialiased">
      <Navbar />
      <main className="flex-1 bg-white">
        {children}
      </main>
      {group && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/no-group"
              element={
                <ProtectedLayout>
                  <NoGroup />
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedLayout>
                  <Expenses />
                </ProtectedLayout>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedLayout>
                  <Members />
                </ProtectedLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedLayout>
                  <Profile />
                </ProtectedLayout>
              }
            />
            <Route
              path="/settlements"
              element={
                <ProtectedLayout>
                  <Settlements />
                </ProtectedLayout>
              }
            />

            {/* Default Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
