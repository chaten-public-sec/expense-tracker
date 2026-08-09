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
  Row,
  Col,
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
  ThunderboltOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { Settlement, OwedPerson } from '../../types';
import api from '../../services/api';
import { launchAppSpecificUPI, UPI_APPS, UPIAppType } from '../../utils/upiHelper';

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
  const [copiedAmount, setCopiedAmount] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentMode('paid');
      setProofUrl(null);
      setProofPublicId(null);
      setNote('');
      setCopiedUpi(false);
      setCopiedAmount(false);
    }
  }, [isOpen, targetPerson]);

  const recipient = targetPerson?.user;
  const amountToPay = targetPerson?.amount || 0;

  const handleLaunchApp = (appId: UPIAppType) => {
    if (!recipient?.upiId) {
      showError('Recipient has not configured their UPI ID');
      return;
    }

    launchAppSpecificUPI(
      appId,
      {
        upiId: recipient.upiId,
        name: recipient.fullName,
        amount: amountToPay,
        note: `SplitWise Payment to ${recipient.fullName}`,
      },
      () => {
        showSuccess('Opening payment app... Or scan QR / copy UPI ID below.');
      }
    );
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(amountToPay.toFixed(2));
    setCopiedAmount(true);
    showSuccess(`Amount ₹${amountToPay.toFixed(2)} copied to clipboard!`);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

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
      width={500}
      centered
      style={{ maxWidth: '96vw' }}
    >
      <div style={{ padding: '4px 0' }}>
        {/* Amount & Quick Copy Header Card */}
        <Card
          size="small"
          style={{
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            color: '#ffffff',
            borderRadius: 14,
            textAlign: 'center',
            marginBottom: 14,
            boxShadow: '0 4px 14px rgba(22, 119, 255, 0.25)',
          }}
          styles={{ body: { padding: '14px 12px' } }}
        >
          <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.85)', display: 'block' }}>
            Calculated Dues to Pay
          </Text>
          <Title level={2} style={{ margin: '2px 0 8px', color: '#ffffff', fontWeight: 800 }}>
            ₹{amountToPay.toFixed(2)}
          </Title>

          <Button
            size="small"
            onClick={copyAmount}
            icon={copiedAmount ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
            style={{
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderColor: 'transparent',
              backdropFilter: 'blur(4px)',
            }}
          >
            {copiedAmount ? 'Copied ₹' + amountToPay.toFixed(2) : '1-Tap Copy Amount (₹' + amountToPay.toFixed(2) + ')'}
          </Button>
        </Card>

        {/* 1. App-Specific UPI Launcher Grid (Google Pay, PhonePe, Paytm, MobiKwik, BHIM, Cred) */}
        {recipient.upiId ? (
          <Card
            size="small"
            title={
              <Space size={6}>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                <Text strong style={{ fontSize: 12 }}>1. Select Installed App to Pay</Text>
              </Space>
            }
            style={{ borderRadius: 12, marginBottom: 14, background: '#fafafa' }}
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Row gutter={[8, 8]}>
              {UPI_APPS.map((app) => (
                <Col span={12} sm={8} key={app.id}>
                  <Button
                    block
                    onClick={() => handleLaunchApp(app.id)}
                    style={{
                      height: 42,
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: '#e2e8f0',
                      background: app.badgeBg,
                      color: app.color,
                    }}
                  >
                    {app.name}
                  </Button>
                </Col>
              ))}
            </Row>
            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 8, textAlign: 'center' }}>
              💡 Opens recipient VPA directly in your app without NPCI ₹2K blocks or WhatsApp redirects.
            </Text>
          </Card>
        ) : (
          <Alert
            message="No UPI ID Found"
            description="Recipient has not configured their UPI ID yet. Use QR Code scan or Phone number below."
            type="warning"
            showIcon
            style={{ borderRadius: 10, marginBottom: 14, fontSize: 12 }}
          />
        )}

        {/* 2. QR Code & UPI Details (Scan or Manual Copy) */}
        <Card
          size="small"
          title={
            <Space size={6}>
              <QrcodeOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 12 }}>2. Scan QR Code or Copy UPI VPA</Text>
            </Space>
          }
          style={{ borderRadius: 12, marginBottom: 14, background: '#ffffff' }}
          styles={{ body: { padding: 12, textAlign: 'center' } }}
        >
          {recipient.qrCodeUrl ? (
            <div style={{ marginBottom: 10 }}>
              <Image
                src={recipient.qrCodeUrl}
                alt="Recipient Payment QR Code"
                width={160}
                height={160}
                style={{ objectFit: 'contain', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                Scan image directly with GPay, PhonePe, Paytm, or MobiKwik
              </Text>
            </div>
          ) : (
            <Alert
              message="No QR Code Image Uploaded"
              description="Recipient has not uploaded a QR screenshot. Use UPI ID below."
              type="info"
              showIcon
              style={{ borderRadius: 8, marginBottom: 10, fontSize: 12 }}
            />
          )}

          {recipient.upiId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
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

        {/* 3. Action Toggle: Paid vs Will Pay Soon */}
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            3. Select Payment Status
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
              4. Upload Payment Proof Screenshot (Optional)
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
              placeholder="Add optional note (e.g. Paid via MobiKwik Ref #12345)..."
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
