import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Expense, GroupMember } from '../types';
import { Plus, Search, Receipt } from 'lucide-react';
import api from '../services/api';

import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { ExpenseDetailModal } from '../components/modals/ExpenseDetailModal';
import { EditExpenseModal } from '../components/modals/EditExpenseModal';

export const Expenses: React.FC = () => {
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'cash' | 'upi'>('all');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data || []);

      const groupRes = await api.get('/groups/info');
      setMembers(groupRes.data.members || []);
    } catch (err: any) {
      console.error('Fetch Expenses Error:', err);
      showToast('Failed to load expense history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          exp.paidBy?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterMode === 'all' || exp.paymentMode === filterMode;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24 animate-fade-in">
      {/* Header & Add Expense */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Expense History</h2>
          <p className="text-xs text-zinc-500 font-medium">All recorded group expenses</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddExpenseOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Search & Filter bar */}
      <div className="space-y-2">
        <Input
          placeholder="Search by title or member name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase mr-1">Filter:</span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All ({expenses.length})
          </button>
          <button
            onClick={() => setFilterMode('cash')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterMode === 'cash'
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setFilterMode('upi')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filterMode === 'upi'
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            UPI
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filteredExpenses.length > 0 ? (
        <div className="space-y-2.5">
          {filteredExpenses.map((exp) => (
            <Card
              key={exp._id}
              hoverable
              onClick={() => setSelectedExpense(exp)}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">{exp.title}</h4>
                  <p className="text-xs text-zinc-500 font-medium">
                    Paid by <span className="font-semibold text-zinc-800">{exp.paidBy?.fullName?.split(' ')[0]}</span> • {formatDate(exp.date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-zinc-900">₹{exp.amount}</span>
                <span className="text-[10px] text-zinc-400 font-semibold block uppercase">
                  {exp.paymentMode}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center text-zinc-400 text-xs font-medium space-y-2">
          <Receipt className="w-10 h-10 mx-auto text-zinc-300" />
          <p>No matching expenses found.</p>
        </Card>
      )}

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={members}
        onExpenseAdded={fetchExpenses}
      />

      <ExpenseDetailModal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        onEdit={(exp) => setEditingExpense(exp)}
        onExpenseDeleted={fetchExpenses}
      />

      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        members={members}
        onExpenseUpdated={fetchExpenses}
      />
    </div>
  );
};
