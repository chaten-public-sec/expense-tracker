import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Segmented,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Modal,
  Select,
  Flex,
} from 'antd';
import {
  PlusOutlined,
  LoginOutlined,
  CopyOutlined,
  CheckOutlined,
  LogoutOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const GROUP_CATEGORIES = [
  { label: 'Roommates / Flatmates', value: 'Flatmates' },
  { label: 'Apartment / Society', value: 'Apartment' },
  { label: 'PG Residents', value: 'PG Residents' },
  { label: 'Hostel Students', value: 'Hostel' },
  { label: 'Trip / Vacation', value: 'Trip' },
];

export const NoGroup: React.FC = () => {
  const { user, refreshUserData, logout } = useAuth();
  const { showSuccess, showError, confirmAction } = useToast();
  const { subscribe: subscribePush } = usePushNotifications();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [createForm] = Form.useForm();
  const [joinForm] = Form.useForm();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Created Group Code Result Modal
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);
  const [createdGroupName, setCreatedGroupName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateGroup = async (values: any) => {
    setError('');

    if (!values.groupName?.trim()) {
      setError('Please enter a group name');
      return;
    }

    try {
      setIsLoading(true);
      const name = `${values.groupName.trim()} (${values.category || 'Flatmates'})`;
      const res = await api.post('/groups', { name });

      setCreatedGroupCode(res.data.group.inviteCode);
      setCreatedGroupName(res.data.group.name);
      showSuccess('Group created successfully!');
      await refreshUserData();

      // Trigger push notification permission
      subscribePush();
    } catch (err: any) {
      console.error('Create Group Error:', err);
      const msg = err.response?.data?.message || 'Failed to create group';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (values: any) => {
    setError('');

    const code = values.inviteCode?.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character invite code');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/groups/join', { inviteCode: code });
      showSuccess(`Joined group "${res.data.group.name}"!`);
      await refreshUserData();

      // Trigger push notification permission
      subscribePush();

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Join Group Error:', err);
      const msg = err.response?.data?.message || 'Invalid invite code or failed to join group.';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCreatedCode = () => {
    if (createdGroupCode) {
      navigator.clipboard.writeText(createdGroupCode);
      setCopied(true);
      showSuccess('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = () => {
    confirmAction({
      title: 'Sign Out',
      content: 'Are you sure you want to sign out?',
      onOk: () => {
        logout();
        navigate('/login');
      },
      danger: true,
    });
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: 440, margin: '0 auto' }}>
      {/* Header Greeting */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingTop: 8 }}>
        <Title level={3} style={{ margin: 0, fontSize: 22 }}>
          Welcome, {user?.fullName?.split(' ')[0]}
        </Title>
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4, padding: '0 8px' }}>
          Create a group to start splitting bills with flatmates or join an existing group.
        </Text>
      </div>

      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 18 } }}>
        {/* Mobile Segmented Toggle */}
        <Segmented
          value={activeTab}
          onChange={(val) => {
            setActiveTab(val as 'create' | 'join');
            setError('');
          }}
          options={[
            {
              label: (
                <Space size={4} style={{ padding: '4px 0' }}>
                  <PlusOutlined />
                  <span>Create Group</span>
                </Space>
              ),
              value: 'create',
            },
            {
              label: (
                <Space size={4} style={{ padding: '4px 0' }}>
                  <LoginOutlined />
                  <span>Join with Code</span>
                </Space>
              ),
              value: 'join',
            },
          ]}
          block
          style={{ marginBottom: 20, padding: 3, background: '#f1f5f9' }}
        />

        {activeTab === 'create' ? (
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateGroup}
            initialValues={{ category: 'Flatmates' }}
            requiredMark={false}
          >
            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Group Name</Text>}
              name="groupName"
              rules={[{ required: true, message: 'Please enter a name for your group' }]}
            >
              <Input placeholder="e.g. Flat 304, Green Heights, Goa Trip" size="large" />
            </Form.Item>

            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Group Category</Text>}
              name="category"
            >
              <Select size="large" options={GROUP_CATEGORIES} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              icon={<PlusOutlined />}
              style={{ marginTop: 8 }}
            >
              Create Group
            </Button>
          </Form>
        ) : (
          <Form
            form={joinForm}
            layout="vertical"
            onFinish={handleJoinGroup}
            requiredMark={false}
          >
            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>6-Character Invite Code</Text>}
              name="inviteCode"
              rules={[
                { required: true, message: 'Please enter the 6-character group invite code' },
                { len: 6, message: 'Code must be exactly 6 characters' },
              ]}
            >
              <Input
                placeholder="e.g. AB12CD"
                maxLength={6}
                size="large"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 4,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              icon={<LoginOutlined />}
              style={{ marginTop: 8 }}
            >
              Join Group
            </Button>
          </Form>
        )}
      </Card>

      {/* Sign out link */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button type="text" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {/* Created Group Success Modal */}
      <Modal
        open={!!createdGroupCode}
        onCancel={() => {
          setCreatedGroupCode(null);
          navigate('/dashboard');
        }}
        footer={[
          <Button
            key="dashboard"
            type="primary"
            size="large"
            block
            onClick={() => {
              setCreatedGroupCode(null);
              navigate('/dashboard');
            }}
          >
            Go to Dashboard
          </Button>,
        ]}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Title level={4} style={{ margin: 0, color: '#1677ff' }}>
            Group Created Successfully!
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', margin: '8px 0 16px' }}>
            Share this invite code with flatmates so they can join <strong>{createdGroupName}</strong>:
          </Text>

          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: 12,
              border: '2px dashed #1677ff',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: 800,
                fontFamily: 'monospace',
                letterSpacing: 6,
                color: '#1677ff',
              }}
            >
              {createdGroupCode}
            </Text>
          </div>

          <Button
            icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
            onClick={copyCreatedCode}
            size="middle"
            style={{ marginBottom: 8 }}
          >
            {copied ? 'Code Copied!' : 'Copy Invite Code'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
