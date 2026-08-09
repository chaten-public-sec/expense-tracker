import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Button,
  Checkbox,
  Space,
  Typography,
  Alert,
  Avatar,
  Divider,
  Flex,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  DollarOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  DollarCircleOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { Expense, GroupMember } from '../../types';
import api from '../../services/api';

const { Text } = Typography;
const { TextArea } = Input;

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  members: GroupMember[];
  onExpenseUpdated: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  members,
  onExpenseUpdated,
}) => {
  const { showToast } = useToast();
  const [form] = Form.useForm();

  const [splitType, setSplitType] = useState<'everyone' | 'specific'>('everyone');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense && isOpen) {
      form.setFieldsValue({
        title: expense.title,
        amount: expense.amount,
        paidBy: expense.paidBy._id,
        splitType: expense.splitType || 'everyone',
        paymentMode: expense.paymentMode || 'cash',
        notes: expense.notes || '',
      });
      setSplitType(expense.splitType || 'everyone');
      setSelectedMembers(expense.splitDetails.map((d) => d.user._id));
      setError('');
    }
  }, [expense, isOpen, form]);

  if (!expense) return null;

  const handleMemberToggle = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      if (selectedMembers.length === 1) {
        setError('At least one member must be selected for expense split');
        return;
      }
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
    setError('');
  };

  const handleSelectAll = () => {
    setSelectedMembers(members.map((m) => m._id));
    setError('');
  };

  const handleSubmit = async (values: any) => {
    setError('');

    const numAmount = Number(values.amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      await api.put(`/expenses/${expense._id}`, {
        title: values.title.trim(),
        amount: numAmount,
        paidBy: values.paidBy,
        splitType,
        splitBetween: splitType === 'specific' ? selectedMembers : undefined,
        paymentMode: values.paymentMode || 'cash',
        notes: values.notes?.trim() || '',
      });

      showToast(`Expense "${values.title}" updated successfully!`, 'success');
      onExpenseUpdated();
      onClose();
    } catch (err: any) {
      console.error('Update Expense Error:', err);
      setError(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <EditOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span>Edit Expense</span>
        </Space>
      }
      footer={null}
      width={540}
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

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        <Form.Item
          label="Expense Title"
          name="title"
          rules={[{ required: true, message: 'Please enter expense title' }]}
        >
          <Input size="large" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Form.Item
            label="Total Amount (₹)"
            name="amount"
            rules={[{ required: true, message: 'Please enter valid amount' }]}
          >
            <InputNumber
              prefix="₹"
              style={{ width: '100%' }}
              size="large"
              min={1}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            label="Paid By"
            name="paidBy"
            rules={[{ required: true, message: 'Select who paid' }]}
          >
            <Select size="large">
              {members.map((m) => (
                <Select.Option key={m._id} value={m._id}>
                  {m.fullName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item label="Payment Mode" name="paymentMode">
          <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
            <Radio.Button value="cash" style={{ width: '50%', textAlign: 'center' }}>
              <Space>
                <DollarCircleOutlined />
                <span>Cash</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="upi" style={{ width: '50%', textAlign: 'center' }}>
              <Space>
                <MobileOutlined />
                <span>UPI / Online</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Split Method" name="splitType">
          <Radio.Group
            value={splitType}
            onChange={(e) => setSplitType(e.target.value)}
            buttonStyle="solid"
            style={{ width: '100%' }}
          >
            <Radio.Button value="everyone" style={{ width: '50%', textAlign: 'center' }}>
              <Space>
                <TeamOutlined />
                <span>Split Equally (All)</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="specific" style={{ width: '50%', textAlign: 'center' }}>
              <Space>
                <UsergroupAddOutlined />
                <span>Specific Flatmates</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {splitType === 'specific' && (
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>
                Split Between ({selectedMembers.length} selected):
              </Text>
              <Button type="link" size="small" onClick={handleSelectAll} style={{ padding: 0 }}>
                Select All
              </Button>
            </div>
            <Flex vertical gap={8} style={{ width: '100%' }}>
              {members.map((m) => (
                <Checkbox
                  key={m._id}
                  checked={selectedMembers.includes(m._id)}
                  onChange={() => handleMemberToggle(m._id)}
                  style={{ width: '100%', margin: 0 }}
                >
                  <Space align="center">
                    <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
                      {m.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <span>{m.fullName}</span>
                  </Space>
                </Checkbox>
              ))}
            </Flex>
          </div>
        )}

        <Form.Item label="Notes / Remarks (Optional)" name="notes">
          <TextArea rows={2} />
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={isLoading} icon={<SaveOutlined />}>
            Update Expense
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
