import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Copy, Check, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { group, user } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      showToast(`Invite code ${group.inviteCode} copied to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* App Title & Group Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-sm">
            E
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 leading-none">Shared Expense</h1>
            {group ? (
              <p className="text-[11px] font-medium text-zinc-500 mt-0.5">{group.name}</p>
            ) : (
              <p className="text-[11px] font-medium text-zinc-400 mt-0.5">Not in a group</p>
            )}
          </div>
        </div>

        {/* Invite Code Quick Copy */}
        {group && (
          <button
            onClick={copyInviteCode}
            title="Click to copy invite code"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 rounded-xl transition-all active:scale-95 text-xs font-semibold text-zinc-900"
          >
            <span className="text-[10px] uppercase font-bold text-zinc-500">Code:</span>
            <span className="font-mono tracking-wider font-bold">{group.inviteCode}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-500 ml-0.5" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};
