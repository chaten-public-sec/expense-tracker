import React, { useState, useEffect } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Empty,
  Spin,
  Flex,
  Button,
  Image,
  Segmented,
  Badge,
} from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/Toast';
import { Settlement, OwedPerson } from '../types';
import api from '../services/api';
import { SettlementModal } from '../components/modals/SettlementModal';
import { UPIDetailModal } from '../components/modals/UPIDetailModal';
import { SettlementDetailsDrawer } from '../components/modals/SettlementDetailsDrawer';

const { Title, Text } = Typography;

export const History: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showSuccess, showError } = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('needs_attention');

  // Drawer / Modal states
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [settlementTarget, setSettlementTarget] = useState<OwedPerson | null>(null);
  const [upiModalUser, setUpiModalUser] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settlements');
      setSettlements(res.data || []);
    } catch (err: any) {
      console.error('Fetch History Error:', err);
      showError('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for real-time Socket.IO settlement events
  useEffect(() => {
    if (!socket) return;

    const handleSettlementUpdate = () => {
      loadData();
    };

    socket.on('settlement:updated', handleSettlementUpdate);
    socket.on('notification', handleSettlementUpdate);

    return () => {
      socket.off('settlement:updated', handleSettlementUpdate);
      socket.off('notification', handleSettlementUpdate);
    };
  }, [socket]);

  const currentUserId = user?._id?.toString();

  // Attention Center calculations:
  const needsAttentionList = settlements.filter(
    (s) => (s.receiver?._id || s.receiver)?.toString() === currentUserId && s.status === 'paid_pending_approval'
  );

  const yourPaymentsList = settlements.filter(
    (s) => (s.payer?._id || s.payer)?.toString() === currentUserId
  );

  const completedList = settlements.filter((s) => s.status === 'completed');

  // Filtered settlements according to activeTab
  const getFilteredSettlements = () => {
    switch (activeTab) {
      case 'needs_attention':
        return needsAttentionList;
      case 'your_payments':
        return yourPaymentsList;
      case 'completed':
        return completedList;
      case 'all':
      default:
        return settlements;
    }
  };

  const filteredList = getFilteredSettlements();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
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
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
            Completed
          </Tag>
        );
      case 'paid_pending_approval':
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
            Pending Verification
          </Tag>
        );
      case 'will_pay_soon':
        return (
          <Tag color="processing" icon={<ClockCircleOutlined />} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
            Will Pay Soon
          </Tag>
        );
      case 'rejected':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
            Rejected
          </Tag>
        );
      default:
        return <Tag style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>{status}</Tag>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div>
        <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          Settlement History
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Log of online UPI transfers, cash settlements, and verification approvals
        </Text>
      </div>

      {/* Attention Center Segmented Bar */}
      <Segmented
        block
        value={activeTab}
        onChange={(val) => setActiveTab(val as string)}
        options={[
          {
            label: (
              <Space orientation="horizontal" size={4}>
                <span>Needs Action</span>
                {needsAttentionList.length > 0 && (
                  <Badge count={needsAttentionList.length} style={{ backgroundColor: '#e11d48' }} />
                )}
              </Space>
            ),
            value: 'needs_attention',
          },
          {
            label: `Your Payments (${yourPaymentsList.length})`,
            value: 'your_payments',
          },
          {
            label: `Completed (${completedList.length})`,
            value: 'completed',
          },
          {
            label: `All (${settlements.length})`,
            value: 'all',
          },
        ]}
        style={{ padding: 4, borderRadius: 10 }}
      />

      {/* Settlements List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spin size="large" />
          <Text type="secondary">Loading settlements...</Text>
        </div>
      ) : filteredList.length > 0 ? (
        <Flex vertical gap={10}>
          {filteredList.map((st) => {
            const isPayer = currentUserId === (st.payer?._id || st.payer)?.toString();
            const isReceiver = currentUserId === (st.receiver?._id || st.receiver)?.toString();
            const payerName = isPayer ? 'You' : st.payer?.fullName || 'User';
            const receiverName = isReceiver ? 'You' : st.receiver?.fullName || 'User';
            const isPendingReceiverAction = isReceiver && st.status === 'paid_pending_approval';

            return (
              <Card
                key={st._id}
                hoverable
                onClick={() => setSelectedSettlement(st)}
                style={{
                  borderRadius: 14,
                  border: isPendingReceiverAction ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isPendingReceiverAction ? '#f8fafc' : '#ffffff',
                  boxShadow: isPendingReceiverAction ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                styles={{ body: { padding: 14 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: st.paymentMethod === 'cash' ? '#f0fdf4' : '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: st.paymentMethod === 'cash' ? '#16a34a' : '#2563eb',
                      }}
                    >
                      {st.paymentMethod === 'cash' ? (
                        <DollarOutlined style={{ fontSize: 18 }} />
                      ) : (
                        <ThunderboltOutlined style={{ fontSize: 18 }} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Text strong style={{ fontSize: 13, color: isPayer ? '#0f172a' : '#334155' }}>
                          {payerName}
                        </Text>
                        <ArrowRightOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
                        <Text strong style={{ fontSize: 13, color: isReceiver ? '#2563eb' : '#0f172a' }}>
                          {receiverName}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatDate(st.paidAt || st.createdAt)} • {st.paymentMethod === 'cash' ? 'Cash' : 'UPI Online'}
                      </Text>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="financial-num" style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      ₹{st.amount.toFixed(2)}
                    </div>
                    {getStatusTag(st.status)}
                  </div>
                </div>

                {/* Footer preview note or proof banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                  {st.proofUrl ? (
                    <Space size={6}>
                      <Image
                        src={st.proofUrl}
                        width={26}
                        height={26}
                        preview={false}
                        style={{ borderRadius: 4, objectFit: 'cover' }}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Proof Attached
                      </Text>
                    </Space>
                  ) : st.paymentMethod === 'cash' ? (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Cash payment
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {st.note || 'No note'}
                    </Text>
                  )}

                  <Button
                    size="small"
                    type="link"
                    icon={<EyeOutlined />}
                    style={{ padding: 0, fontSize: 12 }}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </Flex>
      ) : (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: '36px 16px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeTab === 'needs_attention'
                ? 'No payments pending your verification.'
                : 'No settlements found in this section.'
            }
          />
        </Card>
      )}

      {/* Settlement Details Drawer */}
      <SettlementDetailsDrawer
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
        settlement={selectedSettlement}
        onSettlementUpdated={loadData}
      />

      {/* Pay Settlement Modal */}
      <SettlementModal
        isOpen={!!settlementTarget}
        onClose={() => setSettlementTarget(null)}
        targetPerson={settlementTarget}
        onSettlementUpdated={loadData}
      />

      {/* UPI QR Modal */}
      <UPIDetailModal
        isOpen={!!upiModalUser}
        onClose={() => setUpiModalUser(null)}
        user={upiModalUser}
      />
    </div>
  );
};
