import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Avatar,
  Space,
  Typography,
  Alert,
  Spin,
  Empty,
  Flex,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  RightOutlined,
  DollarOutlined,
  UserOutlined,
  ReloadOutlined,
  QrcodeOutlined,
  CalendarOutlined,
  BellOutlined,
  SendOutlined,
  HistoryOutlined,
  MobileOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { DashboardData, Expense, GroupMember, OwedPerson, Settlement, User } from '../types';
import api from '../services/api';

// Modals
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { ExpenseDetailModal } from '../components/modals/ExpenseDetailModal';
import { EditExpenseModal } from '../components/modals/EditExpenseModal';
import { BreakdownModal } from '../components/modals/BreakdownModal';
import { SettlementModal } from '../components/modals/SettlementModal';
import { UPIDetailModal } from '../components/modals/UPIDetailModal';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const { user, group, userRole } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Breakdown modals
  const [breakdownType, setBreakdownType] = useState<'need_to_pay' | 'will_receive' | null>(null);

  // Settlement modal
  const [settlementTarget, setSettlementTarget] = useState<OwedPerson | null>(null);
  const [receiverPendingSettlement, setReceiverPendingSettlement] = useState<Settlement | null>(null);

  // UPI Detail Modal
  const [upiModalUser, setUpiModalUser] = useState<User | null>(null);
  const [upiModalAmount, setUpiModalAmount] = useState<number | undefined>(undefined);

  // Reminding state
  const [remindLoadingMap, setRemindLoadingMap] = useState<Record<string, boolean>>({});

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const res = await api.get('/dashboard');

      if (!res.data.hasGroup) {
        navigate('/no-group');
        return;
      }

      setData(res.data);

      const groupRes = await api.get('/groups/info');
      setMembers(groupRes.data.members || []);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      const msg = err.response?.data?.message || 'Error loading dashboard data';
      setLoadError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
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

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const youNeedToPayTotal = data?.balances?.youNeedToPayTotal || 0;
  const youWillReceiveTotal = data?.balances?.youWillReceiveTotal || 0;
  const youNeedToPayList = data?.balances?.youNeedToPayList || [];
  const youWillReceiveList = data?.balances?.youWillReceiveList || [];
  const billingCycle = data?.billingCycle;

  const netBalance = useMemo(() => {
    return youWillReceiveTotal - youNeedToPayTotal;
  }, [youWillReceiveTotal, youNeedToPayTotal]);

  const receiverVerifications = data?.pendingVerifications?.asReceiver || [];

  if (isLoading && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin size="large" />
        <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          Loading your financial overview...
        </Text>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div style={{ padding: 16 }}>
        <Alert
          title="Error Loading Dashboard"
          description={loadError}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={loadDashboardData}>
              Retry
            </Button>
          }
          style={{ borderRadius: 12 }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Pending Verifications Alerts */}
      {receiverVerifications.length > 0 && (
        <Alert
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12 }}>
                <strong>Action:</strong> {receiverVerifications.length} incoming settlement verification pending!
              </span>
              <Button
                size="small"
                type="primary"
                onClick={() => setReceiverPendingSettlement(receiverVerifications[0])}
              >
                Verify
              </Button>
            </div>
          }
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ borderRadius: 12 }}
        />
      )}

      {/* Payday Billing Cycle Banner */}
      {billingCycle?.payday && (
        <Alert
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Space size={6} align="center">
                <CalendarOutlined style={{ color: '#1677ff', fontSize: 14 }} />
                <span style={{ fontSize: 12 }}>
                  <strong>Billing Cycle:</strong> {formatDateShort(billingCycle.startDate)} – {formatDateShort(billingCycle.endDate)}
                </span>
              </Space>
              <Tag color={billingCycle.isPaydayToday ? 'gold' : 'blue'} style={{ margin: 0, fontWeight: 600 }}>
                {billingCycle.isPaydayToday
                  ? '⚡ Today is Group Payday!'
                  : `Next Payday in ${billingCycle.daysRemaining} days`}
              </Tag>
            </div>
          }
          type={billingCycle.isPaydayToday ? 'warning' : 'info'}
          style={{ borderRadius: 12, background: billingCycle.isPaydayToday ? '#fffbe6' : '#f0f5ff' }}
        />
      )}

      {/* Main Net Balance Hero Card */}
      <Card
        style={{
          borderRadius: 16,
          background: netBalance > 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : netBalance < 0 ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderColor: netBalance > 0 ? '#bbf7d0' : netBalance < 0 ? '#fecaca' : '#e2e8f0',
        }}
        styles={{ body: { padding: '18px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              Total Net Balance
            </Text>
            <Title
              level={2}
              style={{
                margin: '2px 0 0',
                fontSize: 26,
                color: netBalance > 0 ? '#16a34a' : netBalance < 0 ? '#dc2626' : '#1f2937',
              }}
            >
              {netBalance > 0 ? `+₹${netBalance.toFixed(2)}` : netBalance < 0 ? `-₹${Math.abs(netBalance).toFixed(2)}` : '₹0.00'}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {netBalance > 0
                ? 'You are owed money in total'
                : netBalance < 0
                ? 'You owe money in total'
                : 'All flatmate balances settled'}
            </Text>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddExpenseOpen(true)}
            style={{ borderRadius: 10, height: 38 }}
          >
            Add Expense
          </Button>
        </div>
      </Card>

      {/* Split Cards: You Need to Pay / You Will Receive */}
      <Row gutter={[10, 10]}>
        <Col span={12}>
          <Card
            hoverable
            onClick={() => setBreakdownType('need_to_pay')}
            style={{ borderRadius: 14, cursor: 'pointer', height: '100%' }}
            styles={{ body: { padding: 14 } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
                You Owe
              </Text>
              <Tag color="error" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                {youNeedToPayList.length}
              </Tag>
            </div>
            <Text strong style={{ fontSize: 18, color: '#ef4444', display: 'block' }}>
              ₹{youNeedToPayTotal.toFixed(2)}
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 10 }}>View dues</Text>
              <RightOutlined style={{ fontSize: 9, color: '#9ca3af' }} />
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            hoverable
            onClick={() => setBreakdownType('will_receive')}
            style={{ borderRadius: 14, cursor: 'pointer', height: '100%' }}
            styles={{ body: { padding: 14 } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
                You Receive
              </Text>
              <Tag color="success" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                {youWillReceiveList.length}
              </Tag>
            </div>
            <Text strong style={{ fontSize: 18, color: '#10b981', display: 'block' }}>
              ₹{youWillReceiveTotal.toFixed(2)}
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 10 }}>View receivables</Text>
              <RightOutlined style={{ fontSize: 9, color: '#9ca3af' }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Dues Action Items List (If Any Dues) */}
      {youNeedToPayList.length > 0 && (
        <Card
          title={
            <Space size={6}>
              <ArrowDownOutlined style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 14 }}>People You Owe</span>
            </Space>
          }
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 12 } }}
        >
          <Flex vertical gap={8}>
            {youNeedToPayList.map((person) => (
              <div
                key={person.user._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: '#fafafa',
                  borderRadius: 10,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Space size={8} align="center">
                  <Avatar size={34} style={{ backgroundColor: '#0f172a' }} icon={<UserOutlined />}>
                    {person.user.fullName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
                      {person.user.fullName}
                    </Text>
                    <Text type="danger" style={{ fontSize: 12, fontWeight: 600 }}>
                      ₹{person.amount.toFixed(2)}
                    </Text>
                  </div>
                </Space>

                <Space size={6}>
                  <Button
                    size="small"
                    icon={<QrcodeOutlined />}
                    onClick={() => {
                      setUpiModalUser({
                        _id: person.user._id,
                        fullName: person.user.fullName,
                        email: person.user.email,
                        phone: person.user.phone,
                        upiId: person.user.upiId || '',
                        qrCodeUrl: person.user.qrCodeUrl || null,
                      });
                      setUpiModalAmount(person.amount);
                    }}
                  >
                    UPI / QR
                  </Button>

                  <Button
                    size="small"
                    type="primary"
                    onClick={() => setSettlementTarget(person)}
                  >
                    Settle
                  </Button>
                </Space>
              </div>
            ))}
          </Flex>
        </Card>
      )}

      {/* Admin Remind Section (People Who Owe You / Group) */}
      {userRole === 'creator' && youWillReceiveList.length > 0 && (
        <Card
          title={
            <Space size={6}>
              <ArrowUpOutlined style={{ color: '#10b981' }} />
              <span style={{ fontSize: 14 }}>Flatmates Who Owe Dues (Admin Reminders)</span>
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
                  padding: '8px 10px',
                  background: '#fafafa',
                  borderRadius: 10,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Space size={8} align="center">
                  <Avatar size={34} style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
                    {person.user.fullName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
                      {person.user.fullName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                      Owes ₹{person.amount.toFixed(2)}
                    </Text>
                  </div>
                </Space>

                <Button
                  size="small"
                  icon={<SendOutlined />}
                  loading={remindLoadingMap[person.user._id]}
                  onClick={() => handleSendReminder(person.user._id, person.user.fullName)}
                >
                  Send Pay Now
                </Button>
              </div>
            ))}
          </Flex>
        </Card>
      )}

      {/* Recent Expenses List */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={6}>
              <HistoryOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 14 }}>Recent Expenses</span>
            </Space>
            <Button type="link" size="small" onClick={() => navigate('/expenses')} style={{ fontSize: 12, padding: 0 }}>
              View All
            </Button>
          </div>
        }
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: 12 } }}
      >
        {data?.recentExpenses && data.recentExpenses.length > 0 ? (
          <Flex vertical gap={8}>
            {data.recentExpenses.slice(0, 5).map((item) => (
              <div
                key={item._id}
                onClick={() => setSelectedExpense(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#fafafa',
                  borderRadius: 10,
                  border: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <Space size={10} align="center">
                  <Avatar
                    style={{
                      backgroundColor: item.paymentMode === 'upi' ? '#e6f4ff' : '#f6ffed',
                      color: item.paymentMode === 'upi' ? '#1677ff' : '#52c41a',
                      flexShrink: 0,
                    }}
                    size={36}
                    icon={item.paymentMode === 'upi' ? <MobileOutlined /> : <DollarCircleOutlined />}
                  />
                  <div>
                    <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
                      {item.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Paid by {item.paidBy?.fullName} • {formatTimeAgo(item.date || item.createdAt || '')}
                    </Text>
                  </div>
                </Space>

                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: 14, color: '#1f2937', display: 'block' }}>
                    ₹{item.amount.toFixed(2)}
                  </Text>
                  <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                    {item.splitType === 'everyone' ? 'Everyone' : 'Specific'}
                  </Tag>
                </div>
              </div>
            ))}
          </Flex>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expenses recorded yet" style={{ margin: '16px 0' }} />
        )}
      </Card>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onExpenseAdded={loadDashboardData}
        members={members}
      />

      <ExpenseDetailModal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        onEdit={(exp) => {
          setSelectedExpense(null);
          setEditingExpense(exp);
        }}
        onExpenseDeleted={loadDashboardData}
      />

      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        onExpenseUpdated={loadDashboardData}
        members={members}
      />

      <BreakdownModal
        isOpen={!!breakdownType}
        onClose={() => setBreakdownType(null)}
        title={breakdownType === 'need_to_pay' ? 'People You Owe' : 'People Who Owe You'}
        type={breakdownType || 'need_to_pay'}
        totalAmount={breakdownType === 'need_to_pay' ? youNeedToPayTotal : youWillReceiveTotal}
        peopleList={breakdownType === 'need_to_pay' ? youNeedToPayList : youWillReceiveList}
        onMarkAsPaid={(person: OwedPerson) => {
          setBreakdownType(null);
          setSettlementTarget(person);
        }}
      />

      <SettlementModal
        isOpen={!!settlementTarget || !!receiverPendingSettlement}
        onClose={() => {
          setSettlementTarget(null);
          setReceiverPendingSettlement(null);
        }}
        targetPerson={settlementTarget}
        pendingSettlement={receiverPendingSettlement}
        onSettlementUpdated={loadDashboardData}
      />

      <UPIDetailModal
        isOpen={!!upiModalUser}
        onClose={() => {
          setUpiModalUser(null);
          setUpiModalAmount(undefined);
        }}
        user={upiModalUser}
        amountToPay={upiModalAmount}
        onPayClick={(u, amt) => {
          setUpiModalUser(null);
          setSettlementTarget({
            user: { _id: u._id, fullName: u.fullName, email: u.email, phone: u.phone },
            amount: amt || 0,
          });
        }}
      />
    </div>
  );
};
