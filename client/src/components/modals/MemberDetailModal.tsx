import React from 'react';
import { Modal, Avatar, Tag, Typography, Statistic, Row, Col, Card, Space, Divider, Button } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  CrownOutlined,
} from '@ant-design/icons';
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
  if (!member) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
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

        {/* Contact Info */}
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
            <Divider style={{ margin: '6px 0' }} />
            <Space>
              <CalendarOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Joined {formatDate(member.joinedAt)}
              </Text>
            </Space>
          </Space>
        </Card>

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
