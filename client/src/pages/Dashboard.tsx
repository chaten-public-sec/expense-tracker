import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { DashboardData, Expense, GroupMember, OwedPerson, Settlement } from '../types';
import { Plus, ArrowUpRight, ArrowDownLeft, ShieldAlert, ChevronRight, Activity, Clock, Receipt, CheckCircle } from 'lucide-react';
import api from '../services/api';

// Modals
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { ExpenseDetailModal } from '../components/modals/ExpenseDetailModal';
import { EditExpenseModal } from '../components/modals/EditExpenseModal';
import { BreakdownModal } from '../components/modals/BreakdownModal';
import { SettlementModal } from '../components/modals/SettlementModal';

export const Dashboard: React.FC = () => {
  const { user, group, refreshUserData } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Breakdown modals
  const [breakdownType, setBreakdownType] = useState<'need_to_pay' | 'will_receive' | null>(null);

  // Settlement modal
  const [settlementTarget, setSettlementTarget] = useState<OwedPerson | null>(null);
  const [receiverPendingSettlement, setReceiverPendingSettlement] = useState<Settlement | null>(null);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/dashboard');

      if (!res.data.hasGroup) {
        navigate('/no-group');
        return;
      }

      setData(res.data);

      // Fetch group members list for expense modal dropdown
      const groupRes = await api.get('/groups/info');
      setMembers(groupRes.data.members || []);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      showToast('Error loading dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (isLoading && !data) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4 pb-20">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const youNeedToPayTotal = data?.balances?.youNeedToPayTotal || 0;
  const youWillReceiveTotal = data?.balances?.youWillReceiveTotal || 0;
  const youNeedToPayList = data?.balances?.youNeedToPayList || [];
  const youWillReceiveList = data?.balances?.youWillReceiveList || [];

  const receiverVerifications = data?.pendingVerifications?.asReceiver || [];
  const payerVerifications = data?.pendingVerifications?.asPayer || [];

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 pb-24 animate-fade-in">
      {/* Welcome & Group Banner */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            Welcome, {user?.fullName?.split(' ')[0]} 👋
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Group: <span className="font-bold text-zinc-800">{group?.name || data?.group?.name}</span>
          </p>
        </div>
        <Badge variant="outline" className="capitalize text-[11px] py-1 px-3">
          {data?.group?.userRole}
        </Badge>
      </div>

      {/* Three Main Action / Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Add Expense Quick Launcher Card */}
        <Card
          hoverable
          onClick={() => setIsAddExpenseOpen(true)}
          className="bg-black text-white border-black flex flex-col justify-between p-4 cursor-pointer hover:bg-zinc-900 shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Quick Action</span>
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base font-extrabold tracking-tight text-white block">Add Expense</span>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">Record shared bill</span>
          </div>
        </Card>

        {/* 2. Total You Need To Pay Card */}
        <Card
          hoverable
          onClick={() => setBreakdownType('need_to_pay')}
          className="flex flex-col justify-between p-4 border-zinc-200"
        >
          <div className="flex items-center justify-between text-red-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">You Need To Pay</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight block">
              ₹{youNeedToPayTotal}
            </span>
            <span className="text-[11px] text-zinc-500 font-medium mt-0.5 flex items-center gap-0.5">
              {youNeedToPayList.length} people <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Card>

        {/* 3. Total You Will Receive Card */}
        <Card
          hoverable
          onClick={() => setBreakdownType('will_receive')}
          className="flex flex-col justify-between p-4 border-zinc-200"
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">You Will Receive</span>
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight block">
              ₹{youWillReceiveTotal}
            </span>
            <span className="text-[11px] text-zinc-500 font-medium mt-0.5 flex items-center gap-0.5">
              {youWillReceiveList.length} people <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Card>
      </div>

      {/* Pending Verifications Section */}
      {(receiverVerifications.length > 0 || payerVerifications.length > 0) && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">Pending OTP Verifications</h3>
          </div>

          {/* Receiver Side Pending Items */}
          {receiverVerifications.map((s) => (
            <Card key={s._id} className="p-4 border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={s.payer.fullName} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{s.payer.fullName}</h4>
                    <p className="text-xs text-zinc-500 font-medium">Sent payment of ₹{s.amount}</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setReceiverPendingSettlement(s)}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verify Payment
                </Button>
              </div>
            </Card>
          ))}

          {/* Payer Side Pending Items */}
          {payerVerifications.map((s) => (
            <Card key={s._id} className="p-4 border-zinc-200 bg-zinc-50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-zinc-900">Verification Pending</span>
                </div>
                <Badge variant="warning" className="text-[10px]">Payer</Badge>
              </div>
              <p className="text-xs text-zinc-600">
                You initiated <strong className="text-zinc-900">₹{s.amount}</strong> to <strong className="text-zinc-900">{s.receiver.fullName}</strong>. Waiting for receiver to enter 6-digit OTP.
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Expenses Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">Recent Expenses</h3>
          <button
            onClick={() => navigate('/expenses')}
            className="text-xs text-zinc-900 font-bold hover:underline"
          >
            View All
          </button>
        </div>

        {data?.recentExpenses && data.recentExpenses.length > 0 ? (
          <div className="space-y-2">
            {data.recentExpenses.map((exp) => (
              <Card
                key={exp._id}
                hoverable
                onClick={() => setSelectedExpense(exp)}
                className="p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{exp.title}</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Paid by <span className="font-semibold text-zinc-700">{exp.paidBy?.fullName?.split(' ')[0]}</span> • {formatTimeAgo(exp.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-zinc-900">₹{exp.amount}</span>
                  <span className="text-[10px] text-zinc-400 block font-medium uppercase">
                    {exp.splitType}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-zinc-400 text-xs font-medium space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-zinc-300" />
            <p>No expenses added yet in this group.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setIsAddExpenseOpen(true)}
            >
              Add First Expense
            </Button>
          </Card>
        )}
      </div>

      {/* Recent Activity Timeline Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">Recent Activity</h3>
        </div>

        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <Card className="p-4 space-y-3">
            <div className="space-y-3 divide-y divide-zinc-100">
              {data.recentActivity.map((act) => (
                <div key={act._id} className="pt-2.5 first:pt-0 flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <Avatar name={act.user?.fullName || 'User'} size="sm" className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-zinc-800">
                        <strong className="font-bold text-zinc-900">{act.user?.fullName?.split(' ')[0]}</strong> {act.action}
                      </p>
                      <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                        {formatTimeAgo(act.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="text-xs text-zinc-400 text-center py-4 font-medium">
            No activity recorded yet.
          </div>
        )}
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={members}
        onExpenseAdded={() => {
          loadDashboardData();
          refreshUserData();
        }}
      />

      <ExpenseDetailModal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        onEdit={(exp) => setEditingExpense(exp)}
        onExpenseDeleted={() => {
          loadDashboardData();
          refreshUserData();
        }}
      />

      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        members={members}
        onExpenseUpdated={() => {
          loadDashboardData();
          refreshUserData();
        }}
      />

      <BreakdownModal
        isOpen={!!breakdownType}
        onClose={() => setBreakdownType(null)}
        title={breakdownType === 'need_to_pay' ? "You Need To Pay" : "You Will Receive"}
        type={breakdownType || 'need_to_pay'}
        totalAmount={breakdownType === 'need_to_pay' ? youNeedToPayTotal : youWillReceiveTotal}
        peopleList={breakdownType === 'need_to_pay' ? youNeedToPayList : youWillReceiveList}
        onMarkAsPaid={(person) => {
          setBreakdownType(null);
          setSettlementTarget(person);
        }}
      />

      <SettlementModal
        isOpen={!!settlementTarget || !!receiverPendingSettlement}
        onClose={() => {
          setSettlementTarget(null);
          setReceiverPendingSettlement(null);
        }}
        targetPerson={settlementTarget}
        pendingSettlement={receiverPendingSettlement}
        onSettlementUpdated={() => {
          loadDashboardData();
          refreshUserData();
        }}
      />
    </div>
  );
};
