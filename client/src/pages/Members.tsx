import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { GroupMember } from '../types';
import { Users, ChevronRight, Crown } from 'lucide-react';
import api from '../services/api';

import { MemberDetailModal } from '../components/modals/MemberDetailModal';

export const Members: React.FC = () => {
  const { showToast } = useToast();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/groups/info');
      setMembers(res.data.members || []);
      setGroupName(res.data.group?.name || '');
    } catch (err: any) {
      console.error('Fetch Members Error:', err);
      showToast('Failed to load group members', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24 animate-fade-in">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Group Members</h2>
        <p className="text-xs text-zinc-500 font-medium">
          Flatmates in <span className="font-bold text-zinc-800">{groupName}</span> ({members.length})
        </p>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : members.length > 0 ? (
        <div className="space-y-2.5">
          {members.map((m) => (
            <Card
              key={m._id}
              hoverable
              onClick={() => setSelectedMember(m)}
              className="p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.fullName} size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-zinc-900">{m.fullName}</h4>
                    {m.role === 'creator' && (
                      <span title="Group Creator"><Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /></span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">{m.phone || m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-900 block">₹{m.totalPaid} paid</span>
                  <span className="text-[10px] text-zinc-400 block font-medium">
                    Owes ₹{m.totalOwes}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-zinc-400 text-xs font-medium">
          <Users className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
          No members found in this group.
        </Card>
      )}

      {/* Member Details Modal */}
      <MemberDetailModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
      />
    </div>
  );
};
