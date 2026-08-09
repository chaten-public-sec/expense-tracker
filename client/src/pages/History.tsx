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
  Popconfirm,
  Avatar,
  Divider,
} from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  PictureOutlined,
  PlusOutlined,
  SendOutlined,
  UserOutlined,
  QrcodeOutlined,
  CreditCardOutlined,
  DollarOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Settlement, OwedPerson, DashboardData } from '../types';
import api from '../services/api';
import { SettlementModal } from '../components/modals/SettlementModal';
import { UPIDetailModal } from '../components/modals/UPIDetailModal';

const { Title, Text } = Typography;

export const History: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settlement modal state
  const [settlementTarget, setSettlementTarget] = useState<OwedPerson | null>(null);
  const [upiModalUser, setUpiModalUser] = useState<any | null>(null);
  const [remindLoadingMap, setRemindLoadingMap] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [settlementsRes, dashRes] = await Promise.all([
        api.get('/settlements'),
        api.get('/dashboard'),
      ]);
      setSettlements(settlementsRes.data || []);
      setDashboardData(dashRes.data || null);
    } catch (err: any) {
      console.error('Fetch History Error:', err);
      showError('Failed to load history and dues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendReminder = async (targetUserId: string, targetName: string) => {
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

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/settlements/${id}/approve`);
      showSuccess('Payment proof approved and settlement completed!');
      loadData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to approve settlement');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/settlements/${id}/reject`);
      showSuccess('Settlement payment proof rejected.');
      loadData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to reject settlement');
    }
  };

  const handleDeleteProof = async (id: string) => {
    try {
      await api.delete(`/settlements/${id}/proof`);
      showSuccess('Payment proof deleted from Cloudinary!');
      loadData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete payment proof');
    }
  };

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
            Completed
          </Tag>
        );
      case 'paid_pending_approval':
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Proof Pending Approval
          </Tag>
        );
      case 'will_pay_soon':
        return (
          <Tag color="processing" icon={<SendOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Will Pay Soon
          </Tag>
        );
      case 'rejected':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Rejected
          </Tag>
        );
      case 'cancelled':
        return (
          <Tag color="default" icon={<ExclamationCircleOutlined />} style={{ margin: 0, fontSize: 10 }}>
            Cancelled
          </Tag>
        );
      default:
        return <Tag style={{ margin: 0 }}>{status}</Tag>;
    }
  };

  const youNeedToPayList = dashboardData?.balances?.youNeedToPayList || [];
  const youWillReceiveList = dashboardData?.balances?.youWillReceiveList || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div>
        <Title level={4} style={{ margin: 0, fontSize: 18 }}>
          History & Payments
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Pay flatmates dues, scan QR codes, and review payment proofs
        </Text>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spin size="large" />
          <Text type="secondary">Loading history and active dues...</Text>
        </div>
      ) : (
        <>
          {/* SECTION 1: Flatmates You Owe ("kisko kitna dena hai") */}
          <Card
            title={
              <Space size={6}>
                <DollarOutlined style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 14 }}>Flatmates You Owe (Pay Dues)</span>
              </Space>
            }
            style={{ borderRadius: 14 }}
            styles={{ body: { padding: 12 } }}
          >
            {youNeedToPayList.length > 0 ? (
              <Flex vertical gap={8}>
                {youNeedToPayList.map((person) => (
                  <div
                    key={person.user._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#fafafa',
                      borderRadius: 10,
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Space size={8} align="center">
                      <Avatar size={36} style={{ backgroundColor: '#0f172a' }} icon={<UserOutlined />}>
                        {person.user.fullName?.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
                          {person.user.fullName}
                        </Text>
                        <Text type="danger" style={{ fontSize: 12, fontWeight: 600 }}>
                          Owe ₹{person.amount.toFixed(2)}
                        </Text>
                      </div>
                    </Space>

                    <Space size={6}>
                      <Button
                        size="small"
                        icon={<QrcodeOutlined />}
                        onClick={() => setUpiModalUser({
                          _id: person.user._id,
                          fullName: person.user.fullName,
                          email: person.user.email,
                          phone: person.user.phone,
                          upiId: person.user.upiId || '',
                          qrCodeUrl: person.user.qrCodeUrl || null,
                        })}
                      >
                        QR Code
                      </Button>

                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => setSettlementTarget(person)}
                      >
                        Pay Now
                      </Button>
                    </Space>
                  </div>
                ))}
              </Flex>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="You do not owe money to any flatmate!"
                style={{ margin: '12px 0' }}
              />
            )}
          </Card>

          {/* SECTION 2: Flatmates Who Owe You */}
          {youWillReceiveList.length > 0 && (
            <Card
              title={
                <Space size={6}>
                  <CreditCardOutlined style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 14 }}>Flatmates Who Owe You</span>
                </Space>
              }
              style={{ borderRadius: 14 }}
              styles={{ body: { padding: 12 } }}
            >
              <Flex vertical gap={8}>
                {youWillReceiveList.map((person) => (
                  <div
                    key={person.user._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#fafafa',
                      borderRadius: 10,
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Space size={8} align="center">
                      <Avatar size={36} style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
                        {person.user.fullName?.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
                          {person.user.fullName}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                          Owes you ₹{person.amount.toFixed(2)}
                        </Text>
                      </div>
                    </Space>

                    <Button
                      size="small"
                      icon={<SendOutlined />}
                      loading={remindLoadingMap[person.user._id]}
                      onClick={() => handleSendReminder(person.user._id, person.user.fullName)}
                    >
                      Remind
                    </Button>
                  </div>
                ))}
              </Flex>
            </Card>
          )}

          {/* SECTION 3: Payment History & Settlement Logs */}
          <Card
            title={
              <Space size={6}>
                <HistoryOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontSize: 14 }}>Payment & Proof History ({settlements.length})</span>
              </Space>
            }
            style={{ borderRadius: 14 }}
            styles={{ body: { padding: 12 } }}
          >
            {settlements.length > 0 ? (
              <Flex vertical gap={10}>
                {settlements.map((s) => {
                  const isReceiver = s.receiver._id === user?._id;
                  const isPayer = s.payer._id === user?._id;

                  return (
                    <Card
                      key={s._id}
                      style={{ borderRadius: 12, background: '#fafafa' }}
                      styles={{ body: { padding: '10px 12px' } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Space align="center" size={6}>
                          <Tag style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>{s.payer?.fullName}</Tag>
                          <ArrowRightOutlined style={{ color: '#9ca3af', fontSize: 11 }} />
                          <Tag style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>{s.receiver?.fullName}</Tag>
                        </Space>
                        <Text strong style={{ fontSize: 15, color: '#1677ff' }}>
                          ₹{s.amount.toFixed(2)}
                        </Text>
                      </div>

                      {s.note && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, fontStyle: 'italic' }}>
                          "{s.note}"
                        </Text>
                      )}

                      {/* Payment Proof Display */}
                      {s.proofUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '6px 10px', borderRadius: 8, margin: '6px 0', border: '1px solid #e2e8f0' }}>
                          <Space size={8}>
                            <PictureOutlined style={{ color: '#1677ff' }} />
                            <Text style={{ fontSize: 11, fontWeight: 500 }}>Payment Screenshot</Text>
                          </Space>

                          <Space size={6}>
                            <Image
                              src={s.proofUrl}
                              alt="Payment Proof"
                              width={36}
                              height={36}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                            />

                            {(isReceiver || isPayer) && (
                              <Popconfirm
                                title="Delete proof image from Cloudinary?"
                                onConfirm={() => handleDeleteProof(s._id)}
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                              </Popconfirm>
                            )}
                          </Space>
                        </div>
                      )}

                      {/* Receiver Actions for Pending Approval */}
                      {isReceiver && s.status === 'paid_pending_approval' && (
                        <div style={{ display: 'flex', gap: 8, margin: '8px 0 4px' }}>
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleApprove(s._id)}
                            style={{ flex: 1, borderRadius: 6 }}
                          >
                            Approve Payment
                          </Button>
                          <Button
                            danger
                            size="small"
                            icon={<CloseCircleOutlined />}
                            onClick={() => handleReject(s._id)}
                            style={{ borderRadius: 6 }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 6, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {formatDate(s.createdAt)}
                        </Text>
                        {getStatusTag(s.status)}
                      </div>
                    </Card>
                  );
                })}
              </Flex>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No payment history recorded yet."
              />
            )}
          </Card>
        </>
      )}

      {/* Settle Modal Trigger */}
      {settlementTarget && (
        <SettlementModal
          isOpen={!!settlementTarget}
          onClose={() => setSettlementTarget(null)}
          targetPerson={settlementTarget}
          onSettlementUpdated={loadData}
        />
      )}

      {/* UPI QR Detail Modal */}
      {upiModalUser && (
        <UPIDetailModal
          isOpen={!!upiModalUser}
          onClose={() => setUpiModalUser(null)}
          user={upiModalUser}
          onPayClick={(u, amt) => {
            setUpiModalUser(null);
            setSettlementTarget({
              user: { _id: u._id, fullName: u.fullName, email: u.email, phone: u.phone },
              amount: amt || 0,
            });
          }}
        />
      )}
    </div>
  );
};
