import React, { useState } from 'react';
import {
  Modal,
  Button,
  Tag,
  Avatar,
  Space,
  Typography,
  Popconfirm,
  Image,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UserOutlined,
  InfoCircleOutlined,
  DollarCircleOutlined,
  MobileOutlined,
  LockOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Expense } from '../../types';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onEdit: (expense: Expense) => void;
  onExpenseDeleted: () => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  onEdit,
  onExpenseDeleted,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!expense) return null;

  const payerId = typeof expense.paidBy === 'string' ? expense.paidBy : expense.paidBy?._id;
  const isCreatorOrSuperAdmin = user && (user._id === payerId || user.isSuperAdmin || user.email === 'admin@gmail.com');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/expenses/${expense._id}`);
      showToast(`Expense "${expense.title}" deleted`, 'info');
      onExpenseDeleted();
      onClose();
    } catch (err: any) {
      console.error('Delete Expense Error:', err);
      showToast(err.response?.data?.message || 'Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center" size={8}>
          <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>Expense Details</span>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
          {isCreatorOrSuperAdmin ? (
            <Popconfirm
              title="Delete Expense"
              description="Are you sure you want to delete this expense record?"
              onConfirm={handleDelete}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: isDeleting }}
            >
              <Button danger icon={<DeleteOutlined />} size="middle">
                Delete
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title="Only the person who created this expense can delete it">
              <Button danger disabled icon={<LockOutlined />} size="middle">
                Delete
              </Button>
            </Tooltip>
          )}

          <Space size={8}>
            <Button onClick={onClose} size="middle">Close</Button>
            {isCreatorOrSuperAdmin ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                size="middle"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
              >
                Edit
              </Button>
            ) : (
              <Tooltip title="Only the person who created this expense can edit it">
                <Button type="primary" disabled icon={<LockOutlined />} size="middle">
                  Edit
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      }
      width={520}
      centered
      style={{ maxWidth: 'calc(100vw - 16px)', margin: '8px auto' }}
      styles={{
        body: {
          maxHeight: 'calc(85dvh - 70px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 2px',
        },
      }}
    >
      <div style={{ padding: '2px 0' }}>
        {/* Header Title & Amount */}
        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Expense Title
            </Text>
            <Title level={4} style={{ margin: 0, wordBreak: 'break-word', fontSize: 16 }}>
              {expense.title}
            </Title>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Amount Paid
            </Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff', display: 'block' }}>
              ₹{expense.amount.toFixed(2)}
            </Text>
          </div>
        </div>

        {/* Metadata Grid (Responsive 2-column) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Paid By
            </Text>
            <Space align="center" size={6}>
              <Avatar size="small" style={{ backgroundColor: '#1677ff', fontSize: 11 }} icon={<UserOutlined />}>
                {typeof expense.paidBy === 'object' ? expense.paidBy?.fullName?.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Text strong style={{ fontSize: 13, wordBreak: 'break-word' }}>
                {typeof expense.paidBy === 'object' ? expense.paidBy?.fullName : 'User'}
              </Text>
            </Space>
          </div>

          <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Payment Mode
            </Text>
            <Tag
              color={expense.paymentMode === 'upi' ? 'blue' : 'green'}
              icon={expense.paymentMode === 'upi' ? <MobileOutlined /> : <DollarCircleOutlined />}
              style={{ margin: 0, fontWeight: 500 }}
            >
              {expense.paymentMode === 'upi' ? 'UPI / Online' : 'Cash'}
            </Tag>
          </div>

          <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Expense Date
            </Text>
            <Space size={4}>
              <CalendarOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 12 }}>{formatDate(expense.date || expense.createdAt || '')}</Text>
            </Space>
          </div>

          <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Added On
            </Text>
            <Space size={4}>
              <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {expense.createdAt ? formatDateTime(expense.createdAt) : formatDate(expense.date || '')}
              </Text>
            </Space>
          </div>
        </div>

        {/* Split Details Breakdown */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>
              Split Breakdown ({expense.splitDetails?.length || 0} participants)
            </Text>
            <Tag color={expense.splitType === 'everyone' ? 'cyan' : 'purple'}>
              {expense.splitType === 'everyone' ? 'Equal Split' : 'Custom Split'}
            </Tag>
          </div>

          <div style={{ borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            {expense.splitDetails?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: idx % 2 === 0 ? '#fafafa' : '#ffffff',
                  borderBottom: idx !== (expense.splitDetails.length - 1) ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <Space align="center" size={8}>
                  <Avatar size="small" style={{ backgroundColor: '#0f172a', fontSize: 11 }} icon={<UserOutlined />}>
                    {item.user?.fullName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text style={{ fontSize: 13 }}>{item.user?.fullName}</Text>
                </Space>
                <Text strong style={{ fontSize: 13 }}>
                  ₹{item.share?.toFixed(2)}
                </Text>
              </div>
            ))}
          </div>
        </div>

        {/* Attached Screenshot */}
        {expense.screenshotUrl && (
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Bill / Receipt Image
            </Text>
            <div style={{ background: '#fafafa', padding: 8, borderRadius: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
              <Image
                src={expense.screenshotUrl}
                alt="Receipt"
                style={{ maxHeight: 180, borderRadius: 6, objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              Notes / Remarks
            </Text>
            <Paragraph style={{ margin: 0, fontSize: 13, wordBreak: 'break-word' }}>{expense.notes}</Paragraph>
          </div>
        )}
      </div>
    </Modal>
  );
};
