import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Settlement } from '../types';
import { ShieldCheck, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import api from '../services/api';

export const Settlements: React.FC = () => {
  const { showToast } = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettlements = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settlements');
      setSettlements(res.data || []);
    } catch (err: any) {
      console.error('Fetch Settlements Error:', err);
      showToast('Failed to load settlement history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24 animate-fade-in">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Settlement History</h2>
        <p className="text-xs text-zinc-500 font-medium">OTP verified payment records</p>
      </div>

      {/* Settlements List */}
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : settlements.length > 0 ? (
        <div className="space-y-2.5">
          {settlements.map((s) => (
            <Card key={s._id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <span>{s.payer?.fullName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{s.receiver?.fullName}</span>
                </div>
                <span className="text-base font-extrabold text-zinc-900">₹{s.amount}</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                <span className="text-[11px] text-zinc-400 font-medium">
                  {formatDate(s.createdAt)}
                </span>

                {s.status === 'completed' && (
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </Badge>
                )}

                {s.status === 'verification_pending' && (
                  <Badge variant="warning" className="gap-1">
                    <Clock className="w-3 h-3" /> Pending OTP
                  </Badge>
                )}

                {s.status === 'expired' && (
                  <Badge variant="danger" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Expired
                  </Badge>
                )}

                {s.status === 'cancelled' && (
                  <Badge variant="outline">
                    Cancelled
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-zinc-400 text-xs font-medium space-y-2">
          <ShieldCheck className="w-8 h-8 mx-auto text-zinc-300" />
          <p>No payment settlements recorded yet.</p>
        </Card>
      )}
    </div>
  );
};
