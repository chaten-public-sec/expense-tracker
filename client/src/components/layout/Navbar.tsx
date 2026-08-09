import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Space, Tooltip, Avatar, Dropdown, Badge, Popover, Flex, Empty } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../ui/Toast';

const { Text } = Typography;

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'expense:created': return <DollarOutlined style={{ color: '#1677ff', fontSize: 14 }} />;
    case 'expense:updated': return <EditOutlined style={{ color: '#faad14', fontSize: 14 }} />;
    case 'expense:deleted': return <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />;
    case 'settlement:created': return <SafetyCertificateOutlined style={{ color: '#722ed1', fontSize: 14 }} />;
    case 'settlement:verified': return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />;
    case 'group:member_joined': return <TeamOutlined style={{ color: '#13c2c2', fontSize: 14 }} />;
    default: return <BellOutlined style={{ color: '#1677ff', fontSize: 14 }} />;
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
  const { group, user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearNotifications } = useSocket();
  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      showSuccess(`Invite code ${group.inviteCode} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Sign Out',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const handleNotifClick = (notif: any) => {
    setNotifOpen(false);
    if (notif.type.startsWith('expense:')) {
      navigate('/expenses');
    } else if (notif.type.startsWith('settlement:')) {
      navigate('/settlements');
    } else if (notif.type === 'group:member_joined') {
      navigate('/members');
    }
  };

  const notificationContent = (
    <div style={{ width: 300, maxHeight: 380, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 10px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong style={{ fontSize: 14 }}>Notifications</Text>
        <Space size={4}>
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={markAllRead} style={{ fontSize: 11, padding: 0 }}>
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button type="link" size="small" danger onClick={clearNotifications} icon={<ClearOutlined />} style={{ fontSize: 11, padding: 0 }}>
              Clear
            </Button>
          )}
        </Space>
      </div>

      {/* Notification List */}
      {notifications.length > 0 ? (
        <Flex vertical>
          {notifications.slice(0, 15).map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                borderBottom: '1px solid #fafafa',
                background: notif.read ? '#fff' : '#f0f5ff',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>{getNotifIcon(notif.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12, display: 'block', lineHeight: 1.4, fontWeight: notif.read ? 400 : 600 }}>
                  {notif.message}
                </Text>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {formatTimeAgo(notif.timestamp)}
                </Text>
              </div>
              {!notif.read && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1677ff', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))}
        </Flex>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications yet" style={{ padding: '24px 0' }} />
      )}
    </div>
  );

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f0f0f0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        boxSizing: 'border-box',
      }}
    >
      {/* Brand / Active Group */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
        onClick={() => navigate('/dashboard')}
      >
        <Avatar
          style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
          shape="square"
          size={32}
          icon={<WalletOutlined style={{ fontSize: 16 }} />}
        />
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.2, margin: 0 }}>
            SplitWise
          </Text>
          {group ? (
            <Text type="secondary" ellipsis style={{ fontSize: 11, display: 'block', maxWidth: 120, lineHeight: 1.2 }}>
              {group.name}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.2 }}>
              No active group
            </Text>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <Space size={4} align="center">
        {group && (
          <Tooltip title="Tap to copy invite code">
            <Button
              size="small"
              onClick={copyInviteCode}
              icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: 11,
                height: 28,
                padding: '0 6px',
                borderRadius: 6,
                background: '#f8fafc',
              }}
            >
              {group.inviteCode}
            </Button>
          </Tooltip>
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
                markAllRead();
              }
            }}
            arrow={false}
            overlayInnerStyle={{ padding: 0, borderRadius: 12 }}
          >
            <Badge count={unreadCount} size="small" offset={[-2, 4]}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 17 }} />}
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Badge>
          </Popover>
        )}

        {user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow trigger={['click']}>
            <Avatar
              style={{
                backgroundColor: '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              size={30}
              icon={<UserOutlined />}
            >
              {user.fullName?.charAt(0).toUpperCase()}
            </Avatar>
          </Dropdown>
        )}
      </Space>
    </header>
  );
};
