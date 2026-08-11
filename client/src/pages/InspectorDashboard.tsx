import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tag,
  Space,
  Select,
  Table,
  Tabs,
  Badge,
  Spin,
  Button,
  Flex,
  Alert,
  Divider,
} from 'antd';
import {
  SafetyCertificateOutlined,
  TeamOutlined,
  DollarOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  MobileOutlined,
  DollarCircleOutlined,
  ArrowRightOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';

const { Title, Text } = Typography;

export interface InspectorGroup {
  _id: string;
  name: string;
  inviteCode: string;
  createdBy?: { fullName: string; email: string };
  createdAt: string;
  memberCount: number;
  members: any[];
  expenseCount: number;
  totalExpenseSum: number;
  settlementCount: number;
  completedSettlementSum: number;
}

export const InspectorDashboard: React.FC = () => {
  const { showError } = useToast();
  const [groups, setGroups] = useState<InspectorGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Fetch all listed groups
  const fetchAllGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const res = await api.get('/inspector/groups');
      const grps = res.data.groups || [];
      setGroups(grps);
      if (grps.length > 0 && !selectedGroupId) {
        setSelectedGroupId(grps[0]._id);
      }
    } catch (err: any) {
      console.error('[Inspector Fetch Groups Error]:', err);
      showError('Failed to load groups for inspection.');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Fetch selected group's full person-wise breakdown & expense history
  const fetchGroupDetails = async (gId: string) => {
    try {
      setIsLoadingDetails(true);
      const res = await api.get(`/inspector/groups/${gId}`);
      setGroupDetails(res.data);
    } catch (err: any) {
      console.error('[Inspector Fetch Group Details Error]:', err);
      showError('Failed to load group inspection details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchAllGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails(selectedGroupId);
    }
  }, [selectedGroupId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      {/* Inspector Banner */}
      <Alert
        message={
          <Space align="center">
            <SafetyCertificateOutlined style={{ fontSize: 18, color: '#722ed1' }} />
            <Text strong style={{ fontSize: 14 }}>
              Inspector Audit Console (Read-Only Mode)
            </Text>
          </Space>
        }
        description="Logged in as inspect@gmail.com. You have global audit access to inspect all listed groups, full expense history, person-wise expense shares, and settlement records."
        type="info"
        showIcon={false}
        style={{
          borderRadius: 12,
          background: 'linear-gradient(135deg, #f9f5ff 0%, #f3e8ff 100%)',
          border: '1px solid #d8b4fe',
        }}
      />

      {/* Group Selector & Header */}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 14 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={4} style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              Group Audit & Inspection
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Groups Listed: <strong>{groups.length}</strong>
            </Text>
          </div>

          <div style={{ minWidth: 260, flex: 1, maxWidth: 380 }}>
            <Select
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              loading={isLoadingGroups}
              style={{ width: '100%' }}
              size="middle"
              options={groups.map((g) => ({
                label: `📁 ${g.name} (${g.memberCount} members · ₹${g.totalExpenseSum.toFixed(2)})`,
                value: g._id,
              }))}
              placeholder="Select group to inspect"
            />
          </div>
        </div>
      </Card>

      {/* Detailed Group Audit View */}
      {isLoadingDetails ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
            Loading group inspection audit data...
          </Text>
        </div>
      ) : groupDetails ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Card style={{ borderRadius: 12, background: '#f0f7ff', border: '1px solid #bae6fd' }} styles={{ body: { padding: 12 } }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Active Group</Text>
              <Title level={4} style={{ margin: '2px 0 0', fontSize: 16 }}>{groupDetails.group?.name}</Title>
              <Text type="secondary" style={{ fontSize: 11 }}>Code: {groupDetails.group?.inviteCode}</Text>
            </Card>

            <Card style={{ borderRadius: 12, background: '#fdf4ff', border: '1px solid #f5d0fe' }} styles={{ body: { padding: 12 } }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Total Group Expenses</Text>
              <Title level={4} className="financial-num" style={{ margin: '2px 0 0', fontSize: 18, color: '#2563eb' }}>
                ₹{groupDetails.totalGroupExpenses?.toFixed(2)}
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>{groupDetails.expenses?.length || 0} total entries</Text>
            </Card>

            <Card style={{ borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }} styles={{ body: { padding: 12 } }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Members Count</Text>
              <Title level={4} style={{ margin: '2px 0 0', fontSize: 18, color: '#16a34a' }}>
                {groupDetails.memberCount || 0} Persons
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>Full breakdown below</Text>
            </Card>
          </div>

          {/* Inspection Tabs */}
          <Tabs
            defaultActiveKey="person-wise"
            type="card"
            style={{ borderRadius: 14 }}
            items={[
              {
                key: 'person-wise',
                label: (
                  <span>
                    <UserOutlined /> Person-Wise Expense Breakdown
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
                    {groupDetails.personWiseBreakdown?.map((pw: any) => (
                      <Card
                        key={pw.member._id}
                        style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                        styles={{ body: { padding: 14 } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <Text strong style={{ fontSize: 15, display: 'block' }}>
                              👤 {pw.member.fullName}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {pw.member.email} · Phone: {pw.member.phone || 'N/A'}
                            </Text>
                          </div>

                          <Space size={12} wrap>
                            <Tag color="blue" style={{ fontSize: 12, padding: '2px 8px' }}>
                              Paid: ₹{pw.paidTotal.toFixed(2)}
                            </Tag>
                            <Tag color="orange" style={{ fontSize: 12, padding: '2px 8px' }}>
                              Owed Share: ₹{pw.shareTotal.toFixed(2)}
                            </Tag>
                            <Tag color={pw.netBalance >= 0 ? 'green' : 'red'} style={{ fontSize: 12, padding: '2px 8px', fontWeight: 700 }}>
                              Net Balance: {pw.netBalance >= 0 ? `+₹${pw.netBalance.toFixed(2)}` : `-₹${Math.abs(pw.netBalance).toFixed(2)}`}
                            </Tag>
                          </Space>
                        </div>

                        <Divider style={{ margin: '10px 0' }} />

                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                          Expenses Involving {pw.member.fullName} ({pw.expenseCount}):
                        </Text>

                        {pw.expenses && pw.expenses.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {pw.expenses.map((exp: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 8,
                                  background: '#f8fafc',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: 12,
                                }}
                              >
                                <div>
                                  <Text strong>{exp.title}</Text>
                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                                    Role: {exp.role} · Mode: {exp.paymentMode?.toUpperCase()} · Date: {formatDate(exp.date)}
                                  </Text>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <Text strong style={{ color: '#2563eb' }}>
                                    Total ₹{exp.amount.toFixed(2)}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                                    Share: ₹{exp.memberShare.toFixed(2)}
                                  </Text>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                            No expense records recorded for this member.
                          </Text>
                        )}
                      </Card>
                    ))}
                  </div>
                ),
              },
              {
                key: 'full-expenses',
                label: (
                  <span>
                    <FileTextOutlined /> Full Expense History ({groupDetails.expenses?.length || 0})
                  </span>
                ),
                children: (
                  <Card style={{ borderRadius: 12, marginTop: 6 }} styles={{ body: { padding: 0 } }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {groupDetails.expenses?.map((exp: any, idx: number) => (
                        <div
                          key={exp._id || idx}
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx !== groupDetails.expenses.length - 1 ? '1px solid #f1f5f9' : 'none',
                          }}
                        >
                          <div>
                            <Text strong style={{ fontSize: 14, display: 'block' }}>
                              {exp.title}
                            </Text>
                            <Space size={6} style={{ fontSize: 11, marginTop: 2 }}>
                              <Text type="secondary">Paid by {exp.paidBy?.fullName}</Text>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">{formatDate(exp.date || exp.createdAt)}</Text>
                              <Tag color={exp.paymentMode === 'upi' ? 'blue' : 'green'} style={{ margin: 0, fontSize: 10 }}>
                                {exp.paymentMode?.toUpperCase()}
                              </Tag>
                            </Space>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <Text strong className="financial-num" style={{ fontSize: 15, color: '#2563eb' }}>
                              ₹{exp.amount.toFixed(2)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                              {exp.splitType === 'everyone' ? 'Split All' : `${exp.splitDetails?.length || 0} shares`}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ),
              },
              {
                key: 'settlements',
                label: (
                  <span>
                    <HistoryOutlined /> Settlement History ({groupDetails.settlements?.length || 0})
                  </span>
                ),
                children: (
                  <Card style={{ borderRadius: 12, marginTop: 6 }} styles={{ body: { padding: 0 } }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {groupDetails.settlements?.map((set: any, idx: number) => (
                        <div
                          key={set._id || idx}
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx !== groupDetails.settlements.length - 1 ? '1px solid #f1f5f9' : 'none',
                          }}
                        >
                          <div>
                            <Text strong style={{ fontSize: 13, display: 'block' }}>
                              {set.payer?.fullName} ➔ {set.receiver?.fullName}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Method: {set.paymentMethod?.toUpperCase() || 'UPI'} · Date: {formatDate(set.createdAt)}
                            </Text>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <Text strong style={{ fontSize: 14, color: '#16a34a' }}>
                              ₹{set.amount.toFixed(2)}
                            </Text>
                            <div>
                              <Tag color={set.status === 'completed' ? 'green' : set.status === 'rejected' ? 'red' : 'orange'} style={{ fontSize: 10, margin: 0 }}>
                                {set.status?.toUpperCase()}
                              </Tag>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
};
