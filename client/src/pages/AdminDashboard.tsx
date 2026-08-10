import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Tabs,
  Popconfirm,
  Avatar,
  Spin,
  Alert,
  Input,
  Select,
  Modal,
  Drawer,
  Form,
  InputNumber,
  DatePicker,
  Switch,
  Image,
  Descriptions,
  Divider,
  Dropdown,
  Tooltip,
  Badge,
} from 'antd';
import {
  CrownOutlined,
  TeamOutlined,
  UserOutlined,
  DollarOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  QrcodeOutlined,
  EyeOutlined,
  EditOutlined,
  KeyOutlined,
  SearchOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  MobileOutlined,
  DollarCircleOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  WalletOutlined,
  FilterOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Active Tab: 'overview' | 'users' | 'groups' | 'expenses' | 'settlements' | 'audit'
  const [activeTab, setActiveTab] = useState('overview');

  // Overview Stats
  const [stats, setStats] = useState<any | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersGroupFilter, setUsersGroupFilter] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Groups State
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsSearch, setGroupsSearch] = useState('');
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);

  // Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesSearch, setExpensesSearch] = useState('');
  const [expensesPaymentMode, setExpensesPaymentMode] = useState('');
  const [expensesSplitType, setExpensesSplitType] = useState('');
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);

  // Settlements State
  const [settlements, setSettlements] = useState<any[]>([]);
  const [settlementsTotal, setSettlementsTotal] = useState(0);
  const [settlementsPage, setSettlementsPage] = useState(1);
  const [settlementsStatus, setSettlementsStatus] = useState('');
  const [isSettlementsLoading, setIsSettlementsLoading] = useState(false);

  // Audit Activities State
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);

  // ==========================================
  // DETAIL DRAWERS & MODALS STATE
  // ==========================================

  // User Detail & Edit
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isUserDetailLoading, setIsUserDetailLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUserForm] = Form.useForm();
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [passwordUser, setPasswordUser] = useState<any | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Group Detail & Edit
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<any | null>(null);
  const [isGroupDetailOpen, setIsGroupDetailOpen] = useState(false);
  const [isGroupDetailLoading, setIsGroupDetailLoading] = useState(false);

  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editGroupForm] = Form.useForm();
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Expense Detail & Edit
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<any | null>(null);
  const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editExpenseForm] = Form.useForm();
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ==========================================
  // FETCH METHODS
  // ==========================================

  const fetchStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err: any) {
      console.error('Fetch Stats Error:', err);
      showError(err.response?.data?.message || 'Failed to fetch system overview');
    } finally {
      setIsStatsLoading(false);
    }
  }, [showError]);

  const fetchUsers = useCallback(async (page = usersPage) => {
    try {
      setIsUsersLoading(true);
      const res = await api.get('/admin/users', {
        params: {
          page,
          limit: 10,
          search: usersSearch,
          role: usersRoleFilter,
          hasGroup: usersGroupFilter,
        },
      });
      setUsers(res.data.users || []);
      setUsersTotal(res.data.total || 0);
      setUsersPage(page);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load users list');
    } finally {
      setIsUsersLoading(false);
    }
  }, [usersPage, usersSearch, usersRoleFilter, usersGroupFilter, showError]);

  const fetchGroups = useCallback(async (page = groupsPage) => {
    try {
      setIsGroupsLoading(true);
      const res = await api.get('/admin/groups', {
        params: {
          page,
          limit: 10,
          search: groupsSearch,
        },
      });
      setGroups(res.data.groups || []);
      setGroupsTotal(res.data.total || 0);
      setGroupsPage(page);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load groups list');
    } finally {
      setIsGroupsLoading(false);
    }
  }, [groupsPage, groupsSearch, showError]);

  const fetchExpenses = useCallback(async (page = expensesPage) => {
    try {
      setIsExpensesLoading(true);
      const res = await api.get('/admin/expenses', {
        params: {
          page,
          limit: 10,
          search: expensesSearch,
          paymentMode: expensesPaymentMode,
          splitType: expensesSplitType,
        },
      });
      setExpenses(res.data.expenses || []);
      setExpensesTotal(res.data.total || 0);
      setExpensesPage(page);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load expenses list');
    } finally {
      setIsExpensesLoading(false);
    }
  }, [expensesPage, expensesSearch, expensesPaymentMode, expensesSplitType, showError]);

  const fetchSettlements = useCallback(async (page = settlementsPage) => {
    try {
      setIsSettlementsLoading(true);
      const res = await api.get('/admin/settlements', {
        params: {
          page,
          limit: 10,
          status: settlementsStatus,
        },
      });
      setSettlements(res.data.settlements || []);
      setSettlementsTotal(res.data.total || 0);
      setSettlementsPage(page);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load settlements');
    } finally {
      setIsSettlementsLoading(false);
    }
  }, [settlementsPage, settlementsStatus, showError]);

  const fetchActivities = useCallback(async (page = activitiesPage) => {
    try {
      setIsActivitiesLoading(true);
      const res = await api.get('/admin/activities', {
        params: {
          page,
          limit: 15,
        },
      });
      setActivities(res.data.activities || []);
      setActivitiesTotal(res.data.total || 0);
      setActivitiesPage(page);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setIsActivitiesLoading(false);
    }
  }, [activitiesPage, showError]);

  // Initial Load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Tab-specific trigger
  useEffect(() => {
    if (activeTab === 'users') fetchUsers(1);
    if (activeTab === 'groups') fetchGroups(1);
    if (activeTab === 'expenses') fetchExpenses(1);
    if (activeTab === 'settlements') fetchSettlements(1);
    if (activeTab === 'audit') fetchActivities(1);
  }, [activeTab, fetchUsers, fetchGroups, fetchExpenses, fetchSettlements, fetchActivities]);

  const handleRefreshAll = () => {
    fetchStats();
    if (activeTab === 'users') fetchUsers(usersPage);
    if (activeTab === 'groups') fetchGroups(groupsPage);
    if (activeTab === 'expenses') fetchExpenses(expensesPage);
    if (activeTab === 'settlements') fetchSettlements(settlementsPage);
    if (activeTab === 'audit') fetchActivities(activitiesPage);
    showSuccess('Admin dashboard data refreshed');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? 'N/A'
      : d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? 'N/A'
      : d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  // ==========================================
  // USER ACTIONS
  // ==========================================

  const handleOpenUserDetail = async (userId: string) => {
    try {
      setIsUserDetailLoading(true);
      setIsUserDetailOpen(true);
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUserDetail(res.data);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load user details');
      setIsUserDetailOpen(false);
    } finally {
      setIsUserDetailLoading(false);
    }
  };

  const handleOpenEditUser = (record: any) => {
    setEditingUser(record);
    editUserForm.setFieldsValue({
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      upiId: record.upiId || '',
      isSuperAdmin: !!record.isSuperAdmin,
    });
    setIsEditUserOpen(true);
  };

  const handleSaveUser = async (values: any) => {
    try {
      setIsSavingUser(true);
      await api.put(`/admin/users/${editingUser._id}`, values);
      showSuccess(`User "${values.fullName}" updated successfully!`);
      setIsEditUserOpen(false);
      fetchUsers(usersPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update user profile');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleOpenPasswordModal = (record: any) => {
    setPasswordUser(record);
    passwordForm.resetFields();
    setIsPasswordOpen(true);
  };

  const handleSavePassword = async (values: any) => {
    try {
      setIsSavingPassword(true);
      await api.post(`/admin/users/${passwordUser._id}/password`, {
        newPassword: values.newPassword,
      });
      showSuccess(`Password for ${passwordUser.fullName} reset successfully!`);
      setIsPasswordOpen(false);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      setActionLoadingId(userId);
      await api.delete(`/admin/users/${userId}`);
      showSuccess(`User account "${userName}" deleted successfully.`);
      fetchUsers(usersPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // GROUP ACTIONS
  // ==========================================

  const handleOpenGroupDetail = async (groupId: string) => {
    try {
      setIsGroupDetailLoading(true);
      setIsGroupDetailOpen(true);
      const res = await api.get(`/admin/groups/${groupId}`);
      setSelectedGroupDetail(res.data);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load group details');
      setIsGroupDetailOpen(false);
    } finally {
      setIsGroupDetailLoading(false);
    }
  };

  const handleOpenEditGroup = (record: any) => {
    setEditingGroup(record);
    editGroupForm.setFieldsValue({
      name: record.name,
      payday: record.payday || null,
    });
    setIsEditGroupOpen(true);
  };

  const handleSaveGroup = async (values: any) => {
    try {
      setIsSavingGroup(true);
      await api.put(`/admin/groups/${editingGroup._id}`, values);
      showSuccess(`Group "${values.name}" updated successfully!`);
      setIsEditGroupOpen(false);
      fetchGroups(groupsPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleRemoveMember = async (groupId: string, memberUserId: string) => {
    try {
      setActionLoadingId(memberUserId);
      await api.delete(`/admin/groups/${groupId}/members/${memberUserId}`);
      showSuccess('Member removed from group by Super Admin');
      handleOpenGroupDetail(groupId);
      fetchGroups(groupsPage);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      setActionLoadingId(groupId);
      await api.delete(`/admin/groups/${groupId}`);
      showSuccess(`Group "${groupName}" and all associated data permanently deleted.`);
      fetchGroups(groupsPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // EXPENSE ACTIONS
  // ==========================================

  const handleOpenExpenseDetail = async (expenseId: string) => {
    try {
      const res = await api.get(`/admin/expenses/${expenseId}`);
      setSelectedExpenseDetail(res.data);
      setIsExpenseDetailOpen(true);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to load expense details');
    }
  };

  const handleOpenEditExpense = (record: any) => {
    setEditingExpense(record);
    editExpenseForm.setFieldsValue({
      title: record.title,
      amount: record.amount,
      paymentMode: record.paymentMode || 'cash',
      date: record.date ? dayjs(record.date) : dayjs(record.createdAt),
      notes: record.notes || '',
    });
    setIsEditExpenseOpen(true);
  };

  const handleSaveExpense = async (values: any) => {
    try {
      setIsSavingExpense(true);
      await api.put(`/admin/expenses/${editingExpense._id}`, {
        title: values.title.trim(),
        amount: Number(values.amount),
        paymentMode: values.paymentMode,
        date: values.date ? values.date.toISOString() : undefined,
        notes: values.notes?.trim() || '',
      });
      showSuccess(`Expense "${values.title}" updated successfully!`);
      setIsEditExpenseOpen(false);
      fetchExpenses(expensesPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      setActionLoadingId(expenseId);
      await api.delete(`/admin/expenses/${expenseId}`);
      showSuccess('Expense permanently deleted by Super Admin.');
      fetchExpenses(expensesPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==========================================
  // SETTLEMENT ACTIONS
  // ==========================================

  const handleSettlementAction = async (settlementId: string, action: 'approve' | 'cancel' | 'delete') => {
    try {
      setActionLoadingId(settlementId);
      await api.post(`/admin/settlements/${settlementId}/action`, { action });
      showSuccess(`Settlement action "${action}" completed.`);
      fetchSettlements(settlementsPage);
      fetchStats();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to execute settlement action');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Super Admin Top Control Banner */}
      <Card
        style={{
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid #334155',
          color: '#ffffff',
        }}
        styles={{ body: { padding: '16px 18px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space align="center" size={10}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              <CrownOutlined style={{ color: '#eab308', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Super Admin Master Console</span>
                <Tag color="gold" icon={<SafetyCertificateOutlined />} style={{ margin: 0 }}>
                  Master Access
                </Tag>
              </div>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                Full system visibility, security oversight, database administration & audit records
              </Text>
            </div>
          </Space>

          <Space size={8}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefreshAll}
              style={{ borderRadius: 8, background: '#2563eb' }}
            >
              Refresh Data
            </Button>
          </Space>
        </div>
      </Card>

      {/* Overview Statistics Grid (Always available for immediate reference) */}
      <Row gutter={[10, 10]}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11, color: '#64748b' }}>Total Users</span>}
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined style={{ color: '#1677ff', fontSize: 15 }} />}
              styles={{ content: { fontSize: 17, fontWeight: 700 } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11, color: '#64748b' }}>Active Groups</span>}
              value={stats?.totalGroups || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1', fontSize: 15 }} />}
              styles={{ content: { fontSize: 17, fontWeight: 700 } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11, color: '#64748b' }}>Money Tracked</span>}
              value={stats?.totalExpenseAmount || 0}
              precision={2}
              prefix={<span style={{ fontSize: 14 }}>₹</span>}
              styles={{ content: { fontSize: 17, fontWeight: 700, color: '#1677ff' } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11, color: '#64748b' }}>Expenses</span>}
              value={stats?.totalExpensesCount || 0}
              prefix={<FileTextOutlined style={{ color: '#fa8c16', fontSize: 15 }} />}
              styles={{ content: { fontSize: 17, fontWeight: 700 } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11, color: '#64748b' }}>Settled Volume</span>}
              value={stats?.totalSettledAmount || 0}
              precision={2}
              prefix={<span style={{ fontSize: 14 }}>₹</span>}
              styles={{ content: { fontSize: 17, fontWeight: 700, color: '#52c41a' } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11, color: '#64748b' }}>Pending Proofs</span>}
              value={stats?.pendingSettlementsCount || 0}
              prefix={<ClockCircleOutlined style={{ color: '#eab308', fontSize: 15 }} />}
              styles={{ content: { fontSize: 17, fontWeight: 700, color: stats?.pendingSettlementsCount > 0 ? '#eab308' : '#64748b' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Management Section Container */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: '12px 14px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            // ==========================================
            // TAB 1: OVERVIEW & AUDIT STREAM
            // ==========================================
            {
              key: 'overview',
              label: (
                <Space size={6}>
                  <CrownOutlined />
                  <span>Overview</span>
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      Recent System Activities & Audit Logs
                    </Text>
                    <Button type="link" size="small" onClick={() => setActiveTab('audit')}>
                      View Full Audit Trail →
                    </Button>
                  </div>

                  {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {stats.recentActivities.map((act: any) => (
                        <div
                          key={act._id}
                          style={{
                            padding: '10px 12px',
                            background: '#f8fafc',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Space size={8} align="center">
                            <Avatar size="small" style={{ backgroundColor: '#1677ff', fontSize: 11 }}>
                              {act.user?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            <div>
                              <Text style={{ fontSize: 12 }}>
                                <strong>{act.user?.fullName || 'User'}</strong> {act.action}
                              </Text>
                              {act.groupId && (
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                                  Group: {act.groupId.name}
                                </Text>
                              )}
                            </div>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            {formatDateTime(act.createdAt)}
                          </Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert message="No recent system activities recorded yet." type="info" showIcon />
                  )}
                </div>
              ),
            },

            // ==========================================
            // TAB 2: USER MANAGEMENT
            // ==========================================
            {
              key: 'users',
              label: (
                <Space size={6}>
                  <UserOutlined />
                  <span>Users ({stats?.totalUsers || usersTotal})</span>
                </Space>
              ),
              children: (
                <div>
                  {/* User Search & Filter Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Input
                      placeholder="Search name, email, phone, UPI..."
                      prefix={<SearchOutlined />}
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      onPressEnter={() => fetchUsers(1)}
                      style={{ maxWidth: 260, minWidth: 180 }}
                      allowClear
                    />

                    <Select
                      placeholder="Filter Role"
                      value={usersRoleFilter || undefined}
                      onChange={(val) => setUsersRoleFilter(val || '')}
                      allowClear
                      style={{ width: 140 }}
                      options={[
                        { value: 'admin', label: 'Super Admin' },
                        { value: 'user', label: 'Standard User' },
                      ]}
                    />

                    <Select
                      placeholder="Group Status"
                      value={usersGroupFilter || undefined}
                      onChange={(val) => setUsersGroupFilter(val || '')}
                      allowClear
                      style={{ width: 140 }}
                      options={[
                        { value: 'yes', label: 'In a Group' },
                        { value: 'no', label: 'No Group' },
                      ]}
                    />

                    <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchUsers(1)}>
                      Search
                    </Button>

                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setUsersSearch('');
                        setUsersRoleFilter('');
                        setUsersGroupFilter('');
                        fetchUsers(1);
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  {/* Users Table */}
                  <Table
                    dataSource={users}
                    rowKey="_id"
                    size="small"
                    loading={isUsersLoading}
                    scroll={{ x: 750 }}
                    pagination={{
                      current: usersPage,
                      pageSize: 10,
                      total: usersTotal,
                      onChange: (page) => fetchUsers(page),
                      showSizeChanger: false,
                    }}
                    columns={[
                      {
                        title: 'User Name',
                        dataIndex: 'fullName',
                        key: 'fullName',
                        render: (text, record) => (
                          <Space size={8}>
                            <Avatar size="small" style={{ backgroundColor: record.isSuperAdmin ? '#faad14' : '#1677ff' }}>
                              {text?.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text strong style={{ fontSize: 13, display: 'block' }}>{text}</Text>
                              {record.isSuperAdmin && (
                                <Tag color="gold" icon={<CrownOutlined />} style={{ fontSize: 10, margin: 0 }}>
                                  Super Admin
                                </Tag>
                              )}
                            </div>
                          </Space>
                        ),
                      },
                      {
                        title: 'Email',
                        dataIndex: 'email',
                        key: 'email',
                        render: (email) => <Text style={{ fontSize: 12 }}>{email}</Text>,
                      },
                      {
                        title: 'Phone',
                        dataIndex: 'phone',
                        key: 'phone',
                        render: (phone) => <Text style={{ fontSize: 12 }}>{phone}</Text>,
                      },
                      {
                        title: 'Active Group',
                        dataIndex: 'group',
                        key: 'group',
                        render: (g) => (g ? <Tag color="cyan">{g.name}</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>None</Text>),
                      },
                      {
                        title: 'UPI / QR',
                        key: 'upi',
                        render: (_, record) => (
                          <Space size={4}>
                            {record.upiId ? <Tag color="blue" style={{ fontSize: 10 }}>UPI Set</Tag> : null}
                            {record.qrCodeUrl ? <Tag color="green" icon={<QrcodeOutlined />} style={{ fontSize: 10 }}>QR Active</Tag> : null}
                          </Space>
                        ),
                      },
                      {
                        title: 'Joined',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (d) => <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(d)}</Text>,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 140,
                        render: (_, record) => {
                          const isSelf = user && user._id === record._id;
                          return (
                            <Space size={4}>
                              <Tooltip title="View Full Profile & Financial Summary">
                                <Button
                                  size="small"
                                  icon={<EyeOutlined />}
                                  onClick={() => handleOpenUserDetail(record._id)}
                                />
                              </Tooltip>

                              <Tooltip title="Edit Profile">
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => handleOpenEditUser(record)}
                                />
                              </Tooltip>

                              <Tooltip title="Reset Password">
                                <Button
                                  size="small"
                                  icon={<KeyOutlined />}
                                  onClick={() => handleOpenPasswordModal(record)}
                                />
                              </Tooltip>

                              {!isSelf && !record.isSuperAdmin && record.email !== 'admin@gmail.com' ? (
                                <Popconfirm
                                  title={`Delete account "${record.fullName}"?`}
                                  description="Permanently deletes user, memberships, and QR codes."
                                  onConfirm={() => handleDeleteUser(record._id, record.fullName)}
                                  okText="Delete User"
                                  cancelText="Cancel"
                                  okButtonProps={{ danger: true, loading: actionLoadingId === record._id }}
                                  placement="topRight"
                                >
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              ) : (
                                <Tooltip title={isSelf ? 'Cannot delete self' : 'Protected Account'}>
                                  <Button size="small" disabled icon={<LockOutlined />} />
                                </Tooltip>
                              )}
                            </Space>
                          );
                        },
                      },
                    ]}
                  />
                </div>
              ),
            },

            // ==========================================
            // TAB 3: GROUP MANAGEMENT
            // ==========================================
            {
              key: 'groups',
              label: (
                <Space size={6}>
                  <TeamOutlined />
                  <span>Groups ({stats?.totalGroups || groupsTotal})</span>
                </Space>
              ),
              children: (
                <div>
                  {/* Group Search Toolbar */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <Input
                      placeholder="Search group name or invite code..."
                      prefix={<SearchOutlined />}
                      value={groupsSearch}
                      onChange={(e) => setGroupsSearch(e.target.value)}
                      onPressEnter={() => fetchGroups(1)}
                      style={{ maxWidth: 280 }}
                      allowClear
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchGroups(1)}>
                      Search
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setGroupsSearch('');
                        fetchGroups(1);
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  <Table
                    dataSource={groups}
                    rowKey="_id"
                    size="small"
                    loading={isGroupsLoading}
                    scroll={{ x: 750 }}
                    pagination={{
                      current: groupsPage,
                      pageSize: 10,
                      total: groupsTotal,
                      onChange: (page) => fetchGroups(page),
                      showSizeChanger: false,
                    }}
                    columns={[
                      {
                        title: 'Group Name',
                        dataIndex: 'name',
                        key: 'name',
                        render: (text, record) => (
                          <div>
                            <Text strong style={{ fontSize: 13, display: 'block' }}>{text}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>Code: {record.inviteCode}</Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Creator',
                        dataIndex: 'createdBy',
                        key: 'createdBy',
                        render: (creator) => (
                          <Text style={{ fontSize: 12 }}>{creator?.fullName || 'System'}</Text>
                        ),
                      },
                      {
                        title: 'Members',
                        dataIndex: 'memberCount',
                        key: 'memberCount',
                        render: (cnt) => <Tag color="blue">{cnt} Members</Tag>,
                      },
                      {
                        title: 'Total Expenses',
                        dataIndex: 'totalAmount',
                        key: 'totalAmount',
                        render: (amt, record) => (
                          <div>
                            <Text strong style={{ color: '#1677ff', fontSize: 12, display: 'block' }}>
                              ₹{amt ? amt.toFixed(2) : '0.00'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>{record.expensesCount || 0} entries</Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Payday',
                        dataIndex: 'payday',
                        key: 'payday',
                        render: (p) => (p ? <Tag color="gold">{p}th of month</Tag> : <Text type="secondary" style={{ fontSize: 11 }}>Not set</Text>),
                      },
                      {
                        title: 'Created',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (d) => <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(d)}</Text>,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 130,
                        render: (_, record) => (
                          <Space size={4}>
                            <Tooltip title="View Members & Expenses">
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleOpenGroupDetail(record._id)}
                              />
                            </Tooltip>

                            <Tooltip title="Edit Group Name / Payday">
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEditGroup(record)}
                              />
                            </Tooltip>

                            <Popconfirm
                              title={`Delete group "${record.name}"?`}
                              description="Permanently deletes all expenses, settlements, receipts, and activities."
                              onConfirm={() => handleDeleteGroup(record._id, record.name)}
                              okText="Delete Group"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true, loading: actionLoadingId === record._id }}
                              placement="topRight"
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },

            // ==========================================
            // TAB 4: EXPENSE MANAGEMENT
            // ==========================================
            {
              key: 'expenses',
              label: (
                <Space size={6}>
                  <FileTextOutlined />
                  <span>Expenses ({stats?.totalExpensesCount || expensesTotal})</span>
                </Space>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Input
                      placeholder="Search expense title..."
                      prefix={<SearchOutlined />}
                      value={expensesSearch}
                      onChange={(e) => setExpensesSearch(e.target.value)}
                      onPressEnter={() => fetchExpenses(1)}
                      style={{ maxWidth: 240 }}
                      allowClear
                    />

                    <Select
                      placeholder="Payment Mode"
                      value={expensesPaymentMode || undefined}
                      onChange={(val) => setExpensesPaymentMode(val || '')}
                      allowClear
                      style={{ width: 130 }}
                      options={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'upi', label: 'UPI / Online' },
                      ]}
                    />

                    <Select
                      placeholder="Split Type"
                      value={expensesSplitType || undefined}
                      onChange={(val) => setExpensesSplitType(val || '')}
                      allowClear
                      style={{ width: 130 }}
                      options={[
                        { value: 'everyone', label: 'Split with All' },
                        { value: 'specific', label: 'Specific' },
                      ]}
                    />

                    <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchExpenses(1)}>
                      Filter
                    </Button>

                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setExpensesSearch('');
                        setExpensesPaymentMode('');
                        setExpensesSplitType('');
                        fetchExpenses(1);
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  <Table
                    dataSource={expenses}
                    rowKey="_id"
                    size="small"
                    loading={isExpensesLoading}
                    scroll={{ x: 750 }}
                    pagination={{
                      current: expensesPage,
                      pageSize: 10,
                      total: expensesTotal,
                      onChange: (page) => fetchExpenses(page),
                      showSizeChanger: false,
                    }}
                    columns={[
                      {
                        title: 'Title',
                        dataIndex: 'title',
                        key: 'title',
                        render: (text, record) => (
                          <div>
                            <Text strong style={{ fontSize: 13, display: 'block' }}>{text}</Text>
                            {record.screenshotUrl && (
                              <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>Has Receipt</Tag>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Amount',
                        dataIndex: 'amount',
                        key: 'amount',
                        render: (amt) => (
                          <Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                            ₹{amt.toFixed(2)}
                          </Text>
                        ),
                      },
                      {
                        title: 'Group',
                        dataIndex: 'groupId',
                        key: 'groupId',
                        render: (g) => <Tag color="blue">{g?.name || 'Group'}</Tag>,
                      },
                      {
                        title: 'Paid By',
                        dataIndex: 'paidBy',
                        key: 'paidBy',
                        render: (p) => <Text style={{ fontSize: 12 }}>{p?.fullName}</Text>,
                      },
                      {
                        title: 'Mode',
                        dataIndex: 'paymentMode',
                        key: 'paymentMode',
                        render: (m) => (
                          <Tag
                            color={m === 'upi' ? 'blue' : 'green'}
                            icon={m === 'upi' ? <MobileOutlined /> : <DollarCircleOutlined />}
                            style={{ fontSize: 10 }}
                          >
                            {m === 'upi' ? 'UPI' : 'Cash'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Date',
                        key: 'date',
                        render: (_, record) => (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatDate(record.date || record.createdAt)}
                          </Text>
                        ),
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 120,
                        render: (_, record) => (
                          <Space size={4}>
                            <Tooltip title="View Expense Details">
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleOpenExpenseDetail(record._id)}
                              />
                            </Tooltip>

                            <Tooltip title="Edit Expense">
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEditExpense(record)}
                              />
                            </Tooltip>

                            <Popconfirm
                              title="Delete this expense?"
                              description="Recalculates group balances immediately."
                              onConfirm={() => handleDeleteExpense(record._id)}
                              okText="Delete"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true, loading: actionLoadingId === record._id }}
                              placement="topRight"
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },

            // ==========================================
            // TAB 5: SETTLEMENT MANAGEMENT
            // ==========================================
            {
              key: 'settlements',
              label: (
                <Space size={6}>
                  <CheckCircleOutlined />
                  <span>Settlements ({stats?.totalSettlementsCount || settlementsTotal})</span>
                </Space>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Select
                      placeholder="Filter Status"
                      value={settlementsStatus || undefined}
                      onChange={(val) => setSettlementsStatus(val || '')}
                      allowClear
                      style={{ width: 170 }}
                      options={[
                        { value: 'completed', label: 'Completed' },
                        { value: 'paid_pending_approval', label: 'Pending Approval' },
                        { value: 'will_pay_soon', label: 'Payment Promise' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'cancelled', label: 'Cancelled' },
                      ]}
                    />

                    <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchSettlements(1)}>
                      Filter
                    </Button>

                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setSettlementsStatus('');
                        fetchSettlements(1);
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  <Table
                    dataSource={settlements}
                    rowKey="_id"
                    size="small"
                    loading={isSettlementsLoading}
                    scroll={{ x: 750 }}
                    pagination={{
                      current: settlementsPage,
                      pageSize: 10,
                      total: settlementsTotal,
                      onChange: (page) => fetchSettlements(page),
                      showSizeChanger: false,
                    }}
                    columns={[
                      {
                        title: 'Payer → Receiver',
                        key: 'parties',
                        render: (_, record) => (
                          <div style={{ fontSize: 12 }}>
                            <Text strong>{record.payer?.fullName || 'User'}</Text>
                            <span style={{ color: '#94a3b8', margin: '0 4px' }}>→</span>
                            <Text strong style={{ color: '#1677ff' }}>{record.receiver?.fullName || 'User'}</Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Amount',
                        dataIndex: 'amount',
                        key: 'amount',
                        render: (amt) => (
                          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                            ₹{amt.toFixed(2)}
                          </Text>
                        ),
                      },
                      {
                        title: 'Group',
                        dataIndex: 'groupId',
                        key: 'groupId',
                        render: (g) => <Tag color="blue">{g?.name || 'Group'}</Tag>,
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st) => {
                          const colorMap: any = {
                            completed: 'green',
                            paid_pending_approval: 'gold',
                            will_pay_soon: 'orange',
                            rejected: 'red',
                            cancelled: 'default',
                          };
                          return <Tag color={colorMap[st] || 'default'}>{st?.replace(/_/g, ' ')}</Tag>;
                        },
                      },
                      {
                        title: 'Proof',
                        key: 'proof',
                        render: (_, record) =>
                          record.proofUrl ? (
                            <Image
                              src={record.proofUrl}
                              alt="Proof"
                              width={36}
                              height={36}
                              style={{ borderRadius: 6, objectFit: 'cover' }}
                            />
                          ) : (
                            <Text type="secondary" style={{ fontSize: 10 }}>None</Text>
                          ),
                      },
                      {
                        title: 'Date',
                        dataIndex: 'paidAt',
                        key: 'paidAt',
                        render: (d) => <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(d)}</Text>,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        width: 140,
                        render: (_, record) => (
                          <Space size={4}>
                            {record.status === 'paid_pending_approval' && (
                              <Popconfirm
                                title="Approve this payment proof as Super Admin?"
                                onConfirm={() => handleSettlementAction(record._id, 'approve')}
                                okText="Approve"
                                cancelText="Cancel"
                              >
                                <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
                                  Verify
                                </Button>
                              </Popconfirm>
                            )}

                            {record.status !== 'completed' && record.status !== 'cancelled' && (
                              <Popconfirm
                                title="Cancel this settlement transaction?"
                                onConfirm={() => handleSettlementAction(record._id, 'cancel')}
                                okText="Cancel Settlement"
                                cancelText="No"
                              >
                                <Button size="small" icon={<CloseCircleOutlined />}>
                                  Cancel
                                </Button>
                              </Popconfirm>
                            )}

                            <Popconfirm
                              title="Delete this settlement record?"
                              onConfirm={() => handleSettlementAction(record._id, 'delete')}
                              okText="Delete"
                              cancelText="No"
                              okButtonProps={{ danger: true, loading: actionLoadingId === record._id }}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },

            // ==========================================
            // TAB 6: AUDIT ACTIVITIES
            // ==========================================
            {
              key: 'audit',
              label: (
                <Space size={6}>
                  <HistoryOutlined />
                  <span>Audit Logs</span>
                </Space>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      Complete System Activity Audit Trail
                    </Text>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchActivities(1)}>
                      Refresh Logs
                    </Button>
                  </div>

                  <Table
                    dataSource={activities}
                    rowKey="_id"
                    size="small"
                    loading={isActivitiesLoading}
                    scroll={{ x: 600 }}
                    pagination={{
                      current: activitiesPage,
                      pageSize: 15,
                      total: activitiesTotal,
                      onChange: (page) => fetchActivities(page),
                      showSizeChanger: false,
                    }}
                    columns={[
                      {
                        title: 'User',
                        dataIndex: 'user',
                        key: 'user',
                        render: (u) => (
                          <Space size={6}>
                            <Avatar size="small" style={{ backgroundColor: '#1677ff', fontSize: 11 }}>
                              {u?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            <Text strong style={{ fontSize: 12 }}>{u?.fullName || 'User'}</Text>
                          </Space>
                        ),
                      },
                      {
                        title: 'Action Performed',
                        dataIndex: 'action',
                        key: 'action',
                        render: (act) => <Text style={{ fontSize: 12 }}>{act}</Text>,
                      },
                      {
                        title: 'Group',
                        dataIndex: 'groupId',
                        key: 'groupId',
                        render: (g) => <Tag color="blue">{g?.name || 'System'}</Tag>,
                      },
                      {
                        title: 'Timestamp',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (d) => <Text type="secondary" style={{ fontSize: 11 }}>{formatDateTime(d)}</Text>,
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ========================================== */}
      {/* 1. USER DETAIL DRAWER */}
      {/* ========================================== */}
      <Drawer
        open={isUserDetailOpen}
        onClose={() => setIsUserDetailOpen(false)}
        title={
          <Space size={8}>
            <UserOutlined style={{ color: '#1677ff' }} />
            <span>User Account Overview</span>
          </Space>
        }
        width={500}
        destroyOnClose
      >
        {isUserDetailLoading || !selectedUserDetail ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
              <Avatar size={48} style={{ backgroundColor: selectedUserDetail.user.isSuperAdmin ? '#faad14' : '#1677ff' }}>
                {selectedUserDetail.user.fullName?.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {selectedUserDetail.user.fullName}
                </Title>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {selectedUserDetail.user.email}
                </Text>
                {selectedUserDetail.user.isSuperAdmin && (
                  <Tag color="gold" icon={<CrownOutlined />} style={{ marginTop: 4 }}>
                    Super Admin
                  </Tag>
                )}
              </div>
            </div>

            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Phone Number">{selectedUserDetail.user.phone}</Descriptions.Item>
              <Descriptions.Item label="UPI ID / VPA">{selectedUserDetail.user.upiId || 'Not set'}</Descriptions.Item>
              <Descriptions.Item label="QR Code Available">
                {selectedUserDetail.user.qrCodeUrl ? <Tag color="green">Active</Tag> : <Tag color="default">None</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Active Group">
                {selectedUserDetail.membership?.groupId ? (
                  <Tag color="cyan">{selectedUserDetail.membership.groupId.name}</Tag>
                ) : (
                  'No group'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Group Role">
                {selectedUserDetail.membership?.role ? (
                  <Tag color={selectedUserDetail.membership.role === 'creator' ? 'gold' : 'blue'}>
                    {selectedUserDetail.membership.role}
                  </Tag>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Registered On">
                {formatDate(selectedUserDetail.user.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Push Devices Subscribed">
                {selectedUserDetail.pushCount} device(s)
              </Descriptions.Item>
            </Descriptions>

            {/* QR Image Preview if present */}
            {selectedUserDetail.user.qrCodeUrl && (
              <div>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  Active Payment QR Image:
                </Text>
                <Image
                  src={selectedUserDetail.user.qrCodeUrl}
                  alt="QR"
                  width={100}
                  height={100}
                  style={{ borderRadius: 8, objectFit: 'contain', border: '1px solid #e2e8f0' }}
                />
              </div>
            )}

            {/* Balances if in group */}
            {selectedUserDetail.balances && (
              <Card size="small" title="Current Group Balance Summary" style={{ borderRadius: 10 }}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ fontSize: 10 }}>You Need To Pay</span>}
                      value={selectedUserDetail.balances.youNeedToPayTotal || 0}
                      precision={2}
                      prefix="₹"
                      styles={{ content: { fontSize: 14, color: '#ef4444' } }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<span style={{ fontSize: 10 }}>You Will Receive</span>}
                      value={selectedUserDetail.balances.youWillReceiveTotal || 0}
                      precision={2}
                      prefix="₹"
                      styles={{ content: { fontSize: 14, color: '#52c41a' } }}
                    />
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* ========================================== */}
      {/* 2. EDIT USER MODAL */}
      {/* ========================================== */}
      <Modal
        open={isEditUserOpen}
        onCancel={() => setIsEditUserOpen(false)}
        title="Edit User Account"
        footer={null}
        destroyOnClose
        centered
        width={440}
      >
        <Form form={editUserForm} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item label="Full Name" name="fullName" rules={[{ required: true, message: 'Full name required' }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: 'Phone required' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="UPI ID / VPA" name="upiId">
            <Input placeholder="e.g. john@okaxis" />
          </Form.Item>

          <Form.Item
            label="Super Admin Privilege"
            name="isSuperAdmin"
            valuePropName="checked"
            tooltip="Grant master system permissions across entire platform"
          >
            <Switch disabled={user?._id === editingUser?._id} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setIsEditUserOpen(false)} disabled={isSavingUser}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingUser}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ========================================== */}
      {/* 3. RESET PASSWORD MODAL */}
      {/* ========================================== */}
      <Modal
        open={isPasswordOpen}
        onCancel={() => setIsPasswordOpen(false)}
        title={`Reset Password for ${passwordUser?.fullName}`}
        footer={null}
        destroyOnClose
        centered
        width={400}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleSavePassword}>
          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter new password' },
              { min: 8, message: 'Password must be at least 8 characters long' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Min 8 characters" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setIsPasswordOpen(false)} disabled={isSavingPassword}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingPassword}>
              Reset Password
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ========================================== */}
      {/* 4. GROUP DETAIL DRAWER */}
      {/* ========================================== */}
      <Drawer
        open={isGroupDetailOpen}
        onClose={() => setIsGroupDetailOpen(false)}
        title={
          <Space size={8}>
            <TeamOutlined style={{ color: '#1677ff' }} />
            <span>Group Details: {selectedGroupDetail?.group?.name}</span>
          </Space>
        }
        width={560}
        destroyOnClose
      >
        {isGroupDetailLoading || !selectedGroupDetail ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Tabs
            defaultActiveKey="members"
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="Group Name">{selectedGroupDetail.group.name}</Descriptions.Item>
                    <Descriptions.Item label="Invite Code">
                      <Text strong code>{selectedGroupDetail.group.inviteCode}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Group Creator">
                      {selectedGroupDetail.group.createdBy?.fullName || 'System'} ({selectedGroupDetail.group.createdBy?.email})
                    </Descriptions.Item>
                    <Descriptions.Item label="Monthly Payday">
                      {selectedGroupDetail.group.payday ? `${selectedGroupDetail.group.payday}th of every month` : 'Not configured'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created On">
                      {formatDate(selectedGroupDetail.group.createdAt)}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'members',
                label: `Members (${selectedGroupDetail.members?.length || 0})`,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedGroupDetail.members?.map((m: any) => (
                      <div
                        key={m._id}
                        style={{
                          padding: '10px 12px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Space size={8}>
                          <Avatar size="small" style={{ backgroundColor: '#1677ff' }}>
                            {m.userId?.fullName?.charAt(0).toUpperCase() || 'U'}
                          </Avatar>
                          <div>
                            <Text strong style={{ fontSize: 13, display: 'block' }}>
                              {m.userId?.fullName}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {m.userId?.email}
                            </Text>
                            <Tag color={m.role === 'creator' ? 'gold' : 'blue'} style={{ fontSize: 10, marginTop: 2 }}>
                              {m.role === 'creator' ? 'Group Admin' : 'Member'}
                            </Tag>
                          </div>
                        </Space>

                        <Popconfirm
                          title={`Remove ${m.userId?.fullName} from this group?`}
                          onConfirm={() => handleRemoveMember(selectedGroupDetail.group._id, m.userId?._id)}
                          okText="Remove"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            Remove
                          </Button>
                        </Popconfirm>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'expenses',
                label: `Expenses (${selectedGroupDetail.expenses?.length || 0})`,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedGroupDetail.expenses?.map((exp: any) => (
                      <div
                        key={exp._id}
                        style={{
                          padding: '8px 10px',
                          background: '#fafafa',
                          borderRadius: 8,
                          border: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 12, display: 'block' }}>{exp.title}</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>Paid by {exp.paidBy?.fullName}</Text>
                        </div>
                        <Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                          ₹{exp.amount.toFixed(2)}
                        </Text>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* ========================================== */}
      {/* 5. EDIT GROUP MODAL */}
      {/* ========================================== */}
      <Modal
        open={isEditGroupOpen}
        onCancel={() => setIsEditGroupOpen(false)}
        title="Edit Group Details"
        footer={null}
        destroyOnClose
        centered
        width={400}
      >
        <Form form={editGroupForm} layout="vertical" onFinish={handleSaveGroup}>
          <Form.Item label="Group Name" name="name" rules={[{ required: true, message: 'Group name required' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="Monthly Payday (Day 1-31)" name="payday">
            <InputNumber min={1} max={31} style={{ width: '100%' }} placeholder="e.g. 8 for 8th of every month" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setIsEditGroupOpen(false)} disabled={isSavingGroup}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingGroup}>
              Save Group
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ========================================== */}
      {/* 6. EXPENSE DETAIL DRAWER */}
      {/* ========================================== */}
      <Drawer
        open={isExpenseDetailOpen}
        onClose={() => setIsExpenseDetailOpen(false)}
        title="Expense Inspection"
        width={480}
        destroyOnClose
      >
        {selectedExpenseDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Expense Title</Text>
              <Title level={4} style={{ margin: 0 }}>{selectedExpenseDetail.title}</Title>
              <Text strong style={{ fontSize: 20, color: '#1677ff', display: 'block', marginTop: 4 }}>
                ₹{selectedExpenseDetail.amount.toFixed(2)}
              </Text>
            </div>

            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Group">{selectedExpenseDetail.groupId?.name}</Descriptions.Item>
              <Descriptions.Item label="Paid By">{selectedExpenseDetail.paidBy?.fullName}</Descriptions.Item>
              <Descriptions.Item label="Payment Mode">
                <Tag color={selectedExpenseDetail.paymentMode === 'upi' ? 'blue' : 'green'}>
                  {selectedExpenseDetail.paymentMode?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Split Method">
                <Tag color={selectedExpenseDetail.splitType === 'everyone' ? 'purple' : 'orange'}>
                  {selectedExpenseDetail.splitType === 'everyone' ? 'All Members' : 'Specific Members'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Expense Occurrence Date">
                {formatDate(selectedExpenseDetail.date || selectedExpenseDetail.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Record Created At">
                {formatDateTime(selectedExpenseDetail.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            {/* Split Breakdown */}
            <div>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Split Breakdown:
              </Text>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                {selectedExpenseDetail.splitDetails?.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: idx % 2 === 0 ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{d.user?.fullName || 'User'}</Text>
                    <Text strong style={{ fontSize: 12 }}>₹{d.share?.toFixed(2)}</Text>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt Preview */}
            {selectedExpenseDetail.screenshotUrl && (
              <div>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  Bill / Receipt Screenshot:
                </Text>
                <Image
                  src={selectedExpenseDetail.screenshotUrl}
                  alt="Receipt"
                  style={{ maxHeight: 200, borderRadius: 8, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ========================================== */}
      {/* 7. EDIT EXPENSE MODAL */}
      {/* ========================================== */}
      <Modal
        open={isEditExpenseOpen}
        onCancel={() => setIsEditExpenseOpen(false)}
        title="Edit Expense"
        footer={null}
        destroyOnClose
        centered
        width={440}
      >
        <Form form={editExpenseForm} layout="vertical" onFinish={handleSaveExpense}>
          <Form.Item label="Expense Title" name="title" rules={[{ required: true, message: 'Title required' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="Amount (₹)" name="amount" rules={[{ required: true, message: 'Amount required' }]}>
            <InputNumber prefix="₹" min={0.01} style={{ width: '100%' }} precision={2} />
          </Form.Item>

          <Form.Item label="Payment Mode" name="paymentMode">
            <Select
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI / Online' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Expense Date" name="date">
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setIsEditExpenseOpen(false)} disabled={isSavingExpense}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingExpense}>
              Save Expense
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
