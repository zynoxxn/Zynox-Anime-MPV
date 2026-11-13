import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { submitAnimeRequest } from '../lib/firestore/community';
import { getSiteSettings } from '../lib/firestore/site-settings';
import { sanitizeString } from '../lib/security';
import { X, Send, Film, AlertCircle, Loader2 } from 'lucide-react';

interface RequestAnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

const REQUEST_COOLDOWN_KEY = 'zynox_last_request_ts';
const COOLDOWN_MS = 15_000;

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
  const [requestsEnabled, setRequestsEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    getSiteSettings().then((cfg) => {
      if (cfg.enableRequests === false) {
        setRequestsEnabled(false);
      } else {
        setRequestsEnabled(true);
      }
    });
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!requestsEnabled) {
      setError('Anime requests are currently paused by an administrator.');
      return;
    }

    try {
      const lastTs = Number(localStorage.getItem(REQUEST_COOLDOWN_KEY) || '0');
      const remaining = COOLDOWN_MS - (Date.now() - lastTs);
      if (remaining > 0) {
        setError(`Please wait ${Math.ceil(remaining / 1000)}s before submitting another request.`);
        return;
      }
    } catch {
      // ignore
    }

    const cleanTitle = sanitizeString(animeTitle).slice(0, 120);
    const cleanReason = sanitizeString(reason).slice(0, 120);
    const cleanMsg = sanitizeString(message).slice(0, 500);

    if (!cleanTitle) {
      setError('Please enter the anime title.');
      return;
    }

    try {
      setLoading(true);
      await submitAnimeRequest({
        userId: user?.uid,
        userName: userProfile?.displayName || user?.displayName || 'Guest Viewer',
        userEmail: user?.email || undefined,
        animeTitle: cleanTitle,
        reason: cleanReason || 'Community suggestion',
        message: cleanMsg,
      });
      try {
        localStorage.setItem(REQUEST_COOLDOWN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      onSuccessToast('Anime request submitted successfully! Our team will review it.');
      setAnimeTitle('');
      setReason('');
      setMessage('');
      onClose();
    } catch (err) {
      console.error('Submit request error:', err);
      setError('Failed to submit request. Please try again.');
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
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
            <Film className="w-5 h-5 text-[#1E88FF]" />
            <span>Request an Anime</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 text-[#94A3B8] hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!requestsEnabled ? (
          <div className="p-5 bg-[#101A30] border border-white/10 rounded-xl text-center text-xs sm:text-sm text-[#94A3B8]">
            Community anime requests are temporarily paused by the administrator.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Anime Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Solo Leveling Season 2"
                value={animeTitle}
                onChange={(e) => setAnimeTitle(e.target.value)}
                className="w-full h-10 bg-[#101A30] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder-[#64748B] focus:border-[#1E88FF] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Reason / Request Details
              </label>
              <input
                type="text"
                placeholder="e.g. Hindi Dubbed, Missing episodes"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 bg-[#101A30] border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder-[#64748B] focus:border-[#1E88FF] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Additional Message (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Any specific source or release notes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#101A30] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#64748B] focus:border-[#1E88FF] focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 text-xs font-semibold text-[#94A3B8] hover:text-white bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-5 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
        )}
      </div>
    </div>
  );
};
