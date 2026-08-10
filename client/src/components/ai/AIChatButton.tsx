import React from 'react';
import { Button, Tooltip, Badge } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

interface AIChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AIChatButton: React.FC<AIChatButtonProps> = ({ onClick, isOpen }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin || user?.email === 'admin@gmail.com';

  // Super Admin does not participate in user groups
  if (isSuperAdmin || isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        right: 20,
        zIndex: 99,
      }}
    >
      <Tooltip title="SplitWise AI Financial Assistant" placement="left">
        <Button
          type="primary"
          shape="circle"
          onClick={onClick}
          aria-label="Open AI Financial Assistant"
          style={{
            width: 52,
            height: 52,
            backgroundColor: '#2563eb',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff',
          }}
          icon={<RobotOutlined style={{ fontSize: 24, color: '#ffffff' }} />}
        />
      </Tooltip>
    </div>
  );
};
