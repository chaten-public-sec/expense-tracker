import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Space, Spin, Alert, Flex } from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoginOutlined,
  QrcodeOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';

const { Title, Text } = Typography;

export const JoinGroupPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, refreshUserData } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<{
    groupId: string;
    groupName: string;
    memberCount: number;
    inviteCode: string;
    isAlreadyMember: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid group invite link.');
      setIsLoadingPreview(false);
      return;
    }

    // If user is not authenticated, store token in sessionStorage and direct to login
    if (!user) {
      sessionStorage.setItem('pending_join_token', token);
    }

    const fetchPreview = async () => {
      try {
        setIsLoadingPreview(true);
        setError(null);
        const res = await api.get(`/groups/preview-invite/${token}`);
        setGroupInfo(res.data);
      } catch (err: any) {
        console.error('Fetch Invite Preview Error:', err);
        setError(
          err.response?.data?.message || 'This group invite is invalid, revoked, or no longer active.'
        );
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [token, user]);

  const handleConfirmJoin = async () => {
    if (!token) return;

    if (!user) {
      sessionStorage.setItem('pending_join_token', token);
      navigate('/login');
      return;
    }

    try {
      setIsJoining(true);
      const res = await api.post('/groups/join-by-token', { token });
      sessionStorage.removeItem('pending_join_token');

      showSuccess(`Joined "${res.data.group?.name || groupInfo?.groupName}" successfully!`);
      await refreshUserData();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Join Error:', err);
      showError(err.response?.data?.message || 'Failed to join group.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: '0 16px' }}>
      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
          padding: '12px 8px',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            margin: '0 auto 16px',
          }}
        >
          <QrcodeOutlined />
        </div>

        <Title level={3} style={{ margin: '0 0 6px', fontSize: 20 }}>
          Group Invitation
        </Title>

        {isLoadingPreview ? (
          <div style={{ padding: '30px 0' }}>
            <Spin size="large" />
            <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
              Verifying group invite...
            </Text>
          </div>
        ) : error ? (
          <div>
            <Alert
              type="error"
              showIcon
              message="Invite Unavailable"
              description={error}
              style={{ borderRadius: 12, textAlign: 'left', margin: '16px 0' }}
            />
            <Button
              type="primary"
              block
              onClick={() => navigate('/no-group')}
              style={{ borderRadius: 10, height: 42, backgroundColor: '#2563eb' }}
            >
              Go to Groups
            </Button>
          </div>
        ) : groupInfo ? (
          <div>
            {/* Group Preview Box */}
            <div
              style={{
                padding: '18px 14px',
                background: '#f8fafc',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                margin: '16px 0 20px',
              }}
            >
              <Title level={4} style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>
                {groupInfo.groupName}
              </Title>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                <TeamOutlined style={{ marginRight: 6 }} />
                {groupInfo.memberCount} {groupInfo.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </div>

            {groupInfo.isAlreadyMember ? (
              <div>
                <Alert
                  type="success"
                  showIcon
                  message="Already a Member"
                  description="You are already a member of this group."
                  style={{ borderRadius: 12, marginBottom: 16 }}
                />
                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={() => navigate('/dashboard')}
                  style={{ borderRadius: 12, height: 46, backgroundColor: '#2563eb' }}
                >
                  Open Group Dashboard
                </Button>
              </div>
            ) : !user ? (
              <div>
                <Text style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 16 }}>
                  Sign in or create an account to join this group.
                </Text>
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<LoginOutlined />}
                  onClick={() => {
                    sessionStorage.setItem('pending_join_token', token || '');
                    navigate('/login');
                  }}
                  style={{ borderRadius: 12, height: 46, backgroundColor: '#2563eb' }}
                >
                  Log In to Join
                </Button>
              </div>
            ) : (
              <div>
                <Text style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 18 }}>
                  You are about to join <strong>{groupInfo.groupName}</strong>.
                </Text>

                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={isJoining}
                    onClick={handleConfirmJoin}
                    style={{
                      borderRadius: 12,
                      height: 48,
                      backgroundColor: '#2563eb',
                      fontWeight: 700,
                    }}
                  >
                    Join Group
                  </Button>
                  <Button
                    block
                    size="large"
                    onClick={() => navigate('/dashboard')}
                    style={{ borderRadius: 12, height: 44 }}
                  >
                    Cancel
                  </Button>
                </Space>
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
};
