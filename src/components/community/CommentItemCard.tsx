import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import type { CommentItem } from '../../types/library';
import {
  toggleCommentLike,
  deleteComment,
  getCommentReplies,
} from '../../lib/firestore/comments';
import { CommentComposer } from './CommentComposer';
import {
  Heart,
  MoreVertical,
  Flag,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  X,
} from 'lucide-react';

interface CommentItemCardProps {
  comment: CommentItem;
  userLiked: boolean;
  blockedUserIds: string[];
  isReply?: boolean;
  onReportClick: (comment: CommentItem) => void;
  onUserBlocked: (blockedUserId: string) => void;
  onCommentDeleted: (commentId: string) => void;
  onShowMessage: (msg: string) => void;
  navigate?: (path: string) => void;
}

export function formatSafeTimestamp(ts: any): { relative: string; full: string } {
  if (!ts) return { relative: 'just now', full: 'Just now' };

  let d: Date | null = null;
  try {
    if (typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (typeof ts === 'object' && ts !== null && typeof ts.seconds === 'number') {
      const nanos = typeof ts.nanoseconds === 'number' ? ts.nanoseconds : 0;
      d = new Date(ts.seconds * 1000 + nanos / 1e6);
    } else if (ts instanceof Date) {
      d = ts;
    } else if (typeof ts === 'number') {
      d = new Date(ts);
    } else if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) d = new Date(parsed);
    }
  } catch {
    d = null;
  }

  if (!d || isNaN(d.getTime())) {
    return { relative: 'just now', full: 'Just now' };
  }

  const full = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return { relative: 'just now', full };
  if (diffSec < 3600) return { relative: `${Math.floor(diffSec / 60)}m ago`, full };
  if (diffSec < 86400) return { relative: `${Math.floor(diffSec / 3600)}h ago`, full };
  if (diffSec < 604800) return { relative: `${Math.floor(diffSec / 86400)}d ago`, full };

  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()] || 'Jan';
  const year = d.getFullYear();
  return { relative: `${day} ${month} ${year}`, full };
}

export const CommentItemCard: React.FC<CommentItemCardProps> = ({
  comment,
  userLiked: initialUserLiked,
  blockedUserIds,
  isReply = false,
  onReportClick,
  onUserBlocked,
  onCommentDeleted,
  onShowMessage,
  navigate,
}) => {
  const { user, isAdmin, isModerator } = useAuth();

  // Like state with optimistic update
  const [liked, setLiked] = useState(initialUserLiked);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Spoiler reveal state
  const [revealedSpoiler, setRevealedSpoiler] = useState(!comment.isSpoiler);

  // Content read more toggle
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Reply state
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesCount, setRepliesCount] = useState(comment.repliesCount || 0);

  // 3-dot menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Periodic tick for relative timestamps (auto-advances "just now", "1m ago"...)
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLiked(initialUserLiked);
  }, [initialUserLiked]);

  const isAuthor = user?.uid === comment.userId;
  const canModerate = isAuthor || isAdmin || isModerator;

  const formattedTime = formatSafeTimestamp(comment.createdAt);

  const handleLikeToggle = async () => {
    if (!user) {
      onShowMessage('Please sign in to like comments.');
      return;
    }
    if (likeLoading) return;

    setLikeLoading(true);
    // Optimistic update
    const nextLiked = !liked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      const res = await toggleCommentLike(
        comment.id!,
        user.uid,
        user.displayName || user.email?.split('@')[0]
      );
      setLiked(res.liked);
      setLikesCount(res.newLikesCount);
    } catch {
      // Revert on error
      setLiked(!nextLiked);
      setLikesCount(likesCount);
      onShowMessage('Failed to update like.');
    } finally {
      setLikeLoading(false);
    }
  };

  const loadReplies = async () => {
    if (repliesLoading) return;
    setRepliesLoading(true);
    try {
      const list = await getCommentReplies(comment.id!, blockedUserIds);
      setReplies(list);
      setRepliesOpen(true);
    } catch {
      onShowMessage('Failed to load replies.');
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (repliesOpen) {
      setRepliesOpen(false);
    } else {
      loadReplies();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(comment.content);
      onShowMessage('Comment copied to clipboard');
    } catch {
      onShowMessage('Failed to copy');
    }
    setMenuOpen(false);
  };

  const handleReport = () => {
    setMenuOpen(false);
    onReportClick(comment);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteComment(comment.id!, comment.parentId);
      onCommentDeleted(comment.id!);
      onShowMessage('Comment deleted.');
    } catch {
      onShowMessage('Failed to delete comment.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const initial = (comment.userName || 'U').charAt(0).toUpperCase();
  const isLong = comment.content.length > 240 || comment.content.split('\n').length > 4;

  return (
    <div className={`py-3.5 sm:py-4 transition-colors ${isReply ? '' : 'border-b border-white/[0.06] last:border-b-0'}`}>
      <div className="flex items-start gap-3 w-full">
        {/* User avatar: 32px for top-level, 24px for replies */}
        <div
          onClick={() => navigate && comment.userId && navigate(`/user/${comment.userId}`)}
          className={`rounded-full overflow-hidden flex items-center justify-center font-bold shrink-0 mt-0.5 cursor-pointer select-none bg-[#1E88FF]/15 border border-[#1E88FF]/30 text-[#1E88FF] ${
            isReply ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
          }`}
        >
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.userName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Line 1: Username + Admin pill + relative time + 3-dot menu */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                onClick={() => navigate && comment.userId && navigate(`/user/${comment.userId}`)}
                className="text-sm font-semibold text-white truncate max-w-[160px] sm:max-w-[280px] hover:underline cursor-pointer"
              >
                {comment.userName}
              </span>

              {/* Admin / Mod pill */}
              {comment.userRole === 'admin' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1E88FF]/20 text-[#1E88FF] font-bold border border-[#1E88FF]/30 shrink-0">
                  Admin
                </span>
              )}
              {comment.userRole === 'moderator' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30 shrink-0">
                  Mod
                </span>
              )}

              {/* Safe relative timestamp with full timestamp in tooltip */}
              <span className="text-xs text-zinc-500 shrink-0" title={formattedTime.full}>
                · {formattedTime.relative}
              </span>
              {comment.isEdited && (
                <span className="text-[10px] text-zinc-500 italic shrink-0">(edited)</span>
              )}
            </div>

            {/* 3-dot menu button (32px tap area) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-8 h-8 -mr-1.5 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Comment options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  {/* Phone Bottom Sheet (<640px) */}
                  <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                    <div className="relative w-full max-w-lg bg-[#0B1324] border-t border-white/10 rounded-t-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom))] space-y-1.5 z-10 animate-in slide-in-from-bottom duration-200">
                      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
                      <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
                        <span className="text-sm font-semibold text-zinc-300">Comment options</span>
                        <button
                          type="button"
                          onClick={() => setMenuOpen(false)}
                          className="p-1 text-zinc-400 hover:text-white rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className="w-full h-11 px-3 text-sm text-zinc-200 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-zinc-400" />
                        <span>Copy text</span>
                      </button>

                      {!isAuthor && user && (
                        <button
                          type="button"
                          onClick={handleReport}
                          className="w-full h-11 px-3 text-sm text-zinc-200 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
                        >
                          <Flag className="w-4 h-4 text-zinc-400" />
                          <span>Report comment</span>
                        </button>
                      )}

                      {canModerate && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full h-11 px-3 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-3 transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete comment</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop Popover (>=640px) */}
                  <div className="hidden sm:block">
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-[#101A30] border border-white/10 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 space-y-0.5">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy text</span>
                      </button>

                      {!isAuthor && user && (
                        <button
                          type="button"
                          onClick={handleReport}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Flag className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Report</span>
                        </button>
                      )}

                      {canModerate && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/15 rounded-lg flex items-center gap-2 transition-colors font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Line 2: Comment Text with Spoilers & 4-line Clamp */}
          <div className="py-0.5">
            {comment.isSpoiler && !revealedSpoiler ? (
              <div
                onClick={() => setRevealedSpoiler(true)}
                className="relative cursor-pointer group rounded-lg overflow-hidden my-1 bg-[#050A14] border border-amber-500/30 p-2.5 transition-colors hover:border-amber-500/50"
              >
                <div className="filter blur-sm select-none opacity-30 text-sm text-zinc-300 pointer-events-none line-clamp-2">
                  {comment.content}
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 bg-black/40 backdrop-blur-[2px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Spoiler – tap to reveal</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {comment.isSpoiler && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Spoiler</span>
                  </span>
                )}
                <p
                  className={`text-sm text-zinc-200 leading-relaxed break-words whitespace-pre-wrap ${
                    !isContentExpanded && isLong ? 'line-clamp-4' : ''
                  }`}
                >
                  {comment.content}
                </p>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    className="text-xs text-[#1E88FF] hover:underline font-medium pt-0.5"
                  >
                    {isContentExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Line 3: Like icon + count, Reply link, View replies toggle */}
          <div className="flex items-center gap-3.5 pt-1">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleLikeToggle}
              className={`inline-flex items-center gap-1.5 text-xs transition-colors active:scale-95 ${
                liked ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-rose-400'
              }`}
              aria-label="Like comment"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform ${
                  liked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            {/* Reply Button */}
            <button
              type="button"
              onClick={() => setShowReplyComposer((prev) => !prev)}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Reply
            </button>

            {/* View Replies Toggle (Only on top-level comments) */}
            {!isReply && (repliesCount > 0 || replies.length > 0) && (
              <button
                type="button"
                onClick={handleToggleReplies}
                className="text-xs font-semibold text-[#1E88FF] hover:underline flex items-center gap-1 transition-colors ml-1"
              >
                {repliesLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : repliesOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {repliesOpen
                    ? 'Hide replies'
                    : `View ${repliesCount || replies.length} ${
                        (repliesCount || replies.length) === 1 ? 'reply' : 'replies'
                      }`}
                </span>
              </button>
            )}
          </div>

          {/* Inline Reply Composer */}
          {showReplyComposer && (
            <div className="pl-6 sm:pl-10 ml-2 border-l border-white/10 mt-3 pt-1">
              <CommentComposer
                targetType={comment.targetType}
                animeId={comment.animeId}
                animeSlug={comment.animeSlug}
                animeTitle={comment.animeTitle}
                episodeId={comment.episodeId}
                episodeNumber={comment.episodeNumber}
                parentId={comment.id}
                replyToUser={comment.userName}
                autoFocus={true}
                placeholder={`Reply to @${comment.userName}...`}
                onCancel={() => setShowReplyComposer(false)}
                onSuccess={(_id, optimisticReply) => {
                  setShowReplyComposer(false);
                  setRepliesCount((prev) => prev + 1);
                  if (optimisticReply) {
                    setReplies((prev) => [...prev, optimisticReply]);
                    setRepliesOpen(true);
                  } else {
                    loadReplies();
                  }
                }}
                onShowMessage={onShowMessage}
                navigate={navigate}
              />
            </div>
          )}

          {/* Nested Replies List (Indented 40px with thin vertical line on left) */}
          {repliesOpen && (
            <div className="pl-6 sm:pl-10 ml-2 border-l border-white/10 space-y-1 mt-3">
              {repliesLoading ? (
                <div className="py-2 text-xs text-zinc-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-[#1E88FF]" />
                  <span>Loading replies...</span>
                </div>
              ) : replies.length === 0 ? (
                <div className="text-xs text-zinc-500 py-1">No replies found.</div>
              ) : (
                replies.map((reply) => (
                  <CommentItemCard
                    key={reply.id}
                    comment={reply}
                    userLiked={false}
                    blockedUserIds={blockedUserIds}
                    isReply={true}
                    onReportClick={onReportClick}
                    onUserBlocked={onUserBlocked}
                    onCommentDeleted={(deletedId) => {
                      setReplies((prev) => prev.filter((r) => r.id !== deletedId));
                      setRepliesCount((prev) => Math.max(0, prev - 1));
                    }}
                    onShowMessage={onShowMessage}
                    navigate={navigate}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Delete comment?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
