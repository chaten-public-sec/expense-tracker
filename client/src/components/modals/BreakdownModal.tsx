import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { OwedPerson } from '../../types';
import { CheckCircle } from 'lucide-react';

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
  onMarkAsPaid
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`Total amount: ₹${totalAmount}`}
      maxWidth="md"
    >
      <div className="space-y-4 py-1">
        {peopleList.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs font-medium">
            No active balances for this section.
          </div>
        ) : (
          <div className="space-y-2.5">
            {peopleList.map((item) => (
              <div
                key={item.user._id}
                className="p-3.5 bg-white border border-zinc-200 rounded-xl flex items-center justify-between shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={item.user.fullName} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{item.user.fullName}</h4>
                    <p className="text-xs text-zinc-500">{item.user.phone || item.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-zinc-900">₹{item.amount}</span>
                  {type === 'need_to_pay' && onMarkAsPaid && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onMarkAsPaid(item)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
