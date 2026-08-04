import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { GroupMember } from '../../types';
import { Check, CreditCard, Banknote } from 'lucide-react';
import api from '../../services/api';

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
  onExpenseAdded
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'everyone' | 'specific'>('everyone');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [notes, setNotes] = useState('');
  
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setPaidBy(user?._id || (members[0]?._id || ''));
      setSplitType('everyone');
      setSelectedMembers(members.map(m => m._id));
      setPaymentMode('cash');
      setNotes('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setError('');
    }
  }, [isOpen, user, members]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
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

    if (splitType === 'specific' && selectedMembers.length === 0) {
      setError('Please select at least one member to split between');
      return;
    }

    try {
      setIsLoading(true);
      let uploadedUrl: string | null = null;

      if (paymentMode === 'upi' && screenshotFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', screenshotFile);

        const uploadRes = await api.post('/expenses/upload-screenshot', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrl = uploadRes.data.imageUrl;
        setIsUploading(false);
      }

      await api.post('/expenses', {
        title: title.trim(),
        amount: numAmount,
        paidBy: paidBy || user?._id,
        splitType,
        splitBetween: splitType === 'specific' ? selectedMembers : undefined,
        paymentMode,
        screenshotUrl: uploadedUrl,
        notes: notes.trim()
      });

      showToast(`Expense "${title}" added successfully!`, 'success');
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      console.error('Add Expense Error:', err);
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const activeCount = splitType === 'everyone' ? members.length : selectedMembers.length;
  const equalShare = activeCount > 0 ? (parsedAmount / activeCount).toFixed(2) : '0.00';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Expense"
      description="Record a shared expense for your flatmates"
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
          placeholder="e.g. Groceries, Electricity Bill, Pizza"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
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
                  {m.fullName} {m._id === user?._id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                  ? 'border-black bg-zinc-900 text-white shadow-sm font-semibold'
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
                  ? 'border-black bg-zinc-900 text-white shadow-sm font-semibold'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="text-xs">Specific Members</span>
              {splitType === 'specific' && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>

          {splitType === 'specific' && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 mt-2">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Select Members:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {members.map((m) => {
                  const isChecked = selectedMembers.includes(m._id);
                  return (
                    <label
                      key={m._id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-200/60 hover:border-zinc-300 cursor-pointer text-xs"
                    >
                      <span className="font-medium text-zinc-800">
                        {m.fullName} {m._id === user?._id ? '(You)' : ''}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleMemberToggle(m._id)}
                        className="rounded border-zinc-300 text-black focus:ring-black h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {parsedAmount > 0 && (
            <p className="text-xs text-zinc-500 bg-zinc-100 p-2.5 rounded-xl text-center font-medium">
              Each person's share: <span className="font-bold text-zinc-900">₹{equalShare}</span> ({activeCount} members)
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Payment Mode
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('cash')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                paymentMode === 'cash'
                  ? 'border-black bg-zinc-900 text-white shadow-sm'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <Banknote className="w-4 h-4" /> Cash
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('upi')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                paymentMode === 'upi'
                  ? 'border-black bg-zinc-900 text-white shadow-sm'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <CreditCard className="w-4 h-4" /> UPI
            </button>
          </div>

          {paymentMode === 'upi' && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 mt-2">
              <label className="block text-xs font-semibold text-zinc-700">
                Optional UPI Screenshot Proof
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-zinc-800"
              />
              {screenshotPreview && (
                <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-300">
                  <img src={screenshotPreview} alt="Screenshot preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>

        <Input
          label="Optional Notes"
          placeholder="e.g. Bought from D-Mart"
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
            isLoading={isLoading || isUploading}
          >
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
