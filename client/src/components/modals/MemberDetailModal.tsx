import React, { useState } from 'react';
import { Modal, Avatar, Tag, Typography, Statistic, Row, Col, Card, Space, Divider, Button, Image, Flex, Tabs } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  CrownOutlined,
  CreditCardOutlined,
  CopyOutlined,
  CheckOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
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

  const everyoneShare = member.everyoneShare || 0;
  const specificShare = member.specificShare || 0;
  const totalPaid = member.totalPaid || 0;
  const totalOwes = member.totalOwes || 0;
  const totalReceives = member.totalReceives || 0;
  const netBalance = (totalReceives - totalOwes);
  const owesList = member.owesList || [];
  const receivesList = member.receivesList || [];

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <UserOutlined style={{ color: '#1677ff' }} />
          <span>Member Financial Profile</span>
        </Space>
      }
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={500}
      centered
    >
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {/* Avatar & Name */}
        <Avatar
          size={64}
          icon={<UserOutlined />}
          style={{
            backgroundColor: '#0f172a',
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          {member.fullName?.charAt(0).toUpperCase()}
        </Avatar>

        <Title level={4} style={{ margin: 0 }}>
          {member.fullName}
        </Title>

        <div style={{ marginTop: 4, marginBottom: 14 }}>
          <Tag color={member.role === 'creator' ? 'gold' : 'blue'} icon={member.role === 'creator' ? <CrownOutlined /> : undefined}>
            {member.role === 'creator' ? 'Group Creator / Admin' : 'Member'}
          </Tag>
        </div>

        {/* Contact & UPI Info */}
        <Card size="small" style={{ background: '#fafafa', borderRadius: 10, textAlign: 'left', marginBottom: 14 }}>
          <Space style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 6 }}>
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

            <Divider style={{ margin: '4px 0' }} />
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
          <div style={{ marginBottom: 14, padding: 10, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              UPI Payment QR Code
            </Text>
            <Image
              src={member.qrCodeUrl}
              alt={`${member.fullName} QR Code`}
              width={120}
              height={120}
              style={{ objectFit: 'contain', borderRadius: 6 }}
            />
          </div>
        )}

        {/* Expense Types Breakdown (All / Everyone vs Individual / Specific) */}
        <Card
          size="small"
          title={
            <Text strong style={{ fontSize: 12 }}>
              Expense Breakdown by Type
            </Text>
          }
          style={{ borderRadius: 10, marginBottom: 12, textAlign: 'left' }}
          styles={{ body: { padding: '10px 12px' } }}
        >
          <Flex vertical gap={8}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={6}>
                <TeamOutlined style={{ color: '#1677ff' }} />
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>All / Everyone Share</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>Group-wide expenses (divided equally)</Text>
                </div>
              </Space>
              <Text strong style={{ fontSize: 13, color: '#1677ff' }}>
                ₹{everyoneShare.toFixed(2)}
              </Text>
            </div>

            <Divider style={{ margin: '2px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={6}>
                <UsergroupAddOutlined style={{ color: '#722ed1' }} />
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>Individual / Specific Share</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>Selected participants split (e.g. ₹500 / n)</Text>
                </div>
              </Space>
              <Text strong style={{ fontSize: 13, color: '#722ed1' }}>
                ₹{specificShare.toFixed(2)}
              </Text>
            </div>

            <Divider style={{ margin: '2px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size={6}>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <Text style={{ fontSize: 12, fontWeight: 600 }}>Total Money Paid Out</Text>
              </Space>
              <Text strong style={{ fontSize: 13, color: '#52c41a' }}>
                ₹{totalPaid.toFixed(2)}
              </Text>
            </div>
          </Flex>
        </Card>

        {/* Detailed Pairwise Dues Breakdown (Who this member owes & Who owes this member) */}
        <Card
          size="small"
          title={<Text strong style={{ fontSize: 12 }}>Pairwise Dues Breakdown</Text>}
          style={{ borderRadius: 10, marginBottom: 12, textAlign: 'left' }}
          styles={{ body: { padding: '8px 10px' } }}
        >
          <Tabs
            size="small"
            items={[
              {
                key: 'owes',
                label: `Owes Flatmates (${owesList.length})`,
                children: (
                  owesList.length > 0 ? (
                    <Flex vertical gap={6}>
                      {owesList.map((item) => (
                        <div
                          key={item.user._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: '#fafafa',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0',
                          }}
                        >
                          <Space size={8} align="center">
                            <Avatar size={26} style={{ backgroundColor: '#ef4444', fontSize: 11 }} icon={<UserOutlined />}>
                              {item.user.fullName?.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text strong style={{ fontSize: 12, display: 'block', lineHeight: 1.1 }}>
                                {item.user.fullName}
                              </Text>
                              {item.user.upiId && (
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                  UPI: {item.user.upiId}
                                </Text>
                              )}
                            </div>
                          </Space>
                          <Text strong style={{ fontSize: 13, color: '#ef4444' }}>
                            Owes ₹{item.amount.toFixed(2)}
                          </Text>
                        </div>
                      ))}
                    </Flex>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', padding: '12px 0' }}>
                      Does not owe money to any flatmate
                    </Text>
                  )
                ),
              },
              {
                key: 'receives',
                label: `Receives From (${receivesList.length})`,
                children: (
                  receivesList.length > 0 ? (
                    <Flex vertical gap={6}>
                      {receivesList.map((item) => (
                        <div
                          key={item.user._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: '#fafafa',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0',
                          }}
                        >
                          <Space size={8} align="center">
                            <Avatar size={26} style={{ backgroundColor: '#10b981', fontSize: 11 }} icon={<UserOutlined />}>
                              {item.user.fullName?.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text strong style={{ fontSize: 12, display: 'block', lineHeight: 1.1 }}>
                                {item.user.fullName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                {item.user.phone || item.user.email}
                              </Text>
                            </div>
                          </Space>
                          <Text strong style={{ fontSize: 13, color: '#10b981' }}>
                            Receives ₹{item.amount.toFixed(2)}
                          </Text>
                        </div>
                      ))}
                    </Flex>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', padding: '12px 0' }}>
                      Not owed money by any flatmate
                    </Text>
                  )
                ),
              },
            ]}
          />
        </Card>

        {/* Net Settlement Balances */}
        <Row gutter={8}>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: '#fff1f0', borderColor: '#ffa39e' }}>
              <Statistic
                title={<span style={{ fontSize: 11, color: '#cf1322' }}>Net Owes</span>}
                value={totalOwes}
                precision={2}
                prefix="₹"
                styles={{ content: { fontSize: 13, fontWeight: 700, color: '#cf1322' } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Statistic
                title={<span style={{ fontSize: 11, color: '#389e0d' }}>Net Receives</span>}
                value={totalReceives}
                precision={2}
                prefix="₹"
                styles={{ content: { fontSize: 13, fontWeight: 700, color: '#389e0d' } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: netBalance > 0 ? '#e6f4ff' : netBalance < 0 ? '#fff2f0' : '#fafafa' }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>Net Position</span>}
                value={Math.abs(netBalance)}
                precision={2}
                prefix={netBalance > 0 ? '+₹' : netBalance < 0 ? '-₹' : '₹'}
                styles={{ content: { fontSize: 13, fontWeight: 700, color: netBalance > 0 ? '#0958d9' : netBalance < 0 ? '#cf1322' : '#595959' } }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};
