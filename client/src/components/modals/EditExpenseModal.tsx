import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Expense, GroupMember } from '../../types';
import { Check, Banknote, CreditCard } from 'lucide-react';
import api from '../../services/api';

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
  onExpenseUpdated
}) => {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'everyone' | 'specific'>('everyone');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense && isOpen) {
      setTitle(expense.title);
      setAmount(expense.amount.toString());
      setPaidBy(expense.paidBy._id);
      setSplitType(expense.splitType || 'everyone');
      setSelectedMembers(expense.splitDetails.map(d => d.user._id));
      setPaymentMode(expense.paymentMode || 'cash');
      setNotes(expense.notes || '');
      setError('');
    }
  }, [expense, isOpen]);

  if (!expense) return null;

  const handleMemberToggle = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      if (selectedMembers.length === 1) {
        setError('At least one member must be selected for expense split');
        return;
      }
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter expense title');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      await api.put(`/expenses/${expense._id}`, {
        title: title.trim(),
        amount: numAmount,
        paidBy,
        splitType,
        splitBetween: splitType === 'specific' ? selectedMembers : undefined,
        paymentMode,
        notes: notes.trim()
      });

      showToast(`Expense "${title}" updated successfully!`, 'success');
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
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Expense"
      description="Modify expense details and split configuration"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Expense Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full bg-white text-zinc-900 text-sm rounded-xl border border-zinc-200 py-2.5 px-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Type */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Split Between
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSplitType('everyone')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                splitType === 'everyone'
                  ? 'border-black bg-zinc-900 text-white font-semibold'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="text-xs">Everyone ({members.length})</span>
              {splitType === 'everyone' && <Check className="w-4 h-4 text-white" />}
            </button>

            <button
              type="button"
              onClick={() => setSplitType('specific')}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                splitType === 'specific'
                  ? 'border-black bg-zinc-900 text-white font-semibold'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="text-xs">Specific Members</span>
              {splitType === 'specific' && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>

          {splitType === 'specific' && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5 mt-2">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Select Members:
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {members.map((m) => (
                  <label
                    key={m._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200 cursor-pointer text-xs"
                  >
                    <span className="font-medium text-zinc-800">{m.fullName}</span>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(m._id)}
                      onChange={() => handleMemberToggle(m._id)}
                      className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <Input
          label="Optional Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-2 pt-3 border-t border-zinc-100">
          <Button
            type="button"
            variant="ghost"
            className="w-1/3"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="w-2/3"
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
