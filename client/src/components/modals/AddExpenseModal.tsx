import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Button,
  Upload,
  Checkbox,
  Space,
  Typography,
  Alert,
  Avatar,
  Divider,
  Flex,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  DollarOutlined,
  TeamOutlined,
  UserOutlined,
  MobileOutlined,
  DollarCircleOutlined,
  UsergroupAddOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { GroupMember } from '../../types';
import api from '../../services/api';

const { Text } = Typography;
const { TextArea } = Input;

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GroupMember[];
  onExpenseAdded: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  members,
  onExpenseAdded,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form] = Form.useForm();

  const [splitType, setSplitType] = useState<'everyone' | 'specific'>('everyone');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const defaultPayer = user?._id || (members[0]?._id || '');
      const allMemberIds = members.map((m) => m._id);
      form.setFieldsValue({
        title: '',
        amount: undefined,
        paidBy: defaultPayer,
        splitType: 'everyone',
        paymentMode: 'cash',
        notes: '',
      });
      setSplitType('everyone');
      setSelectedMembers(allMemberIds);
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setError('');
    }
  }, [isOpen, user, members, form]);

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
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (splitType === 'specific' && selectedMembers.length === 0) {
      setError('Please select at least one member to split between');
      return;
    }

    try {
      setIsLoading(true);

      let screenshotUrl: string | null = null;

      // 1. If screenshot attached, upload it first
      if (screenshotFile) {
        try {
          const imgFormData = new FormData();
          imgFormData.append('image', screenshotFile);
          const uploadRes = await api.post('/expenses/upload-screenshot', imgFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          screenshotUrl = uploadRes.data?.imageUrl || null;
        } catch (uploadErr) {
          console.warn('Screenshot upload skipped/failed:', uploadErr);
        }
      }

      // 2. Post JSON payload to /api/expenses
      await api.post('/expenses', {
        title: values.title.trim(),
        amount: numAmount,
        paidBy: values.paidBy,
        splitType,
        splitBetween: splitType === 'specific' ? selectedMembers : undefined,
        paymentMode: values.paymentMode || 'cash',
        notes: values.notes?.trim() || '',
        screenshotUrl,
      });

      showToast(`Expense "${values.title}" added successfully!`, 'success');
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      console.error('Create Expense Error:', err);
      setError(err.response?.data?.message || 'Failed to add expense');
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
          <DollarOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span>Add New Expense</span>
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
        initialValues={{
          splitType: 'everyone',
          paymentMode: 'cash',
        }}
        requiredMark="optional"
      >
        <Form.Item
          label="Expense Title"
          name="title"
          rules={[{ required: true, message: 'Please enter expense description' }]}
        >
          <Input placeholder="e.g. WiFi Bill, Groceries, Dinner" size="large" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Form.Item
            label="Total Amount (₹)"
            name="amount"
            rules={[{ required: true, message: 'Please enter total amount' }]}
          >
            <InputNumber
              prefix="₹"
              placeholder="0.00"
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
                  {m.fullName} {m._id === user?._id ? '(You)' : ''}
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
                <span>Cash Payment</span>
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
                    <span>{m.fullName} {m._id === user?._id ? '(You)' : ''}</span>
                  </Space>
                </Checkbox>
              ))}
            </Flex>
          </div>
        )}

        <Form.Item label="Receipt / Bill Screenshot (Optional)">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Upload
              beforeUpload={(file) => {
                setScreenshotFile(file);
                setScreenshotPreview(URL.createObjectURL(file));
                return false;
              }}
              showUploadList={false}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>Upload Bill Image</Button>
            </Upload>
            {screenshotPreview && (
              <Space align="center">
                <img
                  src={screenshotPreview}
                  alt="Receipt Preview"
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                />
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => {
                    setScreenshotFile(null);
                    setScreenshotPreview(null);
                  }}
                />
              </Space>
            )}
          </div>
        </Form.Item>

        <Form.Item label="Notes / Remarks (Optional)" name="notes">
          <TextArea rows={2} placeholder="Add any additional details or items purchased" />
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={isLoading} icon={<PlusOutlined />}>
            Save Expense
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
