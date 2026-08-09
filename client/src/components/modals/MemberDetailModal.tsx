import React, { useState } from 'react';
import { Modal, Avatar, Tag, Typography, Statistic, Row, Col, Card, Space, Divider, Button, Image } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  CrownOutlined,
  CreditCardOutlined,
  CopyOutlined,
  CheckOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { GroupMember } from '../../types';

const { Title, Text } = Typography;

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GroupMember | null;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  if (!member) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  };

  const copyUPI = () => {
    if (member.upiId) {
      navigator.clipboard.writeText(member.upiId);
      setCopied(true);
      showSuccess(`UPI ID ${member.upiId} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <UserOutlined style={{ color: '#1677ff' }} />
          <span>Member Profile</span>
        </Space>
      }
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={440}
    >
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        {/* Avatar & Name */}
        <Avatar
          size={64}
          icon={<UserOutlined />}
          style={{
            backgroundColor: '#1677ff',
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {member.fullName?.charAt(0).toUpperCase()}
        </Avatar>

        <Title level={4} style={{ margin: 0 }}>
          {member.fullName}
        </Title>

        <div style={{ marginTop: 6, marginBottom: 16 }}>
          <Tag color={member.role === 'creator' ? 'gold' : 'blue'} icon={member.role === 'creator' ? <CrownOutlined /> : undefined}>
            {member.role === 'creator' ? 'Group Creator / Admin' : 'Member'}
          </Tag>
        </div>

        {/* Contact & UPI Info */}
        <Card size="small" style={{ background: '#fafafa', borderRadius: 8, textAlign: 'left', marginBottom: 16 }}>
          <Space style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 8 }}>
            <Space>
              <MailOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ fontSize: 13 }}>{member.email}</Text>
            </Space>
            <Space>
              <PhoneOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ fontSize: 13 }}>{member.phone || 'No phone number'}</Text>
            </Space>

            {member.upiId && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <Space>
                  <CreditCardOutlined style={{ color: '#1677ff' }} />
                  <Text code style={{ fontSize: 12, fontWeight: 600 }}>
                    {member.upiId}
                  </Text>
                </Space>
                <Button
                  size="small"
                  icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                  onClick={copyUPI}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}

            <Divider style={{ margin: '6px 0' }} />
            <Space>
              <CalendarOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Joined {formatDate(member.joinedAt)}
              </Text>
            </Space>
          </Space>
        </Card>

        {/* QR Code Display */}
        {member.qrCodeUrl && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
              UPI Payment QR Code
            </Text>
            <Image
              src={member.qrCodeUrl}
              alt={`${member.fullName} QR Code`}
              width={140}
              height={140}
              style={{ objectFit: 'contain', borderRadius: 6 }}
            />
          </div>
        )}

        {/* Financial Metrics */}
        <Row gutter={8}>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>Paid</span>}
                value={member.totalPaid || 0}
                precision={2}
                prefix="₹"
                styles={{ content: { fontSize: 14, fontWeight: 700 } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>Owes</span>}
                value={member.totalOwes || 0}
                precision={2}
                prefix="₹"
                styles={{ content: { fontSize: 14, fontWeight: 700, color: '#ef4444' } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>Receives</span>}
                value={member.totalReceives || 0}
                precision={2}
                prefix="₹"
                styles={{ content: { fontSize: 14, fontWeight: 700, color: '#10b981' } }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};
