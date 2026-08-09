import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Typography,
  Alert,
  Space,
  Tag,
} from 'antd';
import {
  SafetyCertificateOutlined,
  CopyOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  KeyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { Settlement, OwedPerson } from '../../types';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;

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
  const { showToast } = useToast();

  // Initiator (Payer) state
  const [confirmStep, setConfirmStep] = useState(true);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Receiver OTP entry state
  const [otpInput, setOtpInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Timer countdown for active OTP
  useEffect(() => {
    let interval: any = null;
    if (expiresAt) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [expiresAt]);

  useEffect(() => {
    if (isOpen) {
      setConfirmStep(true);
      setGeneratedOtp(null);
      setExpiresAt(null);
      setOtpInput('');
      setError('');
      setCopiedOtp(false);
    }
  }, [isOpen, targetPerson, pendingSettlement]);

  // Handle Payer initiating payment
  const handleInitiatePayment = async () => {
    if (!targetPerson) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await api.post('/settlements', {
        receiverId: targetPerson.user._id,
        amount: targetPerson.amount,
      });

      setGeneratedOtp(res.data.otp);
      setExpiresAt(res.data.expiresAt);
      setConfirmStep(false);
      showToast('Payment initiated! Share the 6-digit OTP with receiver to verify.', 'info');
      onSettlementUpdated();
    } catch (err: any) {
      console.error('Initiate Payment Error:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment settlement');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Receiver verifying OTP
  const handleVerifyOtp = async () => {
    if (!pendingSettlement) return;

    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter the full 6-digit OTP code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await api.post(`/settlements/${pendingSettlement._id}/verify`, {
        otp: otpInput.trim(),
      });

      showToast(`Settlement of ₹${pendingSettlement.amount} verified successfully!`, 'success');
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      setError(err.response?.data?.message || 'Invalid or expired OTP. Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyOtpToClipboard = () => {
    if (generatedOtp) {
      navigator.clipboard.writeText(generatedOtp);
      setCopiedOtp(true);
      showToast('OTP copied to clipboard!', 'success');
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const isReceiverMode = !!pendingSettlement;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span>{isReceiverMode ? 'Verify Received Payment' : 'Settle Payment Dues'}</span>
        </Space>
      }
      footer={null}
      width={460}
    >
      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* MODE 1: RECEIVER ENTERING OTP */}
      {isReceiverMode ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div
            style={{
              padding: 16,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              Incoming Payment From
            </Text>
            <Title level={4} style={{ margin: '4px 0' }}>
              {pendingSettlement.payer?.fullName}
            </Title>
            <Text strong style={{ fontSize: 22, color: '#1677ff' }}>
              ₹{pendingSettlement.amount.toFixed(2)}
            </Text>
          </div>

          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
            Ask <strong>{pendingSettlement.payer?.fullName}</strong> for the 6-digit OTP generated on their device:
          </Paragraph>

          <Input
            placeholder="• • • • • •"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            size="large"
            style={{
              textAlign: 'center',
              letterSpacing: 12,
              fontFamily: 'monospace',
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 20,
              height: 52,
            }}
          />

          <Button
            type="primary"
            size="large"
            block
            onClick={handleVerifyOtp}
            loading={isLoading}
            disabled={otpInput.length !== 6}
            icon={<CheckCircleOutlined />}
          >
            Verify & Confirm Receipt
          </Button>
        </div>
      ) : (
        /* MODE 2: PAYER INITIATING PAYMENT */
        <div>
          {confirmStep ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div
                style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginBottom: 16,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  You are paying to
                </Text>
                <Title level={4} style={{ margin: '4px 0' }}>
                  {targetPerson?.user?.fullName}
                </Title>
                <Text strong style={{ fontSize: 24, color: '#ef4444' }}>
                  ₹{targetPerson?.amount?.toFixed(2)}
                </Text>
              </div>

              <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
                Clicking confirm will generate a one-time 6-digit verification code to share with {targetPerson?.user?.fullName}.
              </Paragraph>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button block onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  block
                  onClick={handleInitiatePayment}
                  loading={isLoading}
                  icon={<KeyOutlined />}
                >
                  Generate Payment OTP
                </Button>
              </div>
            </div>
          ) : (
            /* OTP GENERATED VIEW */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Alert
                title="Show this OTP to recipient to complete settlement"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <div
                style={{
                  padding: 20,
                  background: '#fafafa',
                  borderRadius: 12,
                  border: '2px dashed #1677ff',
                  marginBottom: 16,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  One-Time Verification PIN
                </Text>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    letterSpacing: 10,
                    fontFamily: 'monospace',
                    color: '#1677ff',
                    fontWeight: 800,
                  }}
                >
                  {generatedOtp}
                </Title>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                <Button
                  icon={copiedOtp ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                  onClick={copyOtpToClipboard}
                >
                  {copiedOtp ? 'Copied' : 'Copy Code'}
                </Button>
                <Tag icon={<ClockCircleOutlined />} color={timeLeft < 60 ? 'error' : 'processing'}>
                  Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </Tag>
              </div>

              <Button type="primary" block onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
