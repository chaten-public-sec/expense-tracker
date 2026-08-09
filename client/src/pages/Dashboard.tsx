import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Tag,
  Avatar,
  Space,
  Typography,
  Alert,
  Spin,
  Empty,
  Flex,
} from 'antd';
import {
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RightOutlined,
  DollarOutlined,
  HistoryOutlined,
  UserOutlined,
  DollarCircleOutlined,
  MobileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { DashboardData, Expense, GroupMember, OwedPerson, Settlement } from '../types';
import api from '../services/api';

// Modals
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { ExpenseDetailModal } from '../components/modals/ExpenseDetailModal';
import { EditExpenseModal } from '../components/modals/EditExpenseModal';
import { BreakdownModal } from '../components/modals/BreakdownModal';
import { SettlementModal } from '../components/modals/SettlementModal';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const { user, group } = useAuth();
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

  const youNeedToPayTotal = data?.balances?.youNeedToPayTotal || 0;
  const youWillReceiveTotal = data?.balances?.youWillReceiveTotal || 0;
  const youNeedToPayList = data?.balances?.youNeedToPayList || [];
  const youWillReceiveList = data?.balances?.youWillReceiveList || [];

  const netBalance = useMemo(() => {
    return youWillReceiveTotal - youNeedToPayTotal;
  }, [youWillReceiveTotal, youNeedToPayTotal]);

  const receiverVerifications = data?.pendingVerifications?.asReceiver || [];

  if (isLoading && !data) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spin size="large" />
        <Text type="secondary" style={{ fontSize: 13 }}>Loading dashboard...</Text>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div style={{ padding: 16 }}>
        <Alert
          title="Failed to Load"
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
      {/* Pending Verifications Alerts (If Any) */}
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
              <Text type="secondary" style={{ fontSize: 10 }}>View list</Text>
              <RightOutlined style={{ fontSize: 9, color: '#9ca3af' }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Expenses Feed */}
      <Card
        title={
          <Space size={6}>
            <FileTextOutlined style={{ color: '#1677ff', fontSize: 15 }} />
            <span style={{ fontSize: 14 }}>Recent Expenses</span>
          </Space>
        }
        extra={
          <Button type="link" size="small" onClick={() => navigate('/expenses')} style={{ padding: 0, fontSize: 12 }}>
            See All
          </Button>
        }
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: 0 } }}
      >
        {data?.recentExpenses && data.recentExpenses.length > 0 ? (
          <Flex vertical>
            {data.recentExpenses.slice(0, 5).map((item, index) => (
              <div
                key={item._id || index}
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: index !== Math.min(4, data.recentExpenses!.length - 1) ? '1px solid #f8fafc' : 'none',
                  background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                }}
                onClick={() => setSelectedExpense(item)}
              >
                <div style={{ minWidth: 0, paddingRight: 8 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </Text>
                  <Space size={4} style={{ fontSize: 11 }}>
                    <Text type="secondary">{item.paidBy?.fullName?.split(' ')[0]}</Text>
                    <Text type="secondary">•</Text>
                    <Text type="secondary">{formatTimeAgo(item.date || item.createdAt || '')}</Text>
                    <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                      {item.paymentMode === 'upi' ? 'UPI' : 'Cash'}
                    </Tag>
                  </Space>
                </div>

                <Text strong style={{ fontSize: 15, color: '#1677ff', flexShrink: 0 }}>
                  ₹{item.amount.toFixed(2)}
                </Text>
              </div>
            ))}
          </Flex>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No expenses recorded yet."
            style={{ padding: '24px 0' }}
          />
        )}
      </Card>

      {/* Recent Activity Feed */}
      <Card
        title={
          <Space size={6}>
            <HistoryOutlined style={{ color: '#1677ff', fontSize: 15 }} />
            <span style={{ fontSize: 14 }}>Recent Activity</span>
          </Space>
        }
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: '12px 14px' } }}
      >
        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <Flex vertical gap={10}>
            {data.recentActivity.slice(0, 4).map((act, idx) => (
              <div key={act._id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" style={{ backgroundColor: '#0f172a', fontSize: 10 }} icon={<UserOutlined />}>
                  {act.user?.fullName?.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{act.user?.fullName?.split(' ')[0]}</strong> {act.action}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {formatTimeAgo(act.createdAt)}
                  </Text>
                </div>
              </div>
            ))}
          </Flex>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No recent activity"
            style={{ padding: '16px 0' }}
          />
        )}
      </Card>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={members}
        onExpenseAdded={loadDashboardData}
      />

      <ExpenseDetailModal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        onEdit={(exp) => setEditingExpense(exp)}
        onExpenseDeleted={loadDashboardData}
      />

      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        members={members}
        onExpenseUpdated={loadDashboardData}
      />

      <BreakdownModal
        isOpen={!!breakdownType}
        onClose={() => setBreakdownType(null)}
        title={breakdownType === 'need_to_pay' ? 'You Need to Pay' : 'You Will Receive'}
        type={breakdownType || 'need_to_pay'}
        totalAmount={breakdownType === 'need_to_pay' ? youNeedToPayTotal : youWillReceiveTotal}
        peopleList={breakdownType === 'need_to_pay' ? youNeedToPayList : youWillReceiveList}
        onMarkAsPaid={(person) => setSettlementTarget(person)}
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
    </div>
  );
};
