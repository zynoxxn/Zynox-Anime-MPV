import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  onShowMessage: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onShowMessage,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!auth.currentUser) {
      setError('You must be signed in to update your password.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      onShowMessage('Password updated successfully!');
      onClose();
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('This operation requires recent authentication. Please sign out and sign back in, or use the password reset link below.');
      } else {
        setError(err.message || 'Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userEmail) {
      setError('No email found for current user.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, userEmail);
      setResetEmailSent(true);
      onShowMessage(`Password reset link sent to ${userEmail}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#081426] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1683FF]/20 border border-[#1683FF]/40 flex items-center justify-center text-[#00CFFF]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Change Password</h3>
            <p className="text-xs text-[#94A3B8]">Update your account password or receive a reset link.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetEmailSent ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Reset link sent to your email. Check your inbox and spam folder.</span>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] outline-none transition-colors"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold transition-all shadow-lg shadow-[#1683FF]/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Password'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-3 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={loading}
            className="text-xs text-[#00CFFF] hover:underline font-semibold"
          >
            Or send a password reset link to {userEmail || 'my email'}
          </button>
        </div>
      </div>
    </div>
  );
};
