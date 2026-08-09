import React from 'react';
import { Modal, Avatar, Button, Typography, Tag, Space, Empty, Flex } from 'antd';
import { CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import { OwedPerson } from '../../types';

const { Text, Title } = Typography;

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'need_to_pay' | 'will_receive';
  totalAmount: number;
  peopleList: OwedPerson[];
  onMarkAsPaid?: (person: OwedPerson) => void;
}

export const BreakdownModal: React.FC<BreakdownModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  totalAmount,
  peopleList,
  onMarkAsPaid,
}) => {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <div style={{ paddingRight: 24 }}>
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total amount:{' '}
            <strong style={{ color: type === 'need_to_pay' ? '#ef4444' : '#10b981' }}>
              ₹{totalAmount.toFixed(2)}
            </strong>
          </Text>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={480}
    >
      {peopleList.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No active dues or balances in this section"
          style={{ padding: '24px 0' }}
        />
      ) : (
        <Flex vertical gap={8} style={{ padding: '4px 0' }}>
          {peopleList.map((item) => (
            <div
              key={item.user._id}
              style={{
                padding: '12px 14px',
                background: '#fafafa',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space align="center" size="middle">
                <Avatar
                  style={{
                    backgroundColor: type === 'need_to_pay' ? '#ef4444' : '#10b981',
                    fontWeight: 600,
                  }}
                  icon={<UserOutlined />}
                >
                  {item.user.fullName?.charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    {item.user.fullName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {item.user.phone || item.user.email}
                  </Text>
                </div>
              </Space>

              <Space align="center" size="middle">
                <Text
                  strong
                  style={{
                    fontSize: 15,
                    color: type === 'need_to_pay' ? '#ef4444' : '#10b981',
                  }}
                >
                  ₹{item.amount.toFixed(2)}
                </Text>

                {type === 'need_to_pay' && onMarkAsPaid && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      onClose();
                      onMarkAsPaid(item);
                    }}
                  >
                    Pay
                  </Button>
                )}
              </Space>
            </div>
          ))}
        </Flex>
      )}
    </Modal>
  );
};
