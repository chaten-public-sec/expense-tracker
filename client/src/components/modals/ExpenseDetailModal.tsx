import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { Expense } from '../../types';
import { Calendar, Clock, CreditCard, Banknote, Edit3, Trash2, ExternalLink } from 'lucide-react';
import api from '../../services/api';

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
  onExpenseDeleted
}) => {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showImageFull, setShowImageFull] = useState(false);

  if (!expense) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/expenses/${expense._id}`);
      showToast(`Expense "${expense.title}" deleted`, 'info');
      onExpenseDeleted();
      setShowConfirmDelete(false);
      onClose();
    } catch (err: any) {
      console.error('Delete Expense Error:', err);
      showToast(err.response?.data?.message || 'Failed to delete expense', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Expense Details"
        maxWidth="md"
      >
        <div className="space-y-5 py-2">
          {/* Header Title & Amount */}
          <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{expense.title}</h2>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(expense.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatTime(expense.date)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-900">₹{expense.amount}</div>
              <Badge variant="outline" className="mt-1 uppercase text-[10px]">
                {expense.paymentMode === 'upi' ? (
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> UPI</span>
                ) : (
                  <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> Cash</span>
                )}
              </Badge>
            </div>
          </div>

          {/* Paid By */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Paid By</span>
            <div className="flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl">
              <Avatar name={expense.paidBy.fullName} size="md" />
              <div>
                <h4 className="text-sm font-bold text-zinc-900">{expense.paidBy.fullName}</h4>
                <p className="text-xs text-zinc-500">{expense.paidBy.phone || expense.paidBy.email}</p>
              </div>
            </div>
          </div>

          {/* Split Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Split Breakdown</span>
              <span className="text-xs font-medium text-zinc-500">
                {expense.splitType === 'everyone' ? 'Everyone' : 'Specific Members'} ({expense.splitDetails.length})
              </span>
            </div>

            <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-white">
              {expense.splitDetails.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={item.user?.fullName || 'User'} size="sm" />
                    <span className="text-xs font-semibold text-zinc-900">
                      {item.user?.fullName || 'Member'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900">₹{item.share}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes if available */}
          {expense.notes && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Notes</span>
              <p className="text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl p-3 leading-relaxed">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Screenshot if available */}
          {expense.screenshotUrl && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Payment Screenshot</span>
              <div
                onClick={() => setShowImageFull(true)}
                className="relative group cursor-pointer border border-zinc-200 rounded-xl overflow-hidden bg-zinc-100 p-1 flex items-center justify-center"
              >
                <img
                  src={expense.screenshotUrl}
                  alt="UPI Receipt"
                  className="max-h-48 object-contain rounded-lg transition-transform group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                  <ExternalLink className="w-4 h-4 mr-1" /> View Full Image
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
            >
              <Edit3 className="w-4 h-4 mr-1.5" /> Edit
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              onClick={() => setShowConfirmDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Delete Expense?"
        description="Are you sure you want to delete this expense? Group balances will recalculate automatically."
        maxWidth="sm"
      >
        <div className="flex gap-2 pt-4">
          <Button
            variant="ghost"
            className="w-1/2"
            onClick={() => setShowConfirmDelete(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="w-1/2"
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      {showImageFull && expense.screenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImageFull(false)}>
          <img src={expense.screenshotUrl} alt="UPI Full Screenshot" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
};
