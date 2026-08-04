import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { Settlement, OwedPerson } from '../../types';
import { ShieldCheck, Clock, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Mode 1: Initiating payment to receiver
  targetPerson?: OwedPerson | null;
  // Mode 2: Verifying payment OTP as receiver
  pendingSettlement?: Settlement | null;
  onSettlementUpdated: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  targetPerson,
  pendingSettlement,
  onSettlementUpdated
}) => {
  const { showToast } = useToast();

  // Initiator (Payer) state
  const [confirmStep, setConfirmStep] = useState(true);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);

  // Receiver OTP entry state
  const [otpInput, setOtpInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Timer countdown for active OTP
  useEffect(() => {
    let interval: any = null;
    if (expiresAt) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [expiresAt]);

  useEffect(() => {
    if (isOpen) {
      setConfirmStep(true);
      setGeneratedOtp(null);
      setExpiresAt(null);
      setOtpInput('');
      setError('');
    }
  }, [isOpen, targetPerson, pendingSettlement]);

  // Handle Payer initiating payment
  const handleInitiatePayment = async () => {
    if (!targetPerson) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await api.post('/settlements', {
        receiverId: targetPerson.user._id,
        amount: targetPerson.amount
      });

      setGeneratedOtp(res.data.otp);
      setExpiresAt(res.data.expiresAt);
      setConfirmStep(false);
      showToast('Payment initiated! Show OTP to receiver.', 'info');
      onSettlementUpdated();
    } catch (err: any) {
      console.error('Initiate Payment Error:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment settlement');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Receiver verifying OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSettlement) return;

    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const res = await api.post(`/settlements/${pendingSettlement._id}/verify`, {
        otp: otpInput.trim()
      });

      showToast('Payment verified successfully!', 'success');
      onSettlementUpdated();
      onClose();
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      setError(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Payer Initiation View
  if (targetPerson) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={confirmStep ? "Confirm Payment Settlement" : "Show OTP to Receiver"}
        description={confirmStep ? `Confirm payment of ₹${targetPerson.amount} to ${targetPerson.user.fullName}` : "Verification Pending"}
        maxWidth="sm"
      >
        {confirmStep ? (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Paying To</span>
              <h4 className="text-lg font-bold text-zinc-900">{targetPerson.user.fullName}</h4>
              <div className="text-2xl font-extrabold text-zinc-900 mt-1">₹{targetPerson.amount}</div>
            </div>

            <p className="text-xs text-zinc-600 font-medium">
              Have you completed the payment? Clicking "Yes" will generate a 6-digit OTP for the receiver to verify.
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="w-1/2"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="w-1/2"
                isLoading={isLoading}
                onClick={handleInitiatePayment}
              >
                Yes, Generate OTP
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2 text-center">
            <div className="p-5 bg-zinc-900 text-white rounded-2xl space-y-3 shadow-card">
              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-emerald-400" /> Show this OTP to receiver
              </div>
              <div className="text-4xl font-mono font-extrabold tracking-widest text-white select-all">
                {generatedOtp}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" /> Valid for: {formatSeconds(timeLeft)}
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Tell <strong className="text-zinc-900">{targetPerson.user.fullName}</strong> to enter this OTP on their dashboard under "Pending Verification".
            </p>

            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={onClose}
            >
              Done / Close
            </Button>
          </div>
        )}
      </Modal>
    );
  }

  // Render Receiver Verification View
  if (pendingSettlement) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Verify Payment OTP"
        description={`Enter 6-digit OTP provided by ${pendingSettlement.payer.fullName}`}
        maxWidth="sm"
      >
        <form onSubmit={handleVerifyOtp} className="space-y-4 py-2">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-center space-y-1">
            <span className="text-xs text-zinc-500 font-medium">Amount Received</span>
            <div className="text-2xl font-bold text-zinc-900">₹{pendingSettlement.amount}</div>
            <p className="text-xs text-zinc-600">From: <strong className="text-zinc-900">{pendingSettlement.payer.fullName}</strong></p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <Input
            label="6-Digit OTP"
            placeholder="000000"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={6}
            className="font-mono text-center text-xl tracking-widest font-bold"
            autoFocus
            required
          />

          <div className="flex gap-2 pt-2">
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
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Verify Payment
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return null;
};
