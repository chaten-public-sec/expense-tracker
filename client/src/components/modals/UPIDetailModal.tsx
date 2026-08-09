import React, { useState } from 'react';
import { Modal, Typography, Button, Space, Avatar, Image, Tag, Flex } from 'antd';
import {
  QrcodeOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
  DollarOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { User } from '../../types';

const { Title, Text } = Typography;

interface UPIDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  amountToPay?: number;
  onPayClick?: (user: User, amount?: number) => void;
}

export const UPIDetailModal: React.FC<UPIDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  amountToPay,
  onPayClick,
}) => {
  const { showSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const copyUPI = () => {
    if (user.upiId) {
      navigator.clipboard.writeText(user.upiId);
      setCopied(true);
      showSuccess(`UPI ID ${user.upiId} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <QrcodeOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span>Payment Details — {user.fullName}</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        onPayClick && amountToPay && amountToPay > 0 && (
          <Button
            key="pay"
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => {
              onClose();
              onPayClick(user, amountToPay);
            }}
          >
            Settle ₹{amountToPay.toFixed(2)}
          </Button>
        ),
      ]}
      width={400}
      centered
    >
      <Flex vertical align="center" gap={14} style={{ padding: '10px 0' }}>
        {/* User Avatar & Name */}
        <Flex vertical align="center" gap={4}>
          <Avatar
            size={56}
            style={{ backgroundColor: '#0f172a', fontSize: 22, fontWeight: 600 }}
            icon={<UserOutlined />}
          >
            {user.fullName?.charAt(0).toUpperCase()}
          </Avatar>
          <Title level={4} style={{ margin: 0, fontSize: 16 }}>
            {user.fullName}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {user.email} • {user.phone}
          </Text>
        </Flex>

        {/* Dues Banner */}
        {amountToPay !== undefined && amountToPay > 0 && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#f0f5ff',
              border: '1px solid #adc6ff',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              Amount Dues to Pay
            </Text>
            <Text strong style={{ fontSize: 22, color: '#1677ff' }}>
              ₹{amountToPay.toFixed(2)}
            </Text>
          </div>
        )}

        {/* UPI ID Box */}
        <div style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            UPI ID / VPA
          </Text>
          {user.upiId ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              <Space size={6}>
                <CreditCardOutlined style={{ color: '#1677ff' }} />
                <Text code strong style={{ fontSize: 13 }}>
                  {user.upiId}
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
          ) : (
            <Tag color="default" style={{ width: '100%', textAlign: 'center', padding: 6 }}>
              No UPI ID provided by member
            </Tag>
          )}
        </div>

        {/* QR Code Display */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Payment QR Code
          </Text>
          {user.qrCodeUrl ? (
            <div
              style={{
                padding: 12,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <Image
                src={user.qrCodeUrl}
                alt={`${user.fullName} QR Code`}
                width={180}
                height={180}
                style={{ objectFit: 'contain', borderRadius: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 6 }}>
                Tap image to expand & scan via GPay / PhonePe / Paytm
              </Text>
            </div>
          ) : (
            <div
              style={{
                padding: '24px 12px',
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: 10,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                No QR code uploaded by {user.fullName}
              </Text>
            </div>
          )}
        </div>
      </Flex>
    </Modal>
  );
};
