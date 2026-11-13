import React, { useState, useEffect } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getFriendlyAuthErrorMessage } from '../../lib/auth-errors';

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

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setResetEmailSent(false);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onClose]);

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
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError(
          'This action requires a recent login. Sign out and sign back in, or use the password reset email option below.'
        );
      } else {
        setError(getFriendlyAuthErrorMessage(err?.code || err?.message));
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
      setError(getFriendlyAuthErrorMessage(err?.code || err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close change password modal"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center text-[#1E88FF] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">Change Password</h3>
            <p className="text-xs text-[#94A3B8] truncate">
              Update your password or request a reset link.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetEmailSent ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Reset link sent to your email. Check your inbox and spam folder.</span>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-xs sm:text-sm text-white outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-xs sm:text-sm text-white outline-none transition-colors"
                required
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Password'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-3 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={loading}
            className="text-xs text-[#1E88FF] hover:underline font-semibold cursor-pointer"
          >
            Send reset link to {userEmail || 'my email'}
          </button>
        </div>
      </div>
    </div>
  );
};
