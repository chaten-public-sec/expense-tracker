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
} from 'antd';
import {
  CrownOutlined,
  RightOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useToast } from '../components/ui/Toast';
import { GroupMember, OwedPerson } from '../types';
import api from '../services/api';

import { MemberDetailModal } from '../components/modals/MemberDetailModal';
import { SettlementModal } from '../components/modals/SettlementModal';

const { Title, Text } = Typography;

export const Members: React.FC = () => {
  const { showError } = useToast();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  // Settlement trigger
  const [settlementTarget, setSettlementTarget] = useState<OwedPerson | null>(null);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div>
        <Title level={4} style={{ margin: 0, fontSize: 18 }}>
          Group Members ({members.length})
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {groupName || 'Flatmates in group'}
        </Text>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spin size="large" />
          <Text type="secondary">Loading members...</Text>
        </div>
      ) : members.length > 0 ? (
        <Flex vertical gap={10}>
          {members.map((m) => {
            const netBalance = (m.totalReceives || 0) - (m.totalOwes || 0);

            return (
              <Card
                key={m._id}
                hoverable
                onClick={() => setSelectedMember(m)}
                style={{
                  borderRadius: 14,
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: 14 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Space align="center" size={10}>
                    <Avatar
                      size={40}
                      style={{
                        backgroundColor: m.role === 'creator' ? '#0f172a' : '#1677ff',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                      icon={<UserOutlined />}
                    >
                      {m.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text strong style={{ fontSize: 14, display: 'block' }}>
                        {m.fullName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {m.phone || m.email}
                      </Text>
                    </div>
                  </Space>

                  <Tag
                    color={m.role === 'creator' ? 'gold' : 'default'}
                    icon={m.role === 'creator' ? <CrownOutlined /> : undefined}
                    style={{ margin: 0, fontSize: 10 }}
                  >
                    {m.role === 'creator' ? 'Owner' : 'Member'}
                  </Tag>
                </div>

                {/* Net metrics chip */}
                <div
                  style={{
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <Space size={10} wrap>
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Paid</Text>
                      <Text strong style={{ fontSize: 12 }}>₹{(m.totalPaid || 0).toFixed(2)}</Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Group Share</Text>
                      <Text strong style={{ fontSize: 12, color: '#1677ff' }}>₹{(m.everyoneShare || 0).toFixed(2)}</Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Individual</Text>
                      <Text strong style={{ fontSize: 12, color: '#722ed1' }}>₹{(m.specificShare || 0).toFixed(2)}</Text>
                    </div>
                  </Space>

                  <div style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Net Balance</Text>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: netBalance > 0 ? '#10b981' : netBalance < 0 ? '#ef4444' : '#6b7280',
                      }}
                    >
                      {netBalance > 0
                        ? `+₹${netBalance.toFixed(2)}`
                        : netBalance < 0
                        ? `-₹${Math.abs(netBalance).toFixed(2)}`
                        : '₹0.00'}
                    </Text>
                  </div>
                </div>
              </Card>
            );
          })}
        </Flex>
      ) : (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: '32px 0' }}>
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
    </div>
  );
};
