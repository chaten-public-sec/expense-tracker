import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Checkbox,
  Button,
  Typography,
  Alert,
  Avatar,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  LoginOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { loginUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email');
    if (savedEmail) {
      form.setFieldsValue({ email: savedEmail, remember: true });
    }
  }, [form]);

  const handleSubmit = async (values: any) => {
    setError('');

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', {
        email: values.email.trim(),
        password: values.password,
      });

      if (values.remember) {
        localStorage.setItem('saved_email', values.email.trim());
      } else {
        localStorage.removeItem('saved_email');
      }

      await loginUser(
        res.data.token,
        {
          _id: res.data._id,
          fullName: res.data.fullName,
          email: res.data.email,
          phone: res.data.phone,
        },
        res.data.group || null,
        res.data.role || null
      );

      showSuccess(`Welcome back, ${res.data.fullName}!`);

      if (res.data.group) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/no-group', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
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
      <div style={{ maxWidth: 400, width: '100%' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
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
            SplitWise Pro
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Shared living & flatmate expense tracker
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
            initialValues={{ remember: true }}
            requiredMark={false}
          >
            <Form.Item
              label={<Text strong style={{ fontSize: 13 }}>Email</Text>}
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
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Enter your password" size="large" />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox style={{ fontSize: 13 }}>Remember email</Checkbox>
              </Form.Item>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              icon={<LoginOutlined />}
            >
              Sign In
            </Button>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ fontWeight: 600, color: '#1677ff' }}>
                Sign Up
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};
