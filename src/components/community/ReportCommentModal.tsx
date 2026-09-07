import React, { useState } from 'react';
import type { CommentItem, CommentReportReason } from '../../types/library';
import { reportComment } from '../../lib/firestore/comments';
import { ShieldAlert, X, AlertCircle, Loader2, Check } from 'lucide-react';

interface ReportCommentModalProps {
  isOpen: boolean;
  comment: CommentItem | null;
  currentUserId?: string;
  currentUserName?: string;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

const REPORT_REASONS: { value: CommentReportReason; label: string; description: string }[] = [
  {
    value: 'spoiler',
    label: 'Untagged Spoiler',
    description: 'Contains major plot points, twists, or endings without spoiler tag',
  },
  {
    value: 'harassment',
    label: 'Harassment or Hate Speech',
    description: 'Abusive language, insults, threats, or discrimination',
  },
  {
    value: 'spam',
    label: 'Spam or Advertising',
    description: 'Repetitive messages, external commercial links, or scam links',
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'NSFW content, extreme violence, or unlawful material',
  },
  {
    value: 'other',
    label: 'Other Problem',
    description: 'Any other issue violating community guidelines',
  },
];

export const ReportCommentModal: React.FC<ReportCommentModalProps> = ({
  isOpen,
  comment,
  currentUserId,
  currentUserName,
  onClose,
  onSuccessToast,
}) => {
  const [selectedReason, setSelectedReason] = useState<CommentReportReason>('spoiler');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !comment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      setError('You must be signed in to submit a report.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await reportComment({
        commentId: comment.id!,
        commentContent: comment.content,
        commentAuthorId: comment.userId,
        commentAuthorName: comment.userName,
        targetType: comment.targetType,
        animeId: comment.animeId,
        animeTitle: comment.animeTitle,
        episodeNumber: comment.episodeNumber,
        reporterUserId: currentUserId,
        reporterName: currentUserName || 'User',
        reason: selectedReason,
        details: details.trim(),
      });

      onSuccessToast('Comment reported. Thank you for keeping the community safe.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#171720] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report Comment</h2>
              <p className="text-xs text-zinc-400">Flag comment for moderator review</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment Preview */}
        <div className="bg-[#0B0B12] border border-white/5 rounded-2xl p-3 text-xs">
          <div className="text-[11px] font-semibold text-zinc-400 mb-1">
            Author: <span className="text-white">{comment.userName}</span>
          </div>
          <p className="text-zinc-300 italic line-clamp-3">&quot;{comment.content}&quot;</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Select Reason
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  onClick={() => setSelectedReason(r.value)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === r.value
                      ? 'bg-rose-500/10 border-rose-500/40 text-white'
                      : 'bg-[#0B0B12] border-white/5 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedReason === r.value
                        ? 'border-rose-400 bg-rose-500 text-white'
                        : 'border-zinc-500'
                    }`}
                  >
                    {selectedReason === r.value && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{r.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context for moderators..."
              className="w-full bg-[#0B0B12] border border-white/10 focus:border-rose-500/50 rounded-xl p-3 text-white text-xs outline-none transition-colors resize-none placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Report</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
