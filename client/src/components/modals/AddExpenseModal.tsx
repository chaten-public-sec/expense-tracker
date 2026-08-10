import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Upload,
  Checkbox,
  Space,
  Typography,
  Alert,
  Avatar,
  Divider,
  Flex,
  DatePicker,
  Segmented,
  Tag,
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
  CalendarOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
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
  const { showSuccess, showError } = useToast();
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
        date: dayjs(),
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
        setError('At least one flatmate must be selected');
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

  const handleQuickDate = (targetDate: Dayjs) => {
    form.setFieldValue('date', targetDate);
  };

  const handleSubmit = async (values: any) => {
    setError('');

    const numAmount = Number(values.amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (splitType === 'specific' && selectedMembers.length === 0) {
      setError('Please select at least one flatmate to split with');
      return;
    }

    let expenseDate = new Date();
    if (values.date) {
      expenseDate = dayjs.isDayjs(values.date) ? values.date.toDate() : new Date(values.date);
      if (isNaN(expenseDate.getTime())) {
        setError('Please select a valid expense date');
        return;
      }
    }

    try {
      setIsLoading(true);

      let screenshotUrl: string | null = null;

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

      await api.post('/expenses', {
        title: values.title.trim(),
        amount: numAmount,
        paidBy: values.paidBy,
        date: expenseDate.toISOString(),
        splitType,
        splitBetween: splitType === 'specific' ? selectedMembers : undefined,
        paymentMode: values.paymentMode || 'cash',
        notes: values.notes?.trim() || '',
        screenshotUrl,
      });

      showSuccess(`Expense "${values.title}" added successfully!`);
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      console.error('Create Expense Error:', err);
      const msg = err.response?.data?.message || 'Failed to add expense';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center" size={8}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <DollarOutlined style={{ fontSize: 15 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Add Expense</span>
        </Space>
      }
      footer={null}
      width={480}
      centered
      destroyOnClose
      maskClosable={!isLoading}
      style={{ maxWidth: 'calc(100vw - 16px)', margin: '8px auto' }}
      styles={{
        body: {
          maxHeight: 'calc(85dvh - 65px)',
          overflowY: 'auto',
          padding: '10px 4px 4px',
        },
      }}
    >
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 12, borderRadius: 8 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          paymentMode: 'cash',
          date: dayjs(),
        }}
        requiredMark={false}
      >
        {/* Title & Amount */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px 12px', marginBottom: 12 }}>
          <Form.Item
            label={<Text strong style={{ fontSize: 13 }}>Expense Title</Text>}
            name="title"
            rules={[{ required: true, message: 'Enter expense name' }]}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="e.g. Groceries, WiFi, Dinner" size="large" autoFocus />
          </Form.Item>

          <Form.Item
            label={<Text strong style={{ fontSize: 13 }}>Amount (₹)</Text>}
            name="amount"
            rules={[{ required: true, message: 'Enter total amount' }]}
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              prefix="₹"
              placeholder="0.00"
              style={{ width: '100%' }}
              size="large"
              min={0.01}
              precision={2}
            />
          </Form.Item>
        </div>

        {/* Paid By & Date */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px 12px', marginBottom: 12 }}>
          <Form.Item
            label={<Text strong style={{ fontSize: 13 }}>Paid By</Text>}
            name="paidBy"
            rules={[{ required: true, message: 'Select who paid' }]}
            style={{ marginBottom: 0 }}
          >
            <Select size="large">
              {members.map((m) => (
                <Select.Option key={m._id} value={m._id}>
                  {m.fullName} {m._id === user?._id ? '(You)' : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Text strong style={{ fontSize: 13 }}>Date</Text>
                <Space size={4}>
                  <Tag
                    color="blue"
                    style={{ cursor: 'pointer', margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4 }}
                    onClick={() => handleQuickDate(dayjs())}
                  >
                    Today
                  </Tag>
                  <Tag
                    style={{ cursor: 'pointer', margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px', borderRadius: 4 }}
                    onClick={() => handleQuickDate(dayjs().subtract(1, 'day'))}
                  >
                    Yesterday
                  </Tag>
                </Space>
              </div>
            }
            name="date"
            rules={[{ required: true, message: 'Select date' }]}
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              style={{ width: '100%' }}
              size="large"
              format="DD MMM YYYY"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
              suffixIcon={<CalendarOutlined style={{ color: '#2563eb' }} />}
              allowClear={false}
            />
          </Form.Item>
        </div>

        {/* Payment Mode */}
        <Form.Item
          label={<Text strong style={{ fontSize: 13 }}>Payment Mode</Text>}
          name="paymentMode"
          style={{ marginBottom: 12 }}
        >
          <Segmented
            block
            size="large"
            value={form.getFieldValue('paymentMode')}
            onChange={(val) => form.setFieldValue('paymentMode', val)}
            options={[
              {
                label: (
                  <Space size={6}>
                    <DollarCircleOutlined style={{ color: '#16a34a' }} />
                    <span>Cash</span>
                  </Space>
                ),
                value: 'cash',
              },
              {
                label: (
                  <Space size={6}>
                    <MobileOutlined style={{ color: '#2563eb' }} />
                    <span>UPI / Online</span>
                  </Space>
                ),
                value: 'upi',
              },
            ]}
          />
        </Form.Item>

        {/* Split Between */}
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
            Split With Flatmates
          </Text>
          <Segmented
            value={splitType}
            onChange={(val) => setSplitType(val as 'everyone' | 'specific')}
            block
            size="large"
            options={[
              {
                label: (
                  <Space size={6}>
                    <TeamOutlined style={{ color: '#2563eb' }} />
                    <span>Split with All ({members.length})</span>
                  </Space>
                ),
                value: 'everyone',
              },
              {
                label: (
                  <Space size={6}>
                    <UsergroupAddOutlined style={{ color: '#722ed1' }} />
                    <span>Choose Flatmates</span>
                  </Space>
                ),
                value: 'specific',
              },
            ]}
          />
        </div>

        {/* Flatmates Checklist when choosing specific */}
        {splitType === 'specific' && (
          <div
            style={{
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: '#64748b' }}>
                Selected: <strong>{selectedMembers.length} of {members.length}</strong>
              </Text>
              <Button type="link" size="small" onClick={handleSelectAll} style={{ padding: 0, fontSize: 12 }}>
                Select All
              </Button>
            </div>
            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
              <Flex vertical gap={4}>
                {members.map((m) => (
                  <Checkbox
                    key={m._id}
                    checked={selectedMembers.includes(m._id)}
                    onChange={() => handleMemberToggle(m._id)}
                    style={{ margin: 0, padding: '3px 0' }}
                  >
                    <Space align="center" size={8}>
                      <Avatar size="small" style={{ backgroundColor: '#2563eb', fontSize: 11 }} icon={<UserOutlined />}>
                        {m.fullName?.charAt(0).toUpperCase()}
                      </Avatar>
                      <span style={{ fontSize: 13 }}>
                        {m.fullName} {m._id === user?._id ? '(You)' : ''}
                      </span>
                    </Space>
                  </Checkbox>
                ))}
              </Flex>
            </div>
          </div>
        )}

        {/* Optional Bill Proof & Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Bill Receipt (Optional)</Text>
            <Upload
              beforeUpload={(file) => {
                setScreenshotFile(file);
                setScreenshotPreview(URL.createObjectURL(file));
                return false;
              }}
              showUploadList={false}
              accept="image/*"
            >
              <Button size="small" icon={<UploadOutlined />} style={{ borderRadius: 6 }}>
                {screenshotFile ? 'Change Photo' : 'Attach Photo'}
              </Button>
            </Upload>
          </div>

          {screenshotPreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <img
                src={screenshotPreview}
                alt="Receipt"
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }}
              />
              <Text type="secondary" style={{ fontSize: 11, flex: 1 }}>Receipt photo attached</Text>
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
            </div>
          )}

          <Form.Item name="notes" style={{ marginBottom: 12 }}>
            <Input placeholder="Notes or remarks (optional)..." />
          </Form.Item>
        </div>

        <Divider style={{ margin: '8px 0 14px' }} />

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} disabled={isLoading} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            icon={<PlusOutlined />}
            style={{ borderRadius: 8, background: '#2563eb' }}
          >
            Add Expense
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
