import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const NoGroup = lazy(() => import('./pages/NoGroup').then(m => ({ default: m.NoGroup })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Members = lazy(() => import('./pages/Members').then(m => ({ default: m.Members })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const PageLoader: React.FC = () => (
  <div
    style={{
      minHeight: '60dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 20,
    }}
  >
    <Spin size="large" />
    <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Loading...</span>
  </div>
);

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, group, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user?.isSuperAdmin || user?.email === 'admin@gmail.com';

  if (!group && !isSuperAdmin && location.pathname !== '/no-group' && location.pathname !== '/profile' && location.pathname !== '/admin') {
    return <Navigate to="/no-group" replace />;
  }

  if (group && location.pathname === '/no-group') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mobile-app-container">
      <Navbar />
      <main style={{ flex: 1, padding: '12px 12px 76px', width: '100%' }}>
        {children}
      </main>
      {(group || isSuperAdmin) && <BottomNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 10,
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
            fontSize: 14,
            colorText: '#1f2937',
            colorTextHeading: '#111827',
            colorBgContainer: '#ffffff',
            colorBgLayout: '#f8fafc',
            controlHeight: 42,
          },
          components: {
            Button: {
              controlHeight: 42,
              borderRadius: 10,
              fontWeight: 600,
            },
            Input: {
              controlHeight: 42,
              borderRadius: 10,
            },
            Select: {
              controlHeight: 42,
              borderRadius: 10,
            },
            Card: {
              borderRadiusLG: 14,
            },
            Modal: {
              borderRadiusLG: 16,
            },
          },
        }}
      >
        <AntdApp>
          <ToastProvider>
            <AuthProvider>
              <SocketProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <Suspense fallback={<PageLoader />}>
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
                      path="/history"
                      element={
                        <ProtectedLayout>
                          <History />
                        </ProtectedLayout>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedLayout>
                          <AdminDashboard />
                        </ProtectedLayout>
                      }
                    />
                    <Route
                      path="/settlements"
                      element={
                        <ProtectedLayout>
                          <History />
                        </ProtectedLayout>
                      }
                    />

                    {/* Default Catch-all */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              </SocketProvider>
            </AuthProvider>
          </ToastProvider>
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;
