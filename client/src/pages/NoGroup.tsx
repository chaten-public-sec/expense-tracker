import React, { useState, useEffect } from 'react';
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
  Divider,
} from 'antd';
import {
  PlusOutlined,
  LoginOutlined,
  CopyOutlined,
  CheckOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../services/api';
import { QRScannerModal } from '../components/modals/QRScannerModal';

const { Title, Text } = Typography;

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
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Created Group Code Result Modal
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);
  const [createdGroupName, setCreatedGroupName] = useState('');
  const [copied, setCopied] = useState(false);

  // Check if there was a preserved join token from scanning while logged out
  useEffect(() => {
    const pendingToken = sessionStorage.getItem('pending_join_token');
    if (pendingToken) {
      navigate(`/join/${pendingToken}`);
    }
  }, [navigate]);

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

  const handleScanSuccess = (tokenOrCode: string) => {
    navigate(`/join/${tokenOrCode}`);
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
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 18 } }}>
        {/* Toggle between Create and Join */}
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
                  <span>Join a Group</span>
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
              style={{ marginTop: 8, height: 46, borderRadius: 10, backgroundColor: '#2563eb' }}
            >
              Create Group
            </Button>
          </Form>
        ) : (
          <div>
            <Form
              form={joinForm}
              layout="vertical"
              onFinish={handleJoinGroup}
              requiredMark={false}
            >
              <Form.Item
                label={<Text strong style={{ fontSize: 13 }}>Enter 6-Character Invite Code</Text>}
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
                    borderRadius: 10,
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
                style={{ height: 46, borderRadius: 10, backgroundColor: '#2563eb' }}
              >
                Join with Code
              </Button>
            </Form>

            <Divider plain style={{ margin: '16px 0', fontSize: 12, color: '#94a3b8' }}>
              OR
            </Divider>

            {/* QR Scan Action */}
            <Button
              block
              size="large"
              icon={<QrcodeOutlined style={{ color: '#2563eb', fontSize: 16 }} />}
              onClick={() => setIsScannerOpen(true)}
              style={{
                height: 46,
                borderRadius: 10,
                fontWeight: 600,
                borderColor: '#cbd5e1',
              }}
            >
              Scan QR Code
            </Button>
          </div>
        )}
      </Card>

      {/* Sign out link */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button type="text" danger icon={<LogoutOutlined />} onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onSwitchToCodeInput={() => setActiveTab('join')}
      />

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
          <Title level={4} style={{ margin: 0, color: '#2563eb' }}>
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
              border: '2px dashed #2563eb',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: 800,
                fontFamily: 'monospace',
                letterSpacing: 6,
                color: '#2563eb',
              }}
            >
              {createdGroupCode}
            </Text>
          </div>

          <Button
            icon={copied ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CopyOutlined />}
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
