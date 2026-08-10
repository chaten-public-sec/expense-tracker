import React, { useState } from 'react';
import {
  Drawer,
  Modal,
  Button,
  Typography,
  Space,
  Tag,
  Image,
  Alert,
  Radio,
  Input,
  Upload,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CheckOutlined,
  CloseOutlined,
  UploadOutlined,
  UserOutlined,
  CalendarOutlined,
  BankOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Settlement } from '../../types';
import api from '../../services/api';

const { Title, Text } = Typography;

interface SettlementDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  onSettlementUpdated: () => void;
}

const REJECTION_REASONS = [
  'Payment not received in bank account',
  'Wrong amount transferred',
  'Screenshot is unclear / illegible',
  'Duplicate transaction proof',
  'Other',
];

export const SettlementDetailsDrawer: React.FC<SettlementDetailsDrawerProps> = ({
  isOpen,
  onClose,
  settlement,
  onSettlementUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  // Re-upload proof state
  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false);
  const [newProofUrl, setNewProofUrl] = useState<string | null>(null);
  const [newProofPublicId, setNewProofPublicId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!settlement) return null;

  const currentUserId = user?._id?.toString();
  const payerId = (settlement.payer?._id || settlement.payer)?.toString();
  const receiverId = (settlement.receiver?._id || settlement.receiver)?.toString();

  const isPayer = currentUserId === payerId;
  const isReceiver = currentUserId === receiverId;

  const payerName = isPayer ? 'You' : settlement.payer?.fullName || 'User';
  const receiverName = isReceiver ? 'You' : settlement.receiver?.fullName || 'User';

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      await api.post(`/settlements/${settlement._id}/approve`);
      showSuccess('Settlement approved and verified successfully!');
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Approve Error:', err);
      showError(err.response?.data?.message || 'Failed to approve settlement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      showError('Please provide a reason for rejection');
      return;
    }

    try {
      setIsLoading(true);
      await api.post(`/settlements/${settlement._id}/reject`, {
        rejectionReason: finalReason,
      });
      showSuccess('Payment proof rejected.');
      setIsRejectModalOpen(false);
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Reject Error:', err);
      showError(err.response?.data?.message || 'Failed to reject settlement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReuploadProof = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUploading(true);
      const res = await api.post('/auth/upload-qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewProofUrl(res.data.imageUrl);
      setNewProofPublicId(res.data.publicId);
      showSuccess('New screenshot attached!');
    } catch (err: any) {
      console.error('Proof Upload Error:', err);
      showError('Failed to upload screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitNewProof = async () => {
    if (!newProofUrl) {
      showError('Please upload a screenshot first');
      return;
    }

    try {
      setIsLoading(true);
      await api.post(`/settlements/${settlement._id}/reupload-proof`, {
        proofUrl: newProofUrl,
        proofPublicId: newProofPublicId,
      });
      showSuccess('Replacement payment proof submitted to receiver!');
      setIsReuploadModalOpen(false);
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Reupload Submit Error:', err);
      showError(err.response?.data?.message || 'Failed to submit replacement proof');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (settlement.status) {
      case 'completed':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 10px', borderRadius: 20 }}>
            Completed & Verified
          </Tag>
        );
      case 'paid_pending_approval':
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />} style={{ padding: '4px 10px', borderRadius: 20 }}>
            {settlement.paymentMethod === 'cash' ? 'Cash Received Pending Confirmation' : 'Proof Awaiting Review'}
          </Tag>
        );
      case 'rejected':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ padding: '4px 10px', borderRadius: 20 }}>
            Payment Rejected
          </Tag>
        );
      case 'will_pay_soon':
        return (
          <Tag color="processing" icon={<ClockCircleOutlined />} style={{ padding: '4px 10px', borderRadius: 20 }}>
            Will Pay Soon
          </Tag>
        );
      case 'cancelled':
        return (
          <Tag color="default" style={{ padding: '4px 10px', borderRadius: 20 }}>
            Cancelled
          </Tag>
        );
      default:
        return <Tag>{settlement.status}</Tag>;
    }
  };

  return (
    <>
      <Drawer
        open={isOpen}
        onClose={onClose}
        placement="bottom"
        height="85dvh"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Settlement Details</span>
            {getStatusBadge()}
          </div>
        }
        styles={{
          body: {
            padding: '16px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxWidth: 600,
            margin: '0 auto',
            width: '100%',
          },
        }}
      >
        {/* Amount & Method Card */}
        <div
          style={{
            padding: '18px 16px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: 16,
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
          }}
        >
          <Text style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>
            Settlement Amount
          </Text>
          <Title level={2} style={{ margin: '4px 0', color: '#ffffff', fontWeight: 800 }}>
            ₹{settlement.amount.toFixed(2)}
          </Title>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {settlement.paymentMethod === 'cash' ? (
              <Tag color="green" icon={<DollarOutlined />} style={{ borderRadius: 12 }}>
                Cash Payment
              </Tag>
            ) : (
              <Tag color="blue" icon={<ThunderboltOutlined />} style={{ borderRadius: 12 }}>
                Online UPI Payment
              </Tag>
            )}
          </div>
        </div>

        {/* Transaction Parties Grid */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Payer</Text>
            <Text strong style={{ fontSize: 14, color: '#0f172a' }}>{payerName}</Text>
          </div>

          <div style={{ color: '#94a3b8', fontSize: 16 }}>➔</div>

          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Receiver</Text>
            <Text strong style={{ fontSize: 14, color: '#2563eb' }}>{receiverName}</Text>
          </div>
        </div>

        {/* Rejection Reason Alert if rejected */}
        {settlement.status === 'rejected' && (
          <Alert
            type="error"
            showIcon
            message="Payment Proof Rejected by Receiver"
            description={settlement.rejectionReason || 'The receiver indicated that this payment was not verified.'}
            style={{ borderRadius: 10, fontSize: 12 }}
          />
        )}

        {/* Proof Section */}
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Payment Proof & Verification
          </Text>

          {settlement.proofUrl ? (
            <div
              style={{
                padding: 12,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                textAlign: 'center',
              }}
            >
              <Image
                src={settlement.proofUrl}
                alt="Payment Proof Screenshot"
                width="100%"
                height={200}
                style={{ objectFit: 'contain', borderRadius: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                Tap image for full-screen inspection
              </Text>
            </div>
          ) : settlement.paymentMethod === 'cash' ? (
            <Alert
              type="info"
              showIcon
              message="Cash Handover"
              description="This payment was marked as handed over in cash. No payment screenshot is expected."
              style={{ borderRadius: 10, fontSize: 12 }}
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message="No Proof Screenshot Attached"
              style={{ borderRadius: 10, fontSize: 12 }}
            />
          )}
        </div>

        {/* Note if present */}
        {settlement.note && (
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Note</Text>
            <Text style={{ fontSize: 13, color: '#334155' }}>{settlement.note}</Text>
          </div>
        )}

        {/* Timestamp Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12 }}>
          <span>Submitted: {new Date(settlement.paidAt || settlement.createdAt).toLocaleString('en-IN')}</span>
          {settlement.verifiedAt && (
            <span>Verified: {new Date(settlement.verifiedAt).toLocaleString('en-IN')}</span>
          )}
        </div>

        {/* Receiver Approval & Rejection Actions */}
        {isReceiver && settlement.status === 'paid_pending_approval' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button
              danger
              block
              size="large"
              icon={<CloseOutlined />}
              onClick={() => setIsRejectModalOpen(true)}
              style={{ borderRadius: 12, fontWeight: 600 }}
            >
              Reject
            </Button>
            <Button
              type="primary"
              block
              size="large"
              icon={<CheckOutlined />}
              loading={isLoading}
              onClick={handleApprove}
              style={{ borderRadius: 12, fontWeight: 700, backgroundColor: '#16a34a' }}
            >
              Approve Payment
            </Button>
          </div>
        )}

        {/* Payer Re-upload Action if Rejected */}
        {isPayer && settlement.status === 'rejected' && (
          <Button
            type="primary"
            block
            size="large"
            icon={<UploadOutlined />}
            onClick={() => setIsReuploadModalOpen(true)}
            style={{ borderRadius: 12, fontWeight: 700, backgroundColor: '#2563eb', marginTop: 8 }}
          >
            Upload Replacement Proof
          </Button>
        )}
      </Drawer>

      {/* Reject Payment Reason Modal */}
      <Modal
        open={isRejectModalOpen}
        onCancel={() => setIsRejectModalOpen(false)}
        title="Reject Payment"
        okText="Confirm Rejection"
        cancelText="Cancel"
        okButtonProps={{ danger: true, loading: isLoading }}
        onOk={handleRejectConfirm}
        centered
        width={420}
      >
        <p style={{ margin: '10px 0 14px', fontSize: 13, color: '#334155' }}>
          Why are you rejecting this payment?
        </p>

        <Radio.Group
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}
        >
          {REJECTION_REASONS.map((r) => (
            <Radio key={r} value={r} style={{ fontSize: 13 }}>
              {r}
            </Radio>
          ))}
        </Radio.Group>

        {selectedReason === 'Other' && (
          <Input.TextArea
            rows={2}
            placeholder="Specify reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        )}
      </Modal>

      {/* Re-upload Proof Modal */}
      <Modal
        open={isReuploadModalOpen}
        onCancel={() => setIsReuploadModalOpen(false)}
        title="Upload Replacement Payment Proof"
        okText="Submit for Review"
        cancelText="Cancel"
        okButtonProps={{ loading: isLoading, disabled: !newProofUrl }}
        onOk={handleSubmitNewProof}
        centered
        width={420}
      >
        <Alert
          message="Re-submitting Proof"
          description={`Upload a clear screenshot of your ₹${settlement.amount.toFixed(2)} transfer so ${receiverName} can verify.`}
          type="info"
          showIcon
          style={{ margin: '12px 0', fontSize: 12, borderRadius: 8 }}
        />

        {newProofUrl ? (
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <Image src={newProofUrl} height={140} style={{ objectFit: 'contain', borderRadius: 8 }} />
            <Button size="small" danger onClick={() => setNewProofUrl(null)} style={{ display: 'block', margin: '8px auto 0' }}>
              Remove
            </Button>
          </div>
        ) : (
          <Upload
            beforeUpload={(file) => {
              handleReuploadProof(file);
              return false;
            }}
            showUploadList={false}
            accept="image/*"
          >
            <Button
              block
              icon={<UploadOutlined />}
              loading={isUploading}
              style={{ height: 44, borderRadius: 10, marginBottom: 14 }}
            >
              {isUploading ? 'Uploading Screenshot...' : 'Select Payment Screenshot'}
            </Button>
          </Upload>
        )}
      </Modal>
    </>
  );
};
