import React, { useState, useEffect } from 'react';
import {
  Card,
  Avatar,
  Tag,
  Typography,
  Space,
  Empty,
  Spin,
  Flex,
  Button,
} from 'antd';
import {
  CrownOutlined,
  RightOutlined,
  UserOutlined,
  SendOutlined,
  WalletOutlined,
  TeamOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { GroupMember, OwedPerson } from '../types';
import api from '../services/api';

import { MemberDetailModal } from '../components/modals/MemberDetailModal';
import { SettlementModal } from '../components/modals/SettlementModal';
import { GroupQRModal } from '../components/modals/GroupQRModal';

const { Title, Text } = Typography;

export const Members: React.FC = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [isGroupQROpen, setIsGroupQROpen] = useState(false);

  // Settlement trigger
  const [settlementTarget, setSettlementTarget] = useState<OwedPerson | null>(null);
  const [remindLoadingMap, setRemindLoadingMap] = useState<Record<string, boolean>>({});

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/groups/info');
      setMembers(res.data.members || []);
      setGroupName(res.data.group?.name || '');
    } catch (err: any) {
      console.error('Fetch Members Error:', err);
      showError('Failed to load group members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSendReminder = async (targetUserId: string, targetName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRemindLoadingMap((prev) => ({ ...prev, [targetUserId]: true }));
      await api.post('/groups/remind-member', { targetUserId });
      showSuccess(`Payment reminder sent to ${targetName}!`);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setRemindLoadingMap((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Group Members ({members.length})
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {groupName || 'Flatmates in active group'}
          </Text>
        </div>

        <Button
          icon={<QrcodeOutlined style={{ color: '#2563eb' }} />}
          onClick={() => setIsGroupQROpen(true)}
          style={{ borderRadius: 10, fontWeight: 600, fontSize: 13 }}
        >
          Share QR
        </Button>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spin size="large" />
          <Text type="secondary">Loading member directory...</Text>
        </div>
      ) : members.length > 0 ? (
        <Flex vertical gap={10}>
          {members.map((m) => {
            const netBalance = (m.totalReceives || 0) - (m.totalOwes || 0);
            const isCurrentUser = user && user._id === m._id;

            return (
              <Card
                key={m._id}
                hoverable
                onClick={() => setSelectedMember(m)}
                style={{
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: isCurrentUser ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                }}
                styles={{ body: { padding: 14 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Space align="center" size={10}>
                    <Avatar
                      size={42}
                      style={{
                        backgroundColor: m.role === 'creator' ? '#0f172a' : '#2563eb',
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                      icon={<UserOutlined />}
                    >
                      {m.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <Space size={6} align="center">
                        <Text strong style={{ fontSize: 14 }}>
                          {m.fullName}
                        </Text>
                        {isCurrentUser && (
                          <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4 }}>
                            You
                          </Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {m.phone || m.email}
                      </Text>
                    </div>
                  </Space>

                  <Tag
                    color={m.role === 'creator' ? 'gold' : 'default'}
                    icon={m.role === 'creator' ? <CrownOutlined /> : undefined}
                    style={{ margin: 0, fontSize: 10, borderRadius: 4 }}
                  >
                    {m.role === 'creator' ? 'Admin' : 'Member'}
                  </Tag>
                </div>

                {/* Net metrics chip */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <Space size={12} wrap>
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Paid</Text>
                      <Text strong style={{ fontSize: 12 }} className="financial-num">
                        ₹{(m.totalPaid || 0).toFixed(2)}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Group Share</Text>
                      <Text strong style={{ fontSize: 12, color: '#2563eb' }} className="financial-num">
                        ₹{(m.everyoneShare || 0).toFixed(2)}
                      </Text>
                    </div>
                  </Space>

                  <div style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Net Balance</Text>
                    <div
                      className="financial-num"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: netBalance > 0 ? '#16a34a' : netBalance < 0 ? '#dc2626' : '#64748b',
                      }}
                    >
                      {netBalance > 0
                        ? `+₹${netBalance.toFixed(2)}`
                        : netBalance < 0
                        ? `-₹${Math.abs(netBalance).toFixed(2)}`
                        : '₹0.00'}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </Flex>
      ) : (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: '36px 16px' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No members in this group." />
        </Card>
      )}

      {/* Member Details Modal */}
      <MemberDetailModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
      />

      <SettlementModal
        isOpen={!!settlementTarget}
        onClose={() => setSettlementTarget(null)}
        targetPerson={settlementTarget}
        onSettlementUpdated={fetchMembers}
      />

      <GroupQRModal
        isOpen={isGroupQROpen}
        onClose={() => setIsGroupQROpen(false)}
      />
    </div>
  );
};
