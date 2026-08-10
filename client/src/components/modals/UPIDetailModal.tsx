import React, { useState } from 'react';
import { Modal, Typography, Button, Space, Avatar, Image, Tag, Flex, Alert } from 'antd';
import {
  QrcodeOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
  DollarOutlined,
  CreditCardOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { User } from '../../types';
import { downloadWatermarkedQR } from '../../utils/qrDownloader';

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
  const [isDownloading, setIsDownloading] = useState(false);

  if (!user) return null;

  const copyUPI = () => {
    if (user.upiId) {
      navigator.clipboard.writeText(user.upiId);
      setCopied(true);
      showSuccess(`UPI ID ${user.upiId} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = async () => {
    if (!user.qrCodeUrl) {
      showError('No QR code image available to download');
      return;
    }

    try {
      setIsDownloading(true);
      await downloadWatermarkedQR({
        qrImageUrl: user.qrCodeUrl,
        ownerName: user.fullName,
        upiId: user.upiId,
        amount: amountToPay,
      });
      showSuccess('QR Code downloaded with owner footer!');
    } catch (err: any) {
      console.error('Download QR Error:', err);
      showError('Failed to download QR image');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <QrcodeOutlined style={{ color: '#2563eb', fontSize: 18 }} />
          <span>{user.fullName}’s Payment QR</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        user.qrCodeUrl && (
          <Button
            key="download"
            icon={<DownloadOutlined />}
            loading={isDownloading}
            onClick={handleDownloadQR}
          >
            Download QR
          </Button>
        ),
        onPayClick && amountToPay && amountToPay > 0 && (
          <Button
            key="pay"
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => {
              onClose();
              onPayClick(user, amountToPay);
            }}
            style={{ backgroundColor: '#2563eb' }}
          >
            Pay ₹{amountToPay.toFixed(2)}
          </Button>
        ),
      ]}
      width={440}
      centered
      style={{ maxWidth: '96vw' }}
    >
      <Flex vertical align="center" gap={14} style={{ padding: '6px 0' }}>
        {/* User Info Header */}
        <Flex vertical align="center" gap={2}>
          <Avatar
            size={50}
            style={{ backgroundColor: '#0f172a', fontSize: 18, fontWeight: 700 }}
            icon={<UserOutlined />}
          >
            {user.fullName?.charAt(0).toUpperCase()}
          </Avatar>
          <Title level={4} style={{ margin: '4px 0 0', fontSize: 15 }}>
            {user.fullName}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {user.email}
          </Text>
        </Flex>

        {/* Amount to Pay Pill */}
        {amountToPay !== undefined && amountToPay > 0 && (
          <div
            style={{
              padding: '6px 16px',
              backgroundColor: '#eff6ff',
              borderRadius: 20,
              border: '1px solid #bfdbfe',
              textAlign: 'center',
            }}
          >
            <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
              Amount: ₹{amountToPay.toFixed(2)}
            </Text>
          </div>
        )}

        {/* Amount > 2000 Notice regarding Google Pay QR gallery scanning limits */}
        {amountToPay !== undefined && amountToPay > 2000 && (
          <Alert
            type="info"
            showIcon
            message="Large Payment Notice"
            description="Payments above ₹2,000 are most reliable via Pay Online due to bank gallery scan limits."
            style={{ fontSize: 11, borderRadius: 8, width: '100%' }}
          />
        )}

        {/* QR Code Display Card */}
        <div style={{ width: '100%', textAlign: 'center' }}>
          {user.qrCodeUrl ? (
            <div
              style={{
                padding: 14,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                display: 'inline-block',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Image
                src={user.qrCodeUrl}
                alt={`${user.fullName} Payment QR Code`}
                width={190}
                height={190}
                style={{ objectFit: 'contain', borderRadius: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                Tap to expand or download to scan with any UPI app
              </Text>
            </div>
          ) : (
            <div
              style={{
                padding: '24px 16px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 12,
                width: '100%',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                No QR code uploaded by {user.fullName}. Use UPI ID below.
              </Text>
            </div>
          )}
        </div>

        {/* UPI ID Box */}
        <div style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
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
                borderRadius: 10,
              }}
            >
              <Space size={6}>
                <CreditCardOutlined style={{ color: '#2563eb' }} />
                <Text code strong style={{ fontSize: 13 }}>
                  {user.upiId}
                </Text>
              </Space>
              <Button
                size="small"
                icon={copied ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CopyOutlined />}
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
      </Flex>
    </Modal>
  );
};
