import React, { useState } from 'react';
import { Modal, Typography, Button, Space, Avatar, Image, Tag, Flex, Row, Col } from 'antd';
import {
  QrcodeOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
  DollarOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { User } from '../../types';
import { launchAppSpecificUPI, UPI_APPS, UPIAppType } from '../../utils/upiHelper';

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
  const { showSuccess, showError } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  if (!user) return null;

  const handleLaunchApp = (appId: UPIAppType) => {
    if (!user.upiId) {
      showError('Member has not configured a UPI ID');
      return;
    }

    launchAppSpecificUPI(
      appId,
      {
        upiId: user.upiId,
        name: user.fullName,
        amount: amountToPay || 0,
        note: `SplitWise Payment to ${user.fullName}`,
      },
      () => {
        showSuccess('Launching UPI app... Or scan QR code below.');
      }
    );
  };

  const copyAmount = () => {
    if (amountToPay) {
      navigator.clipboard.writeText(amountToPay.toFixed(2));
      setCopiedAmount(true);
      showSuccess(`Amount ₹${amountToPay.toFixed(2)} copied to clipboard!`);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

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
      width={460}
      centered
      style={{ maxWidth: '96vw' }}
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

        {/* Dues Banner & App Selector Grid */}
        {amountToPay !== undefined && amountToPay > 0 && (
          <div
            style={{
              width: '100%',
              padding: '12px 14px',
              background: '#f0f5ff',
              border: '1px solid #adc6ff',
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              Calculated Dues to Pay
            </Text>
            <Text strong style={{ fontSize: 22, color: '#1677ff', display: 'block', marginBottom: 6 }}>
              ₹{amountToPay.toFixed(2)}
            </Text>

            <Button
              size="small"
              onClick={copyAmount}
              icon={copiedAmount ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
              style={{
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {copiedAmount ? 'Copied ₹' + amountToPay.toFixed(2) : '1-Tap Copy Amount (₹' + amountToPay.toFixed(2) + ')'}
            </Button>

            {user.upiId && (
              <Row gutter={[6, 6]}>
                {UPI_APPS.map((app) => (
                  <Col span={12} sm={8} key={app.id}>
                    <Button
                      block
                      size="small"
                      onClick={() => handleLaunchApp(app.id)}
                      style={{
                        height: 36,
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 11,
                        background: app.badgeBg,
                        color: app.color,
                        borderColor: '#adc6ff',
                      }}
                    >
                      {app.name}
                    </Button>
                  </Col>
                ))}
              </Row>
            )}
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
                Tap image to expand & scan via GPay / PhonePe / Paytm / MobiKwik
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
