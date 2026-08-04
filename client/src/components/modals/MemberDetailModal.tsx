import React from 'react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { GroupMember } from '../../types';
import { Mail, Phone, Calendar } from 'lucide-react';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GroupMember | null;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  member
}) => {
  if (!member) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Profile"
      maxWidth="sm"
    >
      <div className="space-y-5 py-2 text-center">
        {/* Header Avatar & Name */}
        <div className="flex flex-col items-center space-y-2">
          <Avatar name={member.fullName} size="xl" />
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{member.fullName}</h3>
          <Badge variant={member.role === 'creator' ? 'default' : 'outline'} className="capitalize">
            {member.role}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-left text-xs">
          <div className="flex items-center gap-2 text-zinc-600">
            <Mail className="w-4 h-4 text-zinc-400" />
            <span>{member.email}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <Phone className="w-4 h-4 text-zinc-400" />
            <span>{member.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-[11px] pt-1 border-t border-zinc-200/60">
            <Calendar className="w-3.5 h-3.5" />
            <span>Joined {formatDate(member.joinedAt)}</span>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-white border border-zinc-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Paid</span>
            <span className="text-sm font-bold text-zinc-900 mt-1 block">₹{member.totalPaid}</span>
          </div>

          <div className="p-3 bg-white border border-zinc-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Owes</span>
            <span className="text-sm font-bold text-zinc-900 mt-1 block">₹{member.totalOwes}</span>
          </div>

          <div className="p-3 bg-white border border-zinc-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Receives</span>
            <span className="text-sm font-bold text-zinc-900 mt-1 block">₹{member.totalReceives}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
