import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: <DashboardOutlined style={{ fontSize: 19 }} /> },
    { label: 'Expenses', path: '/expenses', icon: <FileTextOutlined style={{ fontSize: 19 }} /> },
    { label: 'Members', path: '/members', icon: <TeamOutlined style={{ fontSize: 19 }} /> },
    { label: 'History', path: '/history', icon: <HistoryOutlined style={{ fontSize: 19 }} /> },
    { label: 'Profile', path: '/profile', icon: <UserOutlined style={{ fontSize: 19 }} /> },
  ];

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #e2e8f0',
        padding: '4px 6px calc(env(safe-area-inset-bottom, 0px) + 6px)',
        boxShadow: '0 -2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === '/history' && location.pathname === '/settlements');

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: 10,
                color: isActive ? '#2563eb' : '#64748b',
                transition: 'all 0.15s ease',
                fontWeight: isActive ? 600 : 500,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 26,
                  borderRadius: 14,
                  backgroundColor: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  marginBottom: 2,
                  transition: 'background-color 0.15s ease',
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: 10.5, lineHeight: 1.1 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
