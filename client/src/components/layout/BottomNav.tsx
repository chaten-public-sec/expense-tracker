import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: <DashboardOutlined style={{ fontSize: 18 }} /> },
    { label: 'Expenses', path: '/expenses', icon: <FileTextOutlined style={{ fontSize: 18 }} /> },
    { label: 'Members', path: '/members', icon: <TeamOutlined style={{ fontSize: 18 }} /> },
    { label: 'Settle', path: '/settlements', icon: <SafetyCertificateOutlined style={{ fontSize: 18 }} /> },
    { label: 'Profile', path: '/profile', icon: <UserOutlined style={{ fontSize: 18 }} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #eef2f6',
        padding: '6px 4px calc(env(safe-area-inset-bottom, 0px) + 6px)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 8,
                color: isActive ? '#1677ff' : '#94a3b8',
                transition: 'all 0.15s ease',
                fontWeight: isActive ? 600 : 400,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 24,
                  borderRadius: 12,
                  background: isActive ? 'rgba(22, 119, 255, 0.1)' : 'transparent',
                  marginBottom: 2,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: 11, lineHeight: 1 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
