import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { User, Phone, Mail, LogOut, Copy, Check, ShieldAlert, Edit3, Trash2, DoorOpen } from 'lucide-react';
import api from '../services/api';

export const Profile: React.FC = () => {
  const { user, group, userRole, logout, refreshUserData } = useAuth();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);

  // Edit Profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Group Leave / Delete state
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const copyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      showToast(`Invite code ${group.inviteCode} copied to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!fullName.trim() || !phone.trim()) {
      setEditError('All fields are required');
      return;
    }

    try {
      setIsSaving(true);
      await api.put('/auth/profile', {
        fullName: fullName.trim(),
        phone: phone.trim()
      });
      showToast('Profile updated successfully!', 'success');
      await refreshUserData();
      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Update Profile Error:', err);
      setEditError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      setActionLoading(true);
      setActionError('');
      await api.post('/groups/leave');
      showToast('Successfully left the group', 'info');
      await refreshUserData();
      setIsLeaveOpen(false);
    } catch (err: any) {
      console.error('Leave Group Error:', err);
      setActionError(err.response?.data?.message || 'Please settle all balances before leaving the group.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setActionLoading(true);
      setActionError('');
      await api.delete('/groups');
      showToast('Group deleted successfully', 'info');
      await refreshUserData();
      setIsDeleteGroupOpen(false);
    } catch (err: any) {
      console.error('Delete Group Error:', err);
      setActionError(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24 animate-fade-in">
      {/* Header Profile Card */}
      <Card className="p-6 text-center space-y-4">
        <div className="flex flex-col items-center">
          <Avatar name={user?.fullName || 'User'} size="xl" />
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight mt-3">
            {user?.fullName}
          </h2>
          <p className="text-xs text-zinc-500 font-medium">{user?.email}</p>
        </div>

        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-left text-xs font-medium">
          <div className="flex items-center justify-between text-zinc-700">
            <span className="flex items-center gap-2 text-zinc-500">
              <Phone className="w-4 h-4 text-zinc-400" /> Phone
            </span>
            <span className="font-semibold text-zinc-900">{user?.phone}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-700 pt-1.5 border-t border-zinc-200/60">
            <span className="flex items-center gap-2 text-zinc-500">
              <Mail className="w-4 h-4 text-zinc-400" /> Email
            </span>
            <span className="font-semibold text-zinc-900">{user?.email}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="md"
          className="w-full justify-center"
          onClick={() => {
            setFullName(user?.fullName || '');
            setPhone(user?.phone || '');
            setEditError('');
            setIsEditOpen(true);
          }}
        >
          <Edit3 className="w-4 h-4 mr-1.5" /> Edit Profile
        </Button>
      </Card>

      {/* Group Info & Actions Card */}
      {group && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Group</span>
              <h3 className="text-base font-bold text-zinc-900">{group.name}</h3>
            </div>
            <Badge variant={userRole === 'creator' ? 'default' : 'outline'} className="capitalize">
              {userRole}
            </Badge>
          </div>

          {/* Permanent Invite Code Box */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400">Invite Code</span>
              <div className="text-lg font-mono font-bold tracking-widest text-zinc-900">
                {group.inviteCode}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyCode}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <Button
              variant="outline"
              size="md"
              className="w-full justify-center text-zinc-700 hover:text-zinc-900"
              onClick={() => {
                setActionError('');
                setIsLeaveOpen(true);
              }}
            >
              <DoorOpen className="w-4 h-4 mr-1.5 text-zinc-500" /> Leave Group
            </Button>

            {userRole === 'creator' && (
              <Button
                variant="danger"
                size="md"
                className="w-full justify-center"
                onClick={() => {
                  setActionError('');
                  setIsDeleteGroupOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Group
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Logout Card */}
      <Card className="p-4">
        <Button
          variant="danger"
          size="lg"
          className="w-full justify-center"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </Card>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Profile"
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
          {editError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {editError}
            </div>
          )}

          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-1/3"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-2/3"
              isLoading={isSaving}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Leave Group Confirmation Modal */}
      <Modal
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        title="Leave Group?"
        description={`Are you sure you want to leave ${group?.name}?`}
        maxWidth="sm"
      >
        <div className="space-y-4 py-2">
          {actionError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Cannot Leave Group</span>
              </div>
              <p className="font-medium text-red-600 leading-snug">{actionError}</p>
            </div>
          )}

          <p className="text-xs text-zinc-600">
            Note: All your dues must be settled to ₹0.00 before you can leave the group.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="w-1/2"
              onClick={() => setIsLeaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="w-1/2"
              isLoading={actionLoading}
              onClick={handleLeaveGroup}
            >
              Confirm Leave
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Modal */}
      <Modal
        isOpen={isDeleteGroupOpen}
        onClose={() => setIsDeleteGroupOpen(false)}
        title="Delete Group?"
        description={`Permanently delete ${group?.name} and all expense history?`}
        maxWidth="sm"
      >
        <div className="space-y-4 py-2">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {actionError}
            </div>
          )}

          <p className="text-xs text-zinc-600 font-medium">
            This action is permanent and cannot be undone. All expenses, settlements, and member records will be erased.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="w-1/2"
              onClick={() => setIsDeleteGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="w-1/2"
              isLoading={actionLoading}
              onClick={handleDeleteGroup}
            >
              Delete Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
