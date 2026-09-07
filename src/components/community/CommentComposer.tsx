import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { createComment } from '../../lib/firestore/comments';
import { Send, AlertTriangle, Loader2, Sparkles, LogIn } from 'lucide-react';

interface CommentComposerProps {
  targetType: 'anime' | 'episode';
  animeId: string;
  animeSlug?: string;
  animeTitle?: string;
  episodeId?: string;
  episodeNumber?: number;
  parentId?: string | null;
  replyToUser?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess: (newCommentId: string) => void;
  onCancel?: () => void;
  onShowMessage: (msg: string) => void;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
  targetType,
  animeId,
  animeSlug,
  animeTitle,
  episodeId,
  episodeNumber,
  parentId,
  replyToUser,
  placeholder = 'Join the discussion... (Keep it friendly, tag spoilers)',
  autoFocus = false,
  onSuccess,
  onCancel,
  onShowMessage,
}) => {
  const { user, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (!user) {
    return (
      <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-zinc-300 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-[#00CFFF]" />
          <span>Sign in to participate in the anime discussion</span>
        </div>
        <p className="text-[11px] text-[#94A3B8]">
          Share your reactions, theories, and connect with anime fans worldwide.
        </p>
      </div>
    );
  }

  // If user is commenting-restricted by admin
  if (userProfile?.commentingRestricted) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-300 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
        <div>
          <span className="font-bold">Commenting Restricted:</span> Your account has been temporarily restricted from posting comments due to community guideline violations.
        </div>
      </div>
    );
  }

  const maxLength = 500;
  const remaining = maxLength - content.length;
  const isOverLimit = remaining < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !submitting && cooldownSeconds === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const commentId = await createComment({
        targetType,
        animeId,
        animeSlug,
        animeTitle,
        episodeId,
        episodeNumber,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'User',
        userAvatar: userProfile?.avatar || user.photoURL || '',
        userRole: userProfile?.role || 'user',
        content: content.trim(),
        isSpoiler,
        parentId: parentId || null,
        replyToUser: replyToUser || '',
      });

      setContent('');
      setIsSpoiler(false);
      setCooldownSeconds(5); // 5-second anti-spam cooldown
      onShowMessage(parentId ? 'Reply posted!' : 'Comment posted!');
      onSuccess(commentId);
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = userProfile?.displayName || user.displayName || 'You';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-[#07111F] border ${
        parentId ? 'border-white/10' : 'border-white/[0.08] shadow-xl'
      } rounded-2xl p-3 sm:p-4 space-y-3 transition-all`}
    >
      <div className="flex gap-3">
        {/* User avatar badge */}
        <div className="w-8 h-8 rounded-full bg-[#1683FF]/20 border border-[#1683FF]/40 overflow-hidden flex items-center justify-center text-[#00CFFF] text-xs font-bold shrink-0">
          {userProfile?.avatar || user.photoURL ? (
            <img
              src={userProfile?.avatar || user.photoURL || ''}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            initial
          )}
        </div>

        {/* Text Input area */}
        <div className="flex-1 space-y-2">
          {replyToUser && (
            <div className="text-[11px] text-[#00CFFF] font-medium flex items-center gap-1">
              <span>Replying to</span>
              <span className="font-bold">@{replyToUser}</span>
            </div>
          )}

          <textarea
            autoFocus={autoFocus}
            rows={parentId ? 2 : 3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl p-3 text-white text-xs outline-none transition-colors resize-none placeholder:text-zinc-500"
          />

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Spoiler Toggle Checkbox */}
            <label className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-[#1683FF] focus:ring-0 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1 font-medium">
                <AlertTriangle className={`w-3.5 h-3.5 ${isSpoiler ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>Mark as Spoiler</span>
              </span>
            </label>

            {/* Counter & Action Buttons */}
            <div className="flex items-center gap-3 ml-auto">
              <span
                className={`text-[10px] font-mono ${
                  isOverLimit ? 'text-rose-400 font-bold' : remaining <= 50 ? 'text-amber-400' : 'text-zinc-500'
                }`}
              >
                {content.length}/{maxLength}
              </span>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-1.5 bg-[#1683FF] hover:bg-[#2196FF] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-[#1683FF]/20 flex items-center gap-1.5 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <span>Wait {cooldownSeconds}s</span>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>{parentId ? 'Reply' : 'Post'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
