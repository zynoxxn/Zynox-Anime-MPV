import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { submitAnimeRequest } from '../lib/firestore/community';
import { X, Send, Film, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface RequestAnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export const RequestAnimeModal: React.FC<RequestAnimeModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { user, userProfile } = useAuth();
  const [animeTitle, setAnimeTitle] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeTitle.trim()) {
      setError('Please enter the anime title.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await submitAnimeRequest({
        userId: user?.uid,
        userName: userProfile?.displayName || user?.displayName || 'Guest Viewer',
        userEmail: user?.email || undefined,
        animeTitle: animeTitle.trim(),
        reason: reason.trim() || 'Community suggestion',
        message: message.trim(),
      });
      onSuccessToast('Anime request submitted successfully! Our team will review it.');
      setAnimeTitle('');
      setReason('');
      setMessage('');
      onClose();
    } catch (err: any) {
      console.error('Submit request error:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#07111F] border border-white/[0.08] hover:border-[#1683FF]/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Film className="w-5 h-5 text-[#00CFFF]" />
            <span>Request an Anime</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Anime Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Solo Leveling Season 2, Demon Slayer..."
              value={animeTitle}
              onChange={(e) => setAnimeTitle(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#1683FF] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Reason / Request Details
            </label>
            <input
              type="text"
              placeholder="e.g. Hindi Dubbed, Missing episodes, 1080p stream"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#1683FF] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Additional Message (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Any specific video source or information..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#1683FF] focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-white bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-[#1683FF]/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
