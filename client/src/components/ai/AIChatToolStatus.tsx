import React from 'react';
import { Space, Spin, Typography } from 'antd';
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AIChatToolStatusProps {
  status: string;
}

export const AIChatToolStatus: React.FC<AIChatToolStatusProps> = ({ status }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        border: '1px solid #e2e8f0',
        fontSize: 12,
        color: '#475569',
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <Spin indicator={<LoadingOutlined style={{ fontSize: 13, color: '#2563eb' }} spin />} />
      <Text style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
        {status}
      </Text>
    </div>
  );
};
