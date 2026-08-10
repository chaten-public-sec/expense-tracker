import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Avatar,
  Progress,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  UserAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { DownloadAppButton } from '../components/common/DownloadAppModal';
import api from '../services/api';

const { Title, Text } = Typography;

export const Signup: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { loginUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { percent: 0, status: 'normal' as const, label: '' };
    let score = 0;
    if (pass.length >= 8) score += 33;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 33;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 10) score += 34;

    if (score <= 33) return { percent: 33, status: 'exception' as const, label: 'Weak' };
    if (score <= 66) return { percent: 66, status: 'normal' as const, label: 'Medium' };
    return { percent: 100, status: 'success' as const, label: 'Strong' };
  };

  const strength = getPasswordStrength(passwordInput);

  const handleSubmit = async (values: any) => {
    setError('');

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/signup', {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      loginUser(res.data.token, {
        _id: res.data._id,
        fullName: res.data.fullName,
        email: res.data.email,
        phone: res.data.phone,
      });

      showSuccess('Account created successfully!');
      const pendingJoinToken = sessionStorage.getItem('pending_join_token');
      if (pendingJoinToken) {
        navigate(`/join/${pendingJoinToken}`, { replace: true });
      } else {
        navigate('/no-group', { replace: true });
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const msg = err.response?.data?.message || 'Failed to create account.';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '16px 12px',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Avatar
            size={48}
            style={{
              backgroundColor: '#1677ff',
              boxShadow: '0 4px 12px rgba(22,119,255,0.2)',
              marginBottom: 10,
            }}
            icon={<WalletOutlined style={{ fontSize: 24 }} />}
          />
          <Title level={3} style={{ margin: 0, fontSize: 22 }}>
            Create Account
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Join SplitWise to track shared expenses
          </Text>
        </div>

        {error && (
          <Alert
            title={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 14, borderRadius: 10 }}
          />
        )}

        <Card style={{ borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }} styles={{ body: { padding: 18 } }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
          >
            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Full Name</Text>}
              name="fullName"
              rules={[{ required: true, message: 'Please enter your full name' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="e.g. John Doe" size="large" />
            </Form.Item>

            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Phone Number</Text>}
              name="phone"
              rules={[
                { required: true, message: 'Please enter your phone number' },
                { min: 10, message: 'Phone number must be at least 10 digits' },
              ]}
            >
              <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="e.g. 9876543210" size="large" />
            </Form.Item>

            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Email Address</Text>}
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="name@example.com" size="large" />
            </Form.Item>

            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Password</Text>}
              name="password"
              rules={[
                { required: true, message: 'Please create a password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="At least 8 characters"
                size="large"
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </Form.Item>

            {passwordInput && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <Text type="secondary">Strength</Text>
                  <Text strong>{strength.label}</Text>
                </div>
                <Progress percent={strength.percent} status={strength.status} showInfo={false} size="small" />
              </div>
            )}

            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Confirm Password</Text>}
              name="confirmPassword"
              rules={[{ required: true, message: 'Please confirm your password' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Repeat password" size="large" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              icon={<UserAddOutlined />}
              style={{ marginTop: 6 }}
            >
              Sign Up
            </Button>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ fontWeight: 600, color: '#1677ff' }}>
                Sign In
              </Link>
            </Text>
          </div>
        </Card>

        {/* Public Download App CTA Banner */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <DownloadAppButton style={{ width: '100%', height: 42 }} />
        </div>
      </div>
    </div>
  );
};
