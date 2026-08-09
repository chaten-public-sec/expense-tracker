import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Avatar,
  Button,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Space,
  Alert,
  Flex,
  Switch,
  Upload,
  Image,
  Select,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  LogoutOutlined,
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
  CrownOutlined,
  TeamOutlined,
  BellOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
  UploadOutlined,
  CalendarOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../services/api';

const { Title, Text } = Typography;

export const Profile: React.FC = () => {
  const { user, group, userRole, logout, refreshUserData } = useAuth();
  const { showSuccess, showError, confirmAction } = useToast();
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotifications();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);

  // Edit Profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // UPI QR Code Upload state
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(user?.qrCodeUrl || null);
  const [qrCodePublicId, setQrCodePublicId] = useState<string | null>(user?.qrCodePublicId || null);
  const [isUploadingQR, setIsUploadingQR] = useState(false);

  // Admin Payday Settings state
  const [paydayValue, setPaydayValue] = useState<number | null>(group?.payday || null);
  const [isSavingPayday, setIsSavingPayday] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const copyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      showSuccess(`Invite code ${group.inviteCode} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openEditModal = () => {
    editForm.setFieldsValue({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      upiId: user?.upiId || '',
    });
    setQrCodeUrl(user?.qrCodeUrl || null);
    setQrCodePublicId(user?.qrCodePublicId || null);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleQRUpload = async (options: any) => {
    const { file } = options;
    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUploadingQR(true);
      const res = await api.post('/auth/upload-qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setQrCodeUrl(res.data.imageUrl);
      setQrCodePublicId(res.data.publicId);
      showSuccess('QR Code uploaded to Cloudinary!');
    } catch (err: any) {
      console.error('Upload QR Error:', err);
      showError(err.response?.data?.message || 'Failed to upload QR Code image');
    } finally {
      setIsUploadingQR(false);
    }
  };

  const handleUpdateProfile = async (values: any) => {
    setEditError('');

    try {
      setIsSaving(true);
      await api.put('/auth/profile', {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        upiId: values.upiId ? values.upiId.trim() : '',
        qrCodeUrl,
        qrCodePublicId,
      });
      showSuccess('Profile updated successfully!');
      await refreshUserData();
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Update Profile Error:', err);
      const msg = err.response?.data?.message || 'Failed to update profile';
      setEditError(msg);
      showError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayday = async (value: number | null) => {
    try {
      setIsSavingPayday(true);
      await api.put('/groups/payday', { payday: value });
      setPaydayValue(value);
      showSuccess(value ? `Group Payday updated to ${value}th of every month!` : 'Payday cycle disabled');
      await refreshUserData();
    } catch (err: any) {
      console.error('Save Payday Error:', err);
      showError(err.response?.data?.message || 'Failed to update payday settings');
    } finally {
      setIsSavingPayday(false);
    }
  };

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      const success = await subscribePush();
      if (success) {
        showSuccess('Push notifications enabled! You\'ll receive alerts even when the app is closed.');
      } else {
        if (pushPermission === 'denied') {
          showError('Notifications are blocked by your browser. Please enable them in your browser settings.');
        } else {
          showError('Could not enable push notifications. Please try again.');
        }
      }
    } else {
      const success = await unsubscribePush();
      if (success) {
        showSuccess('Push notifications disabled.');
      } else {
        showError('Failed to disable push notifications.');
      }
    }
  };

  const handleLeaveGroup = () => {
    confirmAction({
      title: 'Leave Group',
      content: 'Are you sure you want to leave this group? Please make sure all dues are settled to ₹0.00.',
      danger: true,
      onOk: async () => {
        try {
          setActionLoading(true);
          await api.post('/groups/leave');
          showSuccess('Successfully left the group');
          await refreshUserData();
          navigate('/no-group');
        } catch (err: any) {
          showError(err.response?.data?.message || 'Please settle all active balances before leaving.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDeleteGroup = () => {
    confirmAction({
      title: 'Delete Group',
      content: 'Are you sure you want to permanently delete this group? All recorded expenses and records will be deleted.',
      danger: true,
      onOk: async () => {
        try {
          setActionLoading(true);
          await api.delete('/groups');
          showSuccess('Group deleted successfully');
          await refreshUserData();
          navigate('/no-group');
        } catch (err: any) {
          showError(err.response?.data?.message || 'Failed to delete group');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleSignOut = () => {
    confirmAction({
      title: 'Sign Out',
      content: 'Are you sure you want to sign out?',
      danger: true,
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  };

  const getPushStatusInfo = () => {
    if (!pushSupported) {
      return {
        color: '#9ca3af' as const,
        icon: <StopOutlined style={{ color: '#9ca3af' }} />,
        label: 'Not Supported',
        description: 'Your browser does not support push notifications.',
      };
    }
    if (pushPermission === 'denied') {
      return {
        color: '#ff4d4f' as const,
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        label: 'Blocked',
        description: 'Notifications blocked by browser. Enable in browser settings → Site permissions.',
      };
    }
    if (pushSubscribed) {
      return {
        color: '#52c41a' as const,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        label: 'Active',
        description: 'You\'ll receive push notifications for expenses, settlements and group activity.',
      };
    }
    return {
      color: '#faad14' as const,
      icon: <BellOutlined style={{ color: '#faad14' }} />,
      label: 'Disabled',
      description: 'Turn on to get notified about new expenses and settlements even when the app is closed.',
    };
  };

  const pushStatus = getPushStatusInfo();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Profile Header Card */}
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 18 } }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Space align="center" size={12}>
            <Avatar
              size={54}
              style={{
                backgroundColor: '#0f172a',
                fontSize: 20,
                fontWeight: 600,
              }}
              icon={<UserOutlined />}
            >
              {user?.fullName?.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 16 }}>
                {user?.fullName}
              </Title>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {user?.email}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {user?.phone || 'No phone set'}
              </Text>
              {user?.upiId && (
                <Tag color="blue" icon={<CreditCardOutlined />} style={{ marginTop: 4 }}>
                  UPI: {user.upiId}
                </Tag>
              )}
            </div>
          </Space>

          <Button size="small" icon={<EditOutlined />} onClick={openEditModal} style={{ borderRadius: 8 }}>
            Edit
          </Button>
        </div>

        {/* Saved QR Code preview */}
        {user?.qrCodeUrl && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image
              src={user.qrCodeUrl}
              alt="My QR Code"
              width={48}
              height={48}
              style={{ borderRadius: 6, objectFit: 'contain', border: '1px solid #e2e8f0' }}
            />
            <div>
              <Text strong style={{ fontSize: 12, display: 'block' }}>
                Payment QR Code Active
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Flatmates can scan this to send you money
              </Text>
            </div>
          </div>
        )}
      </Card>

      {/* Push Notifications Card */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Space size={8} align="center">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: pushSubscribed ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${pushSubscribed ? '#bbf7d0' : '#e2e8f0'}`,
              }}
            >
              <BellOutlined style={{ fontSize: 16, color: pushSubscribed ? '#16a34a' : '#64748b' }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 14, display: 'block' }}>
                Push Notifications
              </Text>
              <Space size={4}>
                {pushStatus.icon}
                <Text style={{ fontSize: 11, color: pushStatus.color, fontWeight: 600 }}>
                  {pushStatus.label}
                </Text>
              </Space>
            </div>
          </Space>

          <Switch
            checked={pushSubscribed}
            loading={pushLoading}
            disabled={!pushSupported || pushPermission === 'denied'}
            onChange={handlePushToggle}
            style={{
              backgroundColor: pushSubscribed ? '#52c41a' : undefined,
            }}
          />
        </div>

        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'block' }}>
            {pushStatus.description}
          </Text>
          <Text type="secondary" style={{ fontSize: 10, marginTop: 4, display: 'block', color: '#1677ff' }}>
            💡 <strong>iPhone / iOS Tip:</strong> Tap Share icon → <strong>'Add to Home Screen'</strong> to enable native Safari web push notifications!
          </Text>
        </div>
      </Card>

      {/* Active Group & Admin Payday Card */}
      {group ? (
        <Card
          title={
            <Space size={6}>
              <TeamOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 14 }}>Group: {group.name}</span>
            </Space>
          }
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 14 } }}
        >
          <Flex vertical gap={10}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Your Role</Text>
              <Tag color={userRole === 'creator' ? 'gold' : 'blue'} icon={userRole === 'creator' ? <CrownOutlined /> : undefined} style={{ margin: 0 }}>
                {userRole === 'creator' ? 'Admin' : 'Member'}
              </Tag>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Invite Code</Text>
              <Space size={4}>
                <Text code style={{ fontSize: 13, fontWeight: 700 }}>{group.inviteCode}</Text>
                <Button size="small" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={copyCode}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </Space>
            </div>

            {/* Admin Payday Settings */}
            {userRole === 'creator' && (
              <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
                <Space align="center" style={{ marginBottom: 6 }}>
                  <SettingOutlined style={{ color: '#1677ff' }} />
                  <Text strong style={{ fontSize: 13 }}>Admin Group Settings: Monthly Payday</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                  Set monthly payday date (e.g., 8th). Dues cycle will automatically calculate (8 Aug – 8 Sept).
                </Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select monthly payday day"
                  value={paydayValue}
                  loading={isSavingPayday}
                  onChange={handleSavePayday}
                  allowClear
                  options={[
                    ...Array.from({ length: 31 }, (_, i) => ({
                      value: i + 1,
                      label: `${i + 1}${i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'} of every month`,
                    })),
                  ]}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
              <Button danger block onClick={handleLeaveGroup} loading={actionLoading} style={{ fontSize: 13 }}>
                Leave Group
              </Button>
              {userRole === 'creator' && (
                <Button danger type="primary" block onClick={handleDeleteGroup} loading={actionLoading} style={{ fontSize: 13 }}>
                  Delete Group
                </Button>
              )}
            </div>
          </Flex>
        </Card>
      ) : (
        <Card style={{ borderRadius: 14, textAlign: 'center', padding: 16 }}>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            You are not in any group currently.
          </Text>
          <Button type="primary" onClick={() => navigate('/no-group')}>
            Join or Create Group
          </Button>
        </Card>
      )}

      {/* Logout Card */}
      <Button
        danger
        size="large"
        block
        icon={<LogoutOutlined />}
        onClick={handleSignOut}
        style={{ borderRadius: 12 }}
      >
        Sign Out
      </Button>

      {/* Edit Profile Modal */}
      <Modal
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        title="Edit Profile & Payment Details"
        footer={null}
        centered
        width={400}
      >
        {editError && (
          <Alert
            title={editError}
            type="error"
            showIcon
            closable
            onClose={() => setEditError('')}
            style={{ marginBottom: 14 }}
          />
        )}

        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
          requiredMark={false}
        >
          <Form.Item
            label={<Text strong style={{ fontSize: 13 }}>Full Name</Text>}
            name="fullName"
            rules={[{ required: true, message: 'Please enter your full name' }]}
          >
            <Input prefix={<UserOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label={<Text strong style={{ fontSize: 13 }}>Phone Number</Text>}
            name="phone"
            rules={[{ required: true, message: 'Please enter your phone number' }]}
          >
            <Input prefix={<PhoneOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label={<Text strong style={{ fontSize: 13 }}>UPI ID / VPA (Optional)</Text>}
            name="upiId"
            tooltip="Your flatmates will see this when settling dues"
          >
            <Input prefix={<CreditCardOutlined />} placeholder="e.g. john@okicici or 9876543210@paytm" size="large" />
          </Form.Item>

          {/* QR Code Upload */}
          <Form.Item label={<Text strong style={{ fontSize: 13 }}>UPI Payment QR Code Image</Text>}>
            {qrCodeUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <Image src={qrCodeUrl} width={60} height={60} style={{ objectFit: 'contain', borderRadius: 6 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: 'block' }}>QR Code Uploaded</Text>
                  <Upload customRequest={handleQRUpload} showUploadList={false}>
                    <Button size="small" icon={<UploadOutlined />} loading={isUploadingQR}>
                      Replace Image
                    </Button>
                  </Upload>
                </div>
              </div>
            ) : (
              <Upload customRequest={handleQRUpload} showUploadList={false}>
                <Button block icon={<QrcodeOutlined />} loading={isUploadingQR} style={{ height: 42 }}>
                  Upload QR Code Screenshot
                </Button>
              </Upload>
            )}
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSaving}>
              Save Profile
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
