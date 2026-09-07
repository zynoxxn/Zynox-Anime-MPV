import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { submitEpisodeReport } from '../lib/firestore/community';
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
        details: details.trim(),
      });
      onSuccessToast('Issue reported. Our administrators have been notified!');
      setDetails('');
      onClose();
    } catch (err: any) {
      console.error('Submit report error:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#07111F] border border-white/[0.08] hover:border-[#1683FF]/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Report Stream Issue</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#050A14] p-3 rounded-xl border border-white/5 text-xs text-[#94A3B8]">
          <span className="font-semibold text-white">{animeTitle}</span> &bull; Episode {episodeNumber}
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
              Issue Type *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#1683FF] focus:outline-none transition-colors"
            >
              <option value="video_not_loading">Video Not Loading / Black Screen</option>
              <option value="wrong_episode">Wrong Episode Playing</option>
              <option value="wrong_language">Wrong Audio / Missing Dub</option>
              <option value="poor_quality">Buffering / Poor Video Quality</option>
              <option value="other">Other Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Details (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide any error message or timestamp..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
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
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
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
