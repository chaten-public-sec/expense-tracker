import React, { useState, useEffect } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Empty,
  Spin,
  Flex,
} from 'antd';
import {
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useToast } from '../components/ui/Toast';
import { Settlement } from '../types';
import api from '../services/api';

const { Title, Text } = Typography;

export const Settlements: React.FC = () => {
  const { showError } = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettlements = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settlements');
      setSettlements(res.data || []);
    } catch (err: any) {
      console.error('Fetch Settlements Error:', err);
      showError('Failed to load settlement history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Verified
          </Tag>
        );
      case 'verification_pending':
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Pending OTP
          </Tag>
        );
      case 'expired':
        return (
          <Tag color="default" icon={<ExclamationCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Expired
          </Tag>
        );
      case 'cancelled':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Cancelled
          </Tag>
        );
      default:
        return <Tag style={{ margin: 0 }}>{status}</Tag>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Title level={4} style={{ margin: 0, fontSize: 18 }}>
          Settlements ({settlements.length})
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          OTP-verified dues payment records
        </Text>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spin size="large" />
          <Text type="secondary">Loading settlement records...</Text>
        </div>
      ) : settlements.length > 0 ? (
        <Flex vertical gap={10}>
          {settlements.map((s) => (
            <Card
              key={s._id}
              style={{ borderRadius: 14 }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space align="center" size={6}>
                  <Tag style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>{s.payer?.fullName?.split(' ')[0]}</Tag>
                  <ArrowRightOutlined style={{ color: '#9ca3af', fontSize: 11 }} />
                  <Tag style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>{s.receiver?.fullName?.split(' ')[0]}</Tag>
                </Space>
                <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
                  ₹{s.amount.toFixed(2)}
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatDate(s.createdAt)}
                </Text>
                {getStatusTag(s.status)}
              </div>
            </Card>
          ))}
        </Flex>
      ) : (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: '32px 0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No settlements recorded yet."
          />
        </Card>
      )}
    </div>
  );
};
