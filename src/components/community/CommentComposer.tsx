import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { createComment } from '../../lib/firestore/comments';
import { AlertTriangle, Loader2, User as UserIcon } from 'lucide-react';

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
  onSuccess: (newCommentId: string, optimisticData?: any) => void;
  onCancel?: () => void;
  onShowMessage: (msg: string) => void;
  navigate?: (path: string) => void;
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
  placeholder = 'Add a comment...',
  autoFocus = false,
  onSuccess,
  onCancel,
  onShowMessage,
  navigate,
}) => {
  const { user, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isExpanded, setIsExpanded] = useState(Boolean(parentId || autoFocus));
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Auto-grow textarea height (min 2 lines ~56px, max 6 lines ~160px)
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 56), 160);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [content, isExpanded]);

  // Handle unauthenticated user state
  if (!user) {
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-500 shrink-0">
          <UserIcon className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="h-11 px-4 rounded-[22px] bg-[#0B1324] border border-white/10 flex items-center justify-between flex-1 gap-2">
          <span className="text-zinc-400 text-xs sm:text-sm truncate">Login to comment</span>
          <button
            type="button"
            onClick={() => {
              if (navigate) navigate('/login');
              else window.location.assign('/login');
            }}
            className="h-7 px-3 bg-[#1E88FF] hover:bg-[#1570d8] text-white text-xs font-semibold rounded-full transition-colors shrink-0"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Account commenting restricted state
  if (userProfile?.commentingRestricted) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
        <span className="leading-tight">
          <strong className="font-semibold">Commenting Restricted:</strong> Account is temporarily restricted from commenting.
        </span>
      </div>
    );
  }

  const maxLength = 500;
  const remaining = maxLength - content.length;
  const isOverLimit = remaining < 0;
  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && !isOverLimit && !submitting && cooldownSeconds === 0;

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleCancel = () => {
    setContent('');
    setIsSpoiler(false);
    if (!parentId) {
      setIsExpanded(false);
    }
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Basic sanitization
    const cleanContent = trimmed.replace(/<[^>]*>?/gm, '');
    if (!cleanContent) return;

    setSubmitting(true);
    const authorName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'User';
    const authorAvatar = userProfile?.avatar || user.photoURL || '';
    const rawRole = userProfile?.role;
    const authorRole: 'admin' | 'moderator' | 'user' =
      rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'super_admin'
        ? 'admin'
        : rawRole === 'moderator'
        ? 'moderator'
        : 'user';

    try {
      const commentId = await createComment({
        targetType,
        animeId,
        animeSlug,
        animeTitle,
        episodeId,
        episodeNumber,
        userId: user.uid,
        userName: authorName,
        userAvatar: authorAvatar,
        userRole: authorRole,
        content: cleanContent,
        isSpoiler,
        parentId: parentId || null,
        replyToUser: replyToUser || '',
      });

      setContent('');
      setIsSpoiler(false);
      setCooldownSeconds(5); // 5-second anti-spam cooldown

      if (!parentId) {
        setIsExpanded(false);
      }

      onShowMessage(parentId ? 'Reply posted!' : 'Comment posted!');
      onSuccess(commentId, {
        id: commentId,
        targetType,
        animeId,
        animeSlug,
        animeTitle,
        episodeId,
        episodeNumber,
        userId: user.uid,
        userName: authorName,
        userAvatar: authorAvatar,
        userRole: authorRole,
        content: cleanContent,
        isSpoiler,
        parentId: parentId || null,
        replyToUser: replyToUser || '',
        likesCount: 0,
        repliesCount: 0,
        createdAt: new Date(),
      });
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = userProfile?.displayName || user.displayName || 'You';
  const avatarUrl = userProfile?.avatar || user.photoURL;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-start gap-3 w-full">
        {/* User avatar - 32px */}
        <div className="w-8 h-8 rounded-full bg-[#1E88FF]/15 border border-[#1E88FF]/30 overflow-hidden flex items-center justify-center text-[#1E88FF] text-xs font-bold shrink-0 mt-0.5 select-none">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Input Container: Collapsed or Expanded */}
        {!isExpanded && !parentId ? (
          <div
            onClick={handleExpand}
            className="h-11 px-4 rounded-[22px] bg-[#0B1324] hover:bg-[#101A30] border border-white/10 hover:border-white/20 text-zinc-400 text-sm flex items-center cursor-pointer flex-1 transition-colors select-none"
          >
            {placeholder}
          </div>
        ) : (
          <div className="flex-1 space-y-2.5 transition-all duration-150 min-w-0">
            {replyToUser && (
              <div className="text-[11px] text-[#1E88FF] font-medium flex items-center gap-1">
                <span>Replying to</span>
                <span className="font-semibold">@{replyToUser}</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              autoFocus={autoFocus || isExpanded}
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-xl p-3 text-white text-sm outline-none transition-colors resize-none placeholder:text-zinc-500 min-h-[56px] max-h-[160px] leading-relaxed"
            />

            {/* Action Row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Left: Spoiler Toggle & Character Counter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpoiler(!isSpoiler)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors select-none ${
                    isSpoiler
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'
                  }`}
                  title="Mark as spoiler"
                >
                  <AlertTriangle className={`w-3.5 h-3.5 ${isSpoiler ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span>Spoiler</span>
                </button>

                {content.length > 0 && (
                  <span
                    className={`text-[11px] font-mono ${
                      isOverLimit
                        ? 'text-rose-400 font-bold'
                        : remaining <= 50
                        ? 'text-amber-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {content.length}/{maxLength}
                  </span>
                )}
              </div>

              {/* Right: Cancel and Post Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="h-9 px-3 text-xs text-zinc-400 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-9 px-4 bg-[#1E88FF] hover:bg-[#1570d8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <span>Wait {cooldownSeconds}s</span>
                  ) : (
                    <span>{parentId ? 'Reply' : 'Post'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};
