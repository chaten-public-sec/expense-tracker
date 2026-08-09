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
  const { user, userRole } = useAuth();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!expense) return null;

  const payerId = typeof expense.paidBy === 'string' ? expense.paidBy : expense.paidBy?._id;
  const isOwnerOrAdmin = user && (user._id === payerId || userRole === 'creator');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
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
        <Space align="center">
          <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span>Expense Details</span>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {isOwnerOrAdmin ? (
            <Popconfirm
              title="Delete Expense"
              description="Are you sure you want to delete this expense record?"
              onConfirm={handleDelete}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: isDeleting }}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title="Only the person who added this expense or group admin can delete it">
              <Button danger disabled icon={<LockOutlined />}>
                Delete
              </Button>
            </Tooltip>
          )}

          <Space>
            <Button onClick={onClose}>Close</Button>
            {isOwnerOrAdmin ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
              >
                Edit
              </Button>
            ) : (
              <Tooltip title="Only the person who added this expense or group admin can edit it">
                <Button type="primary" disabled icon={<LockOutlined />}>
                  Edit
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      }
      width={520}
    >
      <div style={{ padding: '4px 0' }}>
        {/* Header Title & Amount */}
        <div
          style={{
            padding: 16,
            background: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              Expense Title
            </Text>
            <Title level={4} style={{ margin: 0 }}>
              {expense.title}
            </Title>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              Amount Paid
            </Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff' }}>
              ₹{expense.amount.toFixed(2)}
            </Text>
          </div>
        </div>

        {/* Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Paid By
            </Text>
            <Space align="center">
              <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
                {typeof expense.paidBy === 'object' ? expense.paidBy?.fullName?.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Text strong style={{ fontSize: 13 }}>
                {typeof expense.paidBy === 'object' ? expense.paidBy?.fullName : 'User'}
              </Text>
            </Space>
          </div>

          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Payment Mode
            </Text>
            <Tag
              color={expense.paymentMode === 'upi' ? 'blue' : 'default'}
              icon={expense.paymentMode === 'upi' ? <MobileOutlined /> : <DollarCircleOutlined />}
              style={{ margin: 0, fontWeight: 500 }}
            >
              {expense.paymentMode === 'upi' ? 'UPI / Online' : 'Cash'}
            </Tag>
          </div>

          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Date Added
            </Text>
            <Space size={4}>
              <CalendarOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ fontSize: 12 }}>{formatDate(expense.date || expense.createdAt || '')}</Text>
            </Space>
          </div>

          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Time Added
            </Text>
            <Text style={{ fontSize: 12 }}>{formatTime(expense.date || expense.createdAt || '')}</Text>
          </div>
        </div>

        {/* Split Details Breakdown */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>
              Split Breakdown ({expense.splitDetails?.length || 0} participants)
            </Text>
            <Tag color="cyan">
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
                <Space align="center">
                  <Avatar size="small" style={{ backgroundColor: '#0f172a' }} icon={<UserOutlined />}>
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
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Bill / Receipt Image
            </Text>
            <Image
              src={expense.screenshotUrl}
              alt="Receipt"
              style={{ maxHeight: 180, borderRadius: 8, objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
              Notes / Remarks
            </Text>
            <Paragraph style={{ margin: 0, fontSize: 13 }}>{expense.notes}</Paragraph>
          </div>
        )}
      </div>
    </Modal>
  );
};
