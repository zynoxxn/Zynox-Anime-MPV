import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { submitEpisodeReport } from '../lib/firestore/community';
import { AdminSelect } from './admin/AdminSelect';
import { sanitizeString } from '../lib/security';
import type { ReportReason } from '../types/library';
import { X, AlertTriangle, Send, AlertCircle, Loader2 } from 'lucide-react';

interface ReportEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: string;
  animeTitle: string;
  episodeId?: string;
  episodeNumber: number;
  onSuccessToast: (msg: string) => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'video_not_loading', label: 'Video Not Loading / Black Screen' },
  { value: 'wrong_episode', label: 'Wrong Episode Playing' },
  { value: 'wrong_language', label: 'Wrong Audio / Missing Dub' },
  { value: 'poor_quality', label: 'Buffering / Poor Video Quality' },
  { value: 'other', label: 'Other Issue' },
];

export const ReportEpisodeModal: React.FC<ReportEpisodeModalProps> = ({
  isOpen,
  onClose,
  animeId,
  animeTitle,
  episodeId,
  episodeNumber,
  onSuccessToast,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('video_not_loading');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await submitEpisodeReport({
        userId: user?.uid,
        userEmail: user?.email || undefined,
        animeId,
        animeTitle,
        episodeId,
        episodeNumber,
        reason,
        details: sanitizeString(details).slice(0, 500),
      });
      onSuccessToast('Issue reported. Our team has been notified.');
      setDetails('');
      onClose();
    } catch (err) {
      console.error('Submit report error:', err);
      setError('Failed to submit report. Please try again.');
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
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="truncate">Report Stream Issue</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 text-[#94A3B8] hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#101A30] p-3 rounded-xl border border-white/10 text-xs text-[#94A3B8] truncate">
          <span className="font-semibold text-white">{animeTitle}</span> &bull; Episode{' '}
          {episodeNumber}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AdminSelect<ReportReason>
            label="Issue Type *"
            value={reason}
            onChange={(val) => setReason(val)}
            options={REPORT_REASONS}
            sheetTitle="Select Issue Type"
          />

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
              Details (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide any error message or timestamp..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
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
                  <span>Send Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
