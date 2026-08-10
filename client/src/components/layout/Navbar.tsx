import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Button,
  Space,
  Tooltip,
  Avatar,
  Dropdown,
  Badge,
  Popover,
  Flex,
  Empty,
  Drawer,
  Tag,
  Divider,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  CopyOutlined,
  CheckOutlined,
  WalletOutlined,
  LogoutOutlined,
  BellOutlined,
  DollarOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ClearOutlined,
  CrownOutlined,
  MenuOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HistoryOutlined,
  RightOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../ui/Toast';
import { GroupQRModal } from '../modals/GroupQRModal';

const { Text, Title } = Typography;

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'expense:created': return <DollarOutlined style={{ color: '#2563eb', fontSize: 14 }} />;
    case 'expense:updated': return <EditOutlined style={{ color: '#faad14', fontSize: 14 }} />;
    case 'expense:deleted': return <DeleteOutlined style={{ color: '#ef4444', fontSize: 14 }} />;
    case 'settlement:created': return <SafetyCertificateOutlined style={{ color: '#722ed1', fontSize: 14 }} />;
    case 'settlement:verified':
    case 'settlement:approved': return <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 14 }} />;
    case 'group:member_joined': return <TeamOutlined style={{ color: '#06b6d4', fontSize: 14 }} />;
    default: return <BellOutlined style={{ color: '#2563eb', fontSize: 14 }} />;
  }
};

const formatTimeAgo = (ts: string) => {
  const now = new Date();
  const past = new Date(ts);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / (1000 * 60 * 60 * 24))}d ago`;
};

export const Navbar: React.FC = () => {
  const { group, user, userRole, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { showSuccess, confirmAction } = useToast();
  const [copied, setCopied] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isGroupQROpen, setIsGroupQROpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.isSuperAdmin || user?.email === 'admin@gmail.com';

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      showSuccess(`Invite code ${group.inviteCode} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = () => {
    confirmAction({
      title: 'Sign Out',
      content: 'Are you sure you want to sign out?',
      onOk: () => {
        setMobileDrawerOpen(false);
        logout();
        navigate('/login');
      },
      danger: true,
    });
  };

  const userMenuItems: MenuProps['items'] = [
    ...(isSuperAdmin
      ? [
          {
            key: 'admin',
            icon: <CrownOutlined style={{ color: '#faad14' }} />,
            label: 'Super Admin Console',
            onClick: () => navigate('/admin'),
          },
          {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Admin Account',
            onClick: () => navigate('/profile'),
          },
        ]
      : [
          {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'My Profile & Settings',
            onClick: () => navigate('/profile'),
          },
        ]),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Sign Out',
      onClick: handleSignOut,
    },
  ];

  const mobileNavItems = isSuperAdmin
    ? [
        { label: 'Admin Console', path: '/admin', icon: <CrownOutlined /> },
        { label: 'Admin Profile', path: '/profile', icon: <UserOutlined /> },
      ]
    : [
        { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlined /> },
        { label: 'Expenses', path: '/expenses', icon: <FileTextOutlined /> },
        { label: 'Members & Dues', path: '/members', icon: <TeamOutlined /> },
        { label: 'Settlement History', path: '/history', icon: <HistoryOutlined /> },
        { label: 'My Profile', path: '/profile', icon: <UserOutlined /> },
      ];

  const handleNotifClick = (notif: any) => {
    setNotifOpen(false);
    if (notif.type.startsWith('expense:')) {
      navigate('/expenses');
    } else if (notif.type.startsWith('settlement:')) {
      navigate('/history');
    } else if (notif.type === 'group:member_joined') {
      navigate('/members');
    }
  };

  const notificationContent = (
    <div style={{ width: 310, maxHeight: 380, overflowY: 'auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Text strong style={{ fontSize: 13 }}>
          Notifications
        </Text>
        <Space size={6}>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              onClick={markAllAsRead}
              style={{ fontSize: 11, padding: 0 }}
            >
              Mark all read
            </Button>
          )}
        </Space>
      </div>

      {/* Notification List */}
      {notifications.length > 0 ? (
        <Flex vertical>
          {notifications.slice(0, 20).map((notif) => (
            <div
              key={notif._id}
              onClick={() => {
                markAsRead(notif._id);
                handleNotifClick(notif);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                borderBottom: '1px solid #f8fafc',
                background: notif.read ? '#ffffff' : '#f0f7ff',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>{getNotifIcon(notif.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 12,
                    display: 'block',
                    lineHeight: 1.4,
                    fontWeight: notif.read ? 400 : 600,
                  }}
                >
                  {notif.message}
                </Text>
                <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block' }}>
                  {formatTimeAgo(notif.createdAt)}
                </Text>
              </div>
              {!notif.read && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#2563eb',
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
              )}
            </div>
          ))}
        </Flex>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No notifications yet"
          style={{ padding: '24px 0' }}
        />
      )}
    </div>
  );

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Mobile Drawer Trigger + Brand / Group Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {/* Mobile Hamburger Drawer Trigger (Visible only on mobile) */}
          <Button
            type="text"
            className="md:hidden"
            icon={<MenuOutlined style={{ fontSize: 18, color: '#334155' }} />}
            onClick={() => setMobileDrawerOpen(true)}
            style={{ width: 36, height: 36, padding: 0 }}
          />

          {/* Mobile Brand Link */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
            onClick={() => navigate(isSuperAdmin ? '/admin' : '/dashboard')}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                flexShrink: 0,
              }}
            >
              <WalletOutlined style={{ color: '#ffffff', fontSize: 16 }} />
            </div>

            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.2, margin: 0 }}>
                SplitWise
              </Text>
              {group ? (
                <Text
                  type="secondary"
                  ellipsis
                  style={{ fontSize: 11, display: 'block', maxWidth: 140, lineHeight: 1.2 }}
                >
                  {group.name}
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.2 }}>
                  {isSuperAdmin ? 'Platform Super Admin' : 'No active group'}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Group Code / Notifications / Avatar */}
        <Space size={6} align="center">
          {/* Group invite copy & QR share button for mobile header */}
          {!isSuperAdmin && group && (
            <Space size={4}>
              <Tooltip title="Show Group QR">
                <Button
                  size="small"
                  onClick={() => setIsGroupQROpen(true)}
                  icon={<QrcodeOutlined style={{ color: '#2563eb' }} />}
                  style={{
                    height: 28,
                    width: 28,
                    padding: 0,
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </Tooltip>

              <Tooltip title="Tap to copy invite code">
                <Button
                  size="small"
                  onClick={copyInviteCode}
                  icon={copied ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CopyOutlined />}
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: 11,
                    height: 28,
                    padding: '0 8px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {group.inviteCode}
                </Button>
              </Tooltip>
            </Space>
          )}

          {/* Super Admin Quick Badge */}
          {isSuperAdmin && (
            <Tag color="gold" icon={<CrownOutlined />} style={{ margin: 0 }}>
              Admin
            </Tag>
          )}

          {/* Notification Bell */}
          {user && (
            <Popover
              content={notificationContent}
              trigger="click"
              placement="bottomRight"
              open={notifOpen}
              onOpenChange={(open) => {
                setNotifOpen(open);
                if (open && unreadCount > 0) {
                  markAllAsRead();
                }
              }}
              arrow={false}
              overlayInnerStyle={{ padding: 0, borderRadius: 12 }}
            >
              <Badge count={unreadCount} size="small" offset={[-2, 4]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 18, color: '#475569' }} />}
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              </Badge>
            </Popover>
          )}

          {/* User Profile Avatar Dropdown */}
          {user && (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow trigger={['click']}>
              <Avatar
                style={{
                  backgroundColor: isSuperAdmin ? '#faad14' : '#0f172a',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid #ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                size={32}
                icon={isSuperAdmin ? <CrownOutlined /> : <UserOutlined />}
              >
                {!isSuperAdmin && user.fullName?.charAt(0).toUpperCase()}
              </Avatar>
            </Dropdown>
          )}
        </Space>
      </header>

      {/* ==========================================
          MOBILE NAVIGATION DRAWER (Slide-out panel)
          ========================================== */}
      <Drawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        placement="left"
        width={280}
        styles={{ body: { padding: '16px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header Profile Tile */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Avatar
              size={40}
              style={{
                backgroundColor: isSuperAdmin ? '#faad14' : '#0f172a',
                fontSize: 16,
                fontWeight: 600,
              }}
              icon={isSuperAdmin ? <CrownOutlined /> : <UserOutlined />}
            >
              {!isSuperAdmin && user?.fullName?.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong ellipsis style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
                {user?.fullName}
              </Text>
              <Text type="secondary" ellipsis style={{ fontSize: 11, display: 'block' }}>
                {user?.email}
              </Text>
              {isSuperAdmin ? (
                <Tag color="gold" style={{ fontSize: 10, marginTop: 3 }}>
                  Super Admin
                </Tag>
              ) : (
                userRole && (
                  <Tag color={userRole === 'creator' ? 'gold' : 'blue'} style={{ fontSize: 10, marginTop: 3 }}>
                    {userRole === 'creator' ? 'Group Admin' : 'Member'}
                  </Tag>
                )
              )}
            </div>
          </div>

          {/* Group Card in Drawer */}
          {!isSuperAdmin && group && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(37, 99, 235, 0.04)',
                borderRadius: 10,
                border: '1px solid rgba(37, 99, 235, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Active Group</Text>
                <Text strong style={{ fontSize: 12 }}>{group.name}</Text>
              </div>
              <Button
                size="small"
                icon={copied ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CopyOutlined />}
                onClick={copyInviteCode}
                style={{ fontSize: 11 }}
              >
                {group.inviteCode}
              </Button>
            </div>
          )}

          {/* Navigation Links List */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {mobileNavItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === '/history' && location.pathname === '/settlements');

              return (
                <div
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileDrawerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#2563eb' : '#334155',
                    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <Space size={10}>
                    <span style={{ color: isActive ? '#2563eb' : '#64748b', fontSize: 16 }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Space>
                  <RightOutlined style={{ fontSize: 11, color: '#94a3b8' }} />
                </div>
              );
            })}
          </nav>
        </div>

        {/* Drawer Bottom Action */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <Button
            danger
            block
            icon={<LogoutOutlined />}
            onClick={handleSignOut}
            style={{ borderRadius: 10 }}
          >
            Sign Out
          </Button>
        </div>
      </Drawer>

      {/* Group QR & Share Modal */}
      <GroupQRModal
        isOpen={isGroupQROpen}
        onClose={() => setIsGroupQROpen(false)}
      />
    </>
  );
};
