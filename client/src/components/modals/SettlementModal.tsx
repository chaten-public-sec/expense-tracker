import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Typography,
  Alert,
  Space,
  Tag,
  Card,
  Image,
  Upload,
  Divider,
  Segmented,
} from 'antd';
import {
  CheckCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  UploadOutlined,
  QrcodeOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  SendOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { Settlement, OwedPerson } from '../../types';
import api from '../../services/api';

const { Title, Text } = Typography;

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPerson?: OwedPerson | null;
  pendingSettlement?: Settlement | null;
  onSettlementUpdated: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  targetPerson,
  pendingSettlement,
  onSettlementUpdated,
}) => {
  const { showSuccess, showError } = useToast();

  const [paymentMode, setPaymentMode] = useState<'paid' | 'will_pay_soon'>('paid');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPublicId, setProofPublicId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentMode('paid');
      setProofUrl(null);
      setProofPublicId(null);
      setNote('');
      setCopiedUpi(false);
    }
  }, [isOpen, targetPerson]);

  const recipient = targetPerson?.user;
  const amountToPay = targetPerson?.amount || 0;

  const copyUPI = () => {
    if (recipient?.upiId) {
      navigator.clipboard.writeText(recipient.upiId);
      setCopiedUpi(true);
      showSuccess(`UPI ID ${recipient.upiId} copied!`);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleProofUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUploading(true);
      const res = await api.post('/auth/upload-qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProofUrl(res.data.imageUrl);
      setProofPublicId(res.data.publicId);
      showSuccess('Payment proof screenshot uploaded!');
    } catch (err: any) {
      console.error('Proof Upload Error:', err);
      showError('Failed to upload proof screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!recipient) return;

    try {
      setIsSubmitting(true);
      await api.post('/settlements', {
        receiverId: recipient._id,
        amount: amountToPay,
        actionType: paymentMode,
        proofUrl,
        proofPublicId,
        note,
      });

      if (paymentMode === 'paid') {
        showSuccess(`Payment of ₹${amountToPay.toFixed(2)} submitted to ${recipient.fullName}!`);
      } else {
        showSuccess(`Notified ${recipient.fullName} that you will pay soon.`);
      }

      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Submit Settlement Error:', err);
      showError(err.response?.data?.message || 'Failed to submit settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!recipient) return null;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <DollarOutlined style={{ color: '#1677ff' }} />
          <span>Settle Payment with {recipient.fullName}</span>
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isSubmitting}
          icon={paymentMode === 'paid' ? <CheckCircleOutlined /> : <SendOutlined />}
          onClick={handleSubmit}
        >
          {paymentMode === 'paid' ? 'Confirm Payment' : 'Send Promise Notice'}
        </Button>,
      ]}
      width={480}
      centered
    >
      <div style={{ padding: '8px 0' }}>
        {/* Amount Card */}
        <Card size="small" style={{ background: '#f8fafc', borderRadius: 10, textAlign: 'center', marginBottom: 14 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Total Amount Due
          </Text>
          <Title level={3} style={{ margin: '2px 0 0', color: '#1677ff' }}>
            ₹{amountToPay.toFixed(2)}
          </Title>
        </Card>

        {/* QR Code & UPI Details FIRST */}
        <Card
          size="small"
          title={
            <Space size={6}>
              <QrcodeOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 12 }}>1. Pay via Recipient UPI / QR Code</Text>
            </Space>
          }
          style={{ borderRadius: 10, marginBottom: 14, background: '#fafafa' }}
          styles={{ body: { padding: 12, textAlign: 'center' } }}
        >
          {recipient.qrCodeUrl ? (
            <div style={{ marginBottom: 10 }}>
              <Image
                src={recipient.qrCodeUrl}
                alt="Recipient Payment QR Code"
                width={150}
                height={150}
                style={{ objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                Scan with GPay, PhonePe, Paytm, or BHIM
              </Text>
            </div>
          ) : (
            <Alert
              message="No QR Code Uploaded"
              description="Recipient has not uploaded a QR code yet. Pay using their UPI ID below."
              type="info"
              showIcon
              style={{ borderRadius: 8, marginBottom: 10, fontSize: 12 }}
            />
          )}

          {recipient.upiId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <Space size={8}>
                <CreditCardOutlined style={{ color: '#1677ff' }} />
                <Text code style={{ fontSize: 13, fontWeight: 600 }}>
                  {recipient.upiId}
                </Text>
              </Space>
              <Button
                size="small"
                icon={copiedUpi ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                onClick={copyUPI}
              >
                {copiedUpi ? 'Copied' : 'Copy UPI'}
              </Button>
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Phone: {recipient.phone || recipient.email}
            </Text>
          )}
        </Card>

        {/* Action Toggle: Paid vs Will Pay Soon */}
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            2. Select Payment Status
          </Text>
          <Segmented
            block
            value={paymentMode}
            onChange={(val) => setPaymentMode(val as 'paid' | 'will_pay_soon')}
            options={[
              { label: 'I Have Paid', value: 'paid', icon: <CheckCircleOutlined /> },
              { label: 'Will Pay Soon', value: 'will_pay_soon', icon: <ClockCircleOutlined /> },
            ]}
          />
        </div>

        {paymentMode === 'paid' ? (
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              3. Upload Payment Proof Screenshot (Optional)
            </Text>
            {proofUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6ffed', padding: 8, borderRadius: 8, border: '1px solid #b7eb8f', marginBottom: 10 }}>
                <Image src={proofUrl} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 6 }} />
                <div style={{ flex: 1 }}>
                  <Text type="success" strong style={{ fontSize: 12, display: 'block' }}>Proof Attached!</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>Saved on Cloudinary</Text>
                </div>
                <Button size="small" danger onClick={() => { setProofUrl(null); setProofPublicId(null); }}>
                  Remove
                </Button>
              </div>
            ) : (
              <Upload
                beforeUpload={(file) => {
                  handleProofUpload(file);
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} loading={isUploading} style={{ width: '100%', borderRadius: 8, marginBottom: 10 }}>
                  {isUploading ? 'Uploading Screenshot...' : 'Upload Payment Screenshot'}
                </Button>
              </Upload>
            )}

            <Input.TextArea
              rows={2}
              placeholder="Add optional note (e.g. Paid via GPay Ref #12345)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </div>
        ) : (
          <Alert
            message="Promise Notice"
            description={`We will notify ${recipient.fullName} that you plan to pay soon.`}
            type="warning"
            showIcon
            style={{ borderRadius: 8 }}
          />
        )}
      </div>
    </Modal>
  );
};
