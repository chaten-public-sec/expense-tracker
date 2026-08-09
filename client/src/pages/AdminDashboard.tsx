import React, { useState, useEffect } from 'react';
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
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';

const { Title, Text } = Typography;

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [stats, setStats] = useState<any | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, groupsRes, usersRes, expensesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/groups'),
        api.get('/admin/users'),
        api.get('/admin/expenses'),
      ]);

      setStats(statsRes.data);
      setGroups(groupsRes.data || []);
      setUsers(usersRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (err: any) {
      console.error('Fetch Admin Data Error:', err);
      showError(err.response?.data?.message || 'Failed to load Super Admin dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      await api.delete(`/admin/groups/${groupId}`);
      showSuccess(`Group "${groupName}" deleted by Super Admin!`);
      fetchAdminData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      showSuccess(`User "${userName}" deleted by Super Admin!`);
      fetchAdminData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await api.delete(`/admin/expenses/${expenseId}`);
      showSuccess('Expense deleted by Super Admin!');
      fetchAdminData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          Loading Super Admin Master Dashboard...
        </Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Super Admin Banner */}
      <Alert
        title={
          <Space align="center">
            <CrownOutlined style={{ color: '#faad14', fontSize: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Super Admin Control Panel</span>
          </Space>
        }
        description="Full system overview & database control. You can manage all groups, users, expenses, and settlements across the application."
        type="warning"
        showIcon
        action={
          <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={fetchAdminData}>
            Refresh Data
          </Button>
        }
        style={{ borderRadius: 14, background: '#fffbe6' }}
      />

      {/* System Overview Stats Cards */}
      <Row gutter={[10, 10]}>
        <Col span={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Total Registered Users</span>}
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined style={{ color: '#1677ff' }} />}
              styles={{ content: { fontSize: 18, fontWeight: 700 } }}
            />
          </Card>
        </Col>

        <Col span={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Total Active Groups</span>}
              value={stats?.totalGroups || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              styles={{ content: { fontSize: 18, fontWeight: 700 } }}
            />
          </Card>
        </Col>

        <Col span={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Total Money Tracked</span>}
              value={stats?.totalExpenseAmount || 0}
              precision={2}
              prefix="₹"
              styles={{ content: { fontSize: 18, fontWeight: 700, color: '#52c41a' } }}
            />
          </Card>
        </Col>

        <Col span={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Total Expenses Recorded</span>}
              value={stats?.totalExpensesCount || 0}
              prefix={<FileTextOutlined style={{ color: '#fa8c16' }} />}
              styles={{ content: { fontSize: 18, fontWeight: 700 } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Admin Management Tabs */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: '12px 14px' } }}>
        <Tabs
          defaultActiveKey="groups"
          items={[
            {
              key: 'groups',
              label: `Manage Groups (${groups.length})`,
              children: (
                <Table
                  dataSource={groups}
                  rowKey="_id"
                  size="small"
                  scroll={{ x: 600 }}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: 'Group Name',
                      dataIndex: 'name',
                      key: 'name',
                      render: (text, record) => (
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{text}</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>Code: {record.inviteCode}</Text>
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
                      title: 'Expenses Sum',
                      dataIndex: 'totalAmount',
                      key: 'totalAmount',
                      render: (amt) => <Text strong style={{ color: '#52c41a' }}>₹{amt.toFixed(2)}</Text>,
                    },
                    {
                      title: 'Payday',
                      dataIndex: 'payday',
                      key: 'payday',
                      render: (p) => (p ? <Tag color="gold">{p}th of month</Tag> : <Text type="secondary">Not set</Text>),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record) => (
                        <Popconfirm
                          title={`Delete group "${record.name}"?`}
                          description="This will permanently delete all group expenses and members."
                          onConfirm={() => handleDeleteGroup(record._id, record.name)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            Delete
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'users',
              label: `Manage Users (${users.length})`,
              children: (
                <Table
                  dataSource={users}
                  rowKey="_id"
                  size="small"
                  scroll={{ x: 600 }}
                  pagination={{ pageSize: 8 }}
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
                            {record.isSuperAdmin && <Tag color="gold" icon={<CrownOutlined />}>Super Admin</Tag>}
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
                      render: (g) => (g ? <Tag color="cyan">{g.name}</Tag> : <Text type="secondary">No group</Text>),
                    },
                    {
                      title: 'UPI / QR',
                      key: 'upi',
                      render: (_, record) => (
                        <Space size={4}>
                          {record.upiId ? <Tag color="blue">{record.upiId}</Tag> : null}
                          {record.qrCodeUrl ? <Tag color="green" icon={<QrcodeOutlined />}>QR Active</Tag> : null}
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
                      render: (_, record) => (
                        !record.isSuperAdmin && record.email !== 'admin@gmail.com' ? (
                          <Popconfirm
                            title={`Delete user account "${record.fullName}"?`}
                            onConfirm={() => handleDeleteUser(record._id, record.fullName)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />}>
                              Delete User
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 11 }}>Protected</Text>
                        )
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'expenses',
              label: `All Expenses (${expenses.length})`,
              children: (
                <Table
                  dataSource={expenses}
                  rowKey="_id"
                  size="small"
                  scroll={{ x: 600 }}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: 'Expense Title',
                      dataIndex: 'title',
                      key: 'title',
                      render: (text) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amt) => <Text strong style={{ color: '#1677ff' }}>₹{amt.toFixed(2)}</Text>,
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
                      title: 'Split Type',
                      dataIndex: 'splitType',
                      key: 'splitType',
                      render: (st) => <Tag color={st === 'everyone' ? 'purple' : 'orange'}>{st}</Tag>,
                    },
                    {
                      title: 'Date',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      render: (d) => <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(d)}</Text>,
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record) => (
                        <Popconfirm
                          title="Delete this expense?"
                          onConfirm={() => handleDeleteExpense(record._id)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>
                            Delete
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
