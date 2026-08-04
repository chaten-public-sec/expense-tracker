import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Users, Plus, LogIn, Copy, Check } from 'lucide-react';
import api from '../services/api';

export const NoGroup: React.FC = () => {
  const { user, refreshUserData, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Created Group Code Result Modal state
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/groups', { name: groupName.trim() });
      setCreatedGroupCode(res.data.group.inviteCode);
      showToast(`Group "${res.data.group.name}" created successfully!`, 'success');
      await refreshUserData();
    } catch (err: any) {
      console.error('Create Group Error:', err);
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteCodeInput.trim()) {
      setError('Please enter a 6-character invite code');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/groups/join', { inviteCode: inviteCodeInput.trim() });
      showToast(`Joined group "${res.data.group.name}"!`, 'success');
      await refreshUserData();
      setIsJoinOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Join Group Error:', err);
      setError(err.response?.data?.message || 'Failed to join group. Please check code.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (createdGroupCode) {
      navigator.clipboard.writeText(createdGroupCode);
      setCopied(true);
      showToast('Invite code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const finishCreation = () => {
    setIsCreateOpen(false);
    setCreatedGroupCode(null);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 border border-zinc-200">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              Welcome, {user?.fullName?.split(' ')[0]}!
            </h2>
            <p className="mt-2 text-sm text-zinc-600 font-medium">
              You are not part of any group.
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Create a group for your flatmates or join an existing flat using an invite code.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={() => {
                setError('');
                setGroupName('');
                setIsCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center"
              onClick={() => {
                setError('');
                setInviteCodeInput('');
                setIsJoinOpen(true);
              }}
            >
              <LogIn className="w-4 h-4 mr-2" /> Join Group
            </Button>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <button
              onClick={logout}
              className="text-xs text-zinc-500 hover:text-red-600 font-medium transition-colors"
            >
              Sign out of account
            </button>
          </div>
        </Card>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createdGroupCode) setIsCreateOpen(false);
        }}
        title={createdGroupCode ? "Group Created!" : "Create a New Group"}
        description={createdGroupCode ? "Share this code with your flatmates" : "Give a name to your shared home/flat"}
      >
        {createdGroupCode ? (
          <div className="space-y-5 text-center py-2">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
              <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Group Invite Code</span>
              <div className="text-3xl font-mono font-bold tracking-widest text-zinc-900 select-all">
                {createdGroupCode}
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              className="w-full justify-center"
              onClick={copyCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-600" /> Copied Code
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" /> Copy Invite Code
                </>
              )}
            </Button>

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={finishCreation}
            >
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateGroup} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <Input
              label="Group Name"
              placeholder="e.g. Flat 203 or Green House"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="w-1/2"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="w-1/2"
                isLoading={isLoading}
              >
                Create
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Join Group Modal */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Join Existing Group"
        description="Enter the 6-character invite code provided by your flatmate"
      >
        <form onSubmit={handleJoinGroup} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <Input
            label="Invite Code"
            placeholder="e.g. AB12CD"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono uppercase tracking-widest text-center text-lg font-bold"
            required
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-1/2"
              onClick={() => setIsJoinOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-1/2"
              isLoading={isLoading}
            >
              Join Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
