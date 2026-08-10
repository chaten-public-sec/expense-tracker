import React from 'react';
import { Space, Typography, Button, Tag, Popconfirm } from 'antd';
import { RobotOutlined, CloseOutlined, RedoOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

interface AIChatHeaderProps {
  onClose: () => void;
  onNewChat: () => void;
  hasMessages: boolean;
}

export const AIChatHeader: React.FC<AIChatHeaderProps> = ({
  onClose,
  onNewChat,
  hasMessages,
}) => {
  const { group } = useAuth();

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
      }}
    >
      <Space size={10} align="center">
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          }}
        >
          <RobotOutlined style={{ color: '#ffffff', fontSize: 18 }} />
        </div>
        <div>
          <Title level={5} style={{ margin: 0, fontSize: 15, lineHeight: 1.2, fontWeight: 700 }}>
            SplitWise AI
          </Title>
          {group && (
            <Text type="secondary" ellipsis style={{ fontSize: 11, maxWidth: 160, display: 'block' }}>
              {group.name}
            </Text>
          )}
        </div>
      </Space>

      <Space size={6}>
        {hasMessages && (
          <Popconfirm
            title="Start a new chat?"
            description="Your current conversation will be cleared from session memory."
            onConfirm={onNewChat}
            okText="New Chat"
            cancelText="Cancel"
            okButtonProps={{ danger: true, size: 'small' }}
            cancelButtonProps={{ size: 'small' }}
          >
            <Button
              size="small"
              icon={<RedoOutlined />}
              style={{ fontSize: 12, borderRadius: 6 }}
            >
              New Chat
            </Button>
          </Popconfirm>
        )}

        <Button
          type="text"
          size="small"
          icon={<CloseOutlined style={{ fontSize: 14, color: '#64748b' }} />}
          onClick={onClose}
          style={{ width: 28, height: 28, padding: 0 }}
        />
      </Space>
    </div>
  );
};
