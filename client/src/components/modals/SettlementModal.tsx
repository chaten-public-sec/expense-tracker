import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  InputNumber,
  Typography,
  Alert,
  Space,
  Card,
  Image,
  Upload,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  CheckCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  UploadOutlined,
  QrcodeOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  BankOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { Settlement, OwedPerson, User } from '../../types';
import api from '../../services/api';
import { launchUpiPayment } from '../../utils/upiHelper';
import { UPIDetailModal } from './UPIDetailModal';

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

  const recipient = targetPerson?.user;
  const initialOwedAmount = targetPerson?.amount || 0;

  const [amount, setAmount] = useState<number>(initialOwedAmount);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPublicId, setProofPublicId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Online Flow: 'initial' | 'proof_step'
  const [onlineStep, setOnlineStep] = useState<'initial' | 'proof_step'>('initial');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCashConfirmOpen, setIsCashConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(initialOwedAmount);
      setProofUrl(null);
      setProofPublicId(null);
      setNote('');
      setCopiedUpi(false);
      setOnlineStep('initial');
    }
  }, [isOpen, targetPerson, initialOwedAmount]);

  if (!recipient) return null;

  const copyUPI = () => {
    if (recipient.upiId) {
      navigator.clipboard.writeText(recipient.upiId);
      setCopiedUpi(true);
      showSuccess(`UPI ID ${recipient.upiId} copied to clipboard!`);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // 1. Handle "Pay Online"
  const handlePayOnline = async () => {
    if (!recipient.upiId) {
      showError(`${recipient.fullName} has not added a UPI ID yet. Please use QR Code or Cash.`);
      setIsQRModalOpen(true);
      return;
    }

    const payAmount = Number(amount) || initialOwedAmount;
    if (payAmount <= 0) {
      showError('Please enter a valid amount to pay');
      return;
    }

    try {
      const result = await launchUpiPayment(
        {
          upiId: recipient.upiId,
          name: recipient.fullName,
          amount: payAmount,
          note: `SplitWise - Payment to ${recipient.fullName}`,
        },
        () => {
          // Desktop Fallback
          showSuccess('UPI intent opened. If on desktop, scan the QR code below.');
          setIsQRModalOpen(true);
        }
      );

      // Move directly to the proof upload verification screen
      setOnlineStep('proof_step');
    } catch (err: any) {
      console.error('[Launch UPI Error]:', err);
      showError('Could not launch payment app. Please scan the QR code.');
      setIsQRModalOpen(true);
    }
  };

  // 2. Handle Payment Screenshot Upload
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
      showSuccess('Payment proof screenshot attached!');
    } catch (err: any) {
      console.error('Proof Upload Error:', err);
      showError('Failed to upload proof screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Submit Online UPI Settlement (Mandates Screenshot)
  const handleSubmitOnlineSettlement = async () => {
    if (!proofUrl) {
      showError('Payment proof screenshot is required for online UPI payments.');
      return;
    }

    const finalAmount = Number(amount) || initialOwedAmount;

    try {
      setIsSubmitting(true);
      await api.post('/settlements', {
        receiverId: recipient._id,
        amount: finalAmount,
        paymentMethod: 'upi',
        proofUrl,
        proofPublicId,
        note,
      });

      showSuccess(`Payment of ₹${finalAmount.toFixed(2)} submitted for ${recipient.fullName}'s verification!`);
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Submit Settlement Error:', err);
      showError(err.response?.data?.message || 'Failed to submit settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Submit Cash Settlement (No screenshot required, receiver confirms)
  const handleConfirmCashPayment = async () => {
    const finalAmount = Number(amount) || initialOwedAmount;

    try {
      setIsSubmitting(true);
      await api.post('/settlements', {
        receiverId: recipient._id,
        amount: finalAmount,
        paymentMethod: 'cash',
        note: note || 'Paid in Cash',
      });

      showSuccess(`Marked ₹${finalAmount.toFixed(2)} as paid in cash. ${recipient.fullName} will confirm receipt.`);
      setIsCashConfirmOpen(false);
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Cash Settlement Error:', err);
      showError(err.response?.data?.message || 'Failed to submit cash settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit "Will Pay Soon" Promise
  const handleSendPromiseNotice = async () => {
    const finalAmount = Number(amount) || initialOwedAmount;
    try {
      setIsSubmitting(true);
      await api.post('/settlements', {
        receiverId: recipient._id,
        amount: finalAmount,
        actionType: 'will_pay_soon',
        note,
      });

      showSuccess(`Notified ${recipient.fullName} that you will pay soon.`);
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Promise Notice Error:', err);
      showError(err.response?.data?.message || 'Failed to send promise notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={onClose}
        title={
          <Space align="center">
            <DollarOutlined style={{ color: '#2563eb' }} />
            <span>Pay {recipient.fullName}</span>
          </Space>
        }
        footer={null}
        width={460}
        centered
        style={{ maxWidth: '96vw' }}
      >
        <div style={{ padding: '6px 0' }}>
          {/* Header Card: Recipient Dues & Amount Input */}
          <Card
            size="small"
            style={{
              background: '#f8fafc',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
              textAlign: 'center',
            }}
            styles={{ body: { padding: '16px 14px' } }}
          >
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Amount to Settle
            </Text>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0 10px' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginRight: 4 }}>₹</span>
              <InputNumber
                value={amount}
                onChange={(val) => setAmount(val || 0)}
                min={0.01}
                precision={2}
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  width: 140,
                  textAlign: 'center',
                  borderRadius: 10,
                }}
              />
            </div>

            {amount !== initialOwedAmount && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                Paying ₹{amount?.toFixed(2)} of ₹{initialOwedAmount.toFixed(2)} owed
              </Text>
            )}

            {/* Recipient UPI ID */}
            {recipient.upiId ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid #e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  UPI: {recipient.upiId}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={copiedUpi ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CopyOutlined />}
                  onClick={copyUPI}
                  style={{ padding: '0 4px', height: 20, fontSize: 11 }}
                />
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>
                No UPI ID configured by {recipient.fullName}
              </Text>
            )}
          </Card>

          {/* Online Proof Step View */}
          {onlineStep === 'proof_step' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setOnlineStep('initial')}
                >
                  Back
                </Button>
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                  Did you complete the payment?
                </Text>
              </div>

              <Alert
                message="Payment Proof Required"
                description="Upload the payment confirmation screenshot so the receiver can verify your payment."
                type="info"
                showIcon
                style={{ borderRadius: 10, marginBottom: 14, fontSize: 12 }}
              />

              {/* Upload Proof Area */}
              {proofUrl ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: '#f0fdf4',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid #bbf7d0',
                    marginBottom: 14,
                  }}
                >
                  <Image
                    src={proofUrl}
                    width={52}
                    height={52}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text type="success" strong style={{ fontSize: 12, display: 'block' }}>
                      Screenshot Attached!
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Ready to send for verification
                    </Text>
                  </div>
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      setProofUrl(null);
                      setProofPublicId(null);
                    }}
                  >
                    Change
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
                  <Button
                    block
                    icon={<UploadOutlined />}
                    loading={isUploading}
                    style={{
                      height: 48,
                      borderRadius: 10,
                      marginBottom: 14,
                      borderColor: '#2563eb',
                      color: '#2563eb',
                      fontWeight: 600,
                    }}
                  >
                    {isUploading ? 'Uploading Screenshot...' : 'Upload Payment Screenshot'}
                  </Button>
                </Upload>
              )}

              <Input.TextArea
                rows={2}
                placeholder="Add optional note (e.g. UTR / Ref Number)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ borderRadius: 10, marginBottom: 16 }}
              />

              <Button
                type="primary"
                block
                size="large"
                loading={isSubmitting}
                disabled={!proofUrl}
                icon={<CheckCircleOutlined />}
                onClick={handleSubmitOnlineSettlement}
                style={{
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: proofUrl ? '#2563eb' : undefined,
                  fontWeight: 600,
                }}
              >
                Send for Verification
              </Button>
            </div>
          ) : (
            /* Primary Payment Screen View (Two Primary Actions) */
            <div>
              <Text strong style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>
                Choose Payment Method
              </Text>

              {/* 1. Primary Action: Pay Online */}
              <Button
                type="primary"
                block
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handlePayOnline}
                style={{
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: '#2563eb',
                  fontWeight: 700,
                  fontSize: 15,
                  marginBottom: 10,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                }}
              >
                Pay Online
              </Button>

              {/* 2. Secondary Action: Pay with Cash */}
              <Button
                block
                size="large"
                icon={<DollarOutlined style={{ color: '#16a34a' }} />}
                onClick={() => setIsCashConfirmOpen(true)}
                style={{
                  height: 46,
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  borderColor: '#e2e8f0',
                  color: '#0f172a',
                  marginBottom: 16,
                }}
              >
                Pay with Cash
              </Button>

              {/* Fallback Options: Show QR / Copy UPI */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginBottom: 14,
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<QrcodeOutlined style={{ color: '#2563eb' }} />}
                  onClick={() => setIsQRModalOpen(true)}
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  Show QR Code
                </Button>

                <Divider type="vertical" />

                <Button
                  type="text"
                  size="small"
                  icon={<ClockCircleOutlined style={{ color: '#64748b' }} />}
                  onClick={handleSendPromiseNotice}
                  style={{ fontSize: 12, color: '#64748b' }}
                >
                  I'll Pay Later
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Cash Payment Confirmation Dialog */}
      <Modal
        open={isCashConfirmOpen}
        onCancel={() => setIsCashConfirmOpen(false)}
        title="Confirm Cash Payment"
        okText="Mark as Paid in Cash"
        cancelText="Cancel"
        confirmLoading={isSubmitting}
        onOk={handleConfirmCashPayment}
        centered
        width={400}
      >
        <p style={{ margin: '10px 0', fontSize: 13, color: '#334155' }}>
          Mark <strong>₹{amount?.toFixed(2)}</strong> as paid in cash to <strong>{recipient.fullName}</strong>?
        </p>
        <Alert
          type="info"
          showIcon
          message="No payment screenshot is required for cash payments. We will notify the receiver to confirm receipt."
          style={{ fontSize: 12, borderRadius: 8 }}
        />
      </Modal>

      {/* QR Viewer Fallback Modal */}
      <UPIDetailModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        user={recipient}
        amountToPay={amount}
      />
    </>
  );
};
