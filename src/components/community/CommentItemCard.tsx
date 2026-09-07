import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import type { CommentItem } from '../../types/library';
import {
  toggleCommentLike,
  deleteComment,
  editComment,
  getCommentReplies,
  blockUser,
} from '../../lib/firestore/comments';
import { CommentComposer } from './CommentComposer';
import { UserBadgePill } from './UserBadgePill';
import { ALL_BADGES } from '../../lib/badges';
import {
  Heart,
  MessageSquare,
  MoreVertical,
  Flag,
  UserX,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface CommentItemCardProps {
  comment: CommentItem;
  userLiked: boolean;
  blockedUserIds: string[];
  onReportClick: (comment: CommentItem) => void;
  onUserBlocked: (blockedUserId: string) => void;
  onCommentDeleted: (commentId: string) => void;
  onShowMessage: (msg: string) => void;
  navigate?: (path: string) => void;
}

export const CommentItemCard: React.FC<CommentItemCardProps> = ({
  comment,
  userLiked: initialUserLiked,
  blockedUserIds,
  onReportClick,
  onUserBlocked,
  onCommentDeleted,
  onShowMessage,
  navigate,
}) => {
  const { user, isAdmin, isModerator } = useAuth();

  // Local like state
  const [liked, setLiked] = useState(initialUserLiked);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Spoiler reveal state
  const [revealedSpoiler, setRevealedSpoiler] = useState(!comment.isSpoiler);

  // Reply state
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesCount, setRepliesCount] = useState(comment.repliesCount || 0);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editIsSpoiler, setEditIsSpoiler] = useState(comment.isSpoiler);
  const [editSaving, setEditSaving] = useState(false);

  // Dropdown menu state
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLiked(initialUserLiked);
  }, [initialUserLiked]);

  const isAuthor = user?.uid === comment.userId;
  const canModerate = isAuthor || isAdmin || isModerator;

  // Format relative timestamp
  const formatTime = (ts: any) => {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleLikeToggle = async () => {
    if (!user) {
      onShowMessage('Please sign in to like comments.');
      return;
    }
    if (likeLoading) return;

    setLikeLoading(true);
    // Optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await toggleCommentLike(
        comment.id!,
        user.uid,
        user.displayName || user.email?.split('@')[0]
      );
      setLiked(res.liked);
      setLikesCount(res.newLikesCount);
    } catch (err: any) {
      // Revert on error
      setLiked(!nextLiked);
      setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
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
    } catch (err) {
      console.warn('Failed to load replies:', err);
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

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setEditSaving(true);
    try {
      await editComment(comment.id!, editContent.trim(), editIsSpoiler);
      comment.content = editContent.trim();
      comment.isSpoiler = editIsSpoiler;
      comment.isEdited = true;
      setIsEditing(false);
      onShowMessage('Comment updated!');
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to edit comment.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteComment(comment.id!, comment.parentId);
      onCommentDeleted(comment.id!);
      onShowMessage('Comment deleted.');
    } catch (err: any) {
      onShowMessage('Failed to delete comment.');
    }
  };

  const handleBlockUser = async () => {
    if (!user) return;
    if (comment.userId === user.uid) {
      onShowMessage('You cannot block yourself.');
      return;
    }
    if (
      !window.confirm(
        `Block @${comment.userName}? You won't see their comments or replies in discussions.`
      )
    ) {
      return;
    }

    try {
      await blockUser(user.uid, comment.userId, comment.userName);
      onUserBlocked(comment.userId);
      onShowMessage(`Blocked @${comment.userName}.`);
      setMenuOpen(false);
    } catch (err: any) {
      onShowMessage('Failed to block user.');
    }
  };

  const initial = (comment.userName || 'U').charAt(0).toUpperCase();

  return (
    <div className="group bg-[#07111F] border border-white/[0.06] hover:border-[#1683FF]/30 rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all">
      {/* Header Row: User Info, Badges, Dropdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            onClick={() => navigate && comment.userId && navigate(`/user/${comment.userId}`)}
            className="w-8 h-8 rounded-full bg-[#1683FF]/20 border border-[#1683FF]/40 overflow-hidden flex items-center justify-center text-[#00CFFF] text-xs font-bold shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
            {comment.userAvatar ? (
              <img
                src={comment.userAvatar}
                alt={comment.userName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              onClick={() => navigate && comment.userId && navigate(`/user/${comment.userId}`)}
              className="text-xs font-bold text-white truncate cursor-pointer hover:text-[#00CFFF] transition-colors"
            >
              {comment.userName}
            </span>

            {/* Role Badge */}
            {comment.userRole === 'admin' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-[#1683FF]/20 border border-[#1683FF]/40 rounded text-[9px] text-[#00CFFF] font-bold">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Admin</span>
              </span>
            )}
            {comment.userRole === 'moderator' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-500/20 border border-blue-500/40 rounded text-[9px] text-blue-400 font-bold">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Mod</span>
              </span>
            )}

            <span className="text-[10px] text-zinc-500">• {formatTime(comment.createdAt)}</span>
            {comment.isEdited && (
              <span className="text-[9px] text-zinc-500 italic">(edited)</span>
            )}
          </div>
        </div>

        {/* Options Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-44 bg-[#081426] border border-white/15 rounded-xl shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 space-y-0.5"
              onClick={() => setMenuOpen(false)}
            >
              {isAuthor && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Comment</span>
                </button>
              )}

              {canModerate && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/15 rounded-lg flex items-center gap-2 transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Comment</span>
                </button>
              )}

              {!isAuthor && user && (
                <>
                  <button
                    type="button"
                    onClick={() => onReportClick(comment)}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-400" />
                    <span>Report Comment</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBlockUser}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Block @{comment.userName}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Body: Edit Mode or Standard Display */}
      {isEditing ? (
        <div className="space-y-2 bg-[#050A14] p-3 rounded-xl border border-white/10">
          <textarea
            rows={2}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-[#07111F] border border-white/10 focus:border-[#1683FF] rounded-lg p-2 text-white text-xs outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsSpoiler}
                onChange={(e) => setEditIsSpoiler(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-[#1683FF]"
              />
              <span>Spoiler Tag</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving || !editContent.trim()}
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {comment.isSpoiler && !revealedSpoiler ? (
            <div
              onClick={() => setRevealedSpoiler(true)}
              className="bg-[#050A14]/90 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Spoiler Warning: Tap to reveal content</span>
              </div>
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
          ) : (
            <div className="space-y-1">
              {comment.isSpoiler && (
                <div className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Spoiler Tagged</span>
                </div>
              )}
              <p className="text-xs text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Footer: Like Button, Reply Button, Show Replies Counter */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeToggle}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
              liked
                ? 'text-rose-500 bg-rose-500/10 font-bold'
                : 'text-zinc-400 hover:text-rose-400 hover:bg-white/5'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>

          {/* Reply Button */}
          <button
            type="button"
            onClick={() => setShowReplyComposer((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>

        {/* Collapsible Replies Trigger */}
        {(repliesCount > 0 || replies.length > 0) && (
          <button
            type="button"
            onClick={handleToggleReplies}
            className="text-[11px] font-semibold text-[#00CFFF] hover:underline flex items-center gap-1"
          >
            {repliesLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : repliesOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>
              {repliesOpen ? 'Hide replies' : `${repliesCount || replies.length} replies`}
            </span>
          </button>
        )}
      </div>

      {/* Inline Reply Composer */}
      {showReplyComposer && (
        <div className="pt-2 pl-4 border-l-2 border-[#1683FF]/30">
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
            onCancel={() => setShowReplyComposer(false)}
            onSuccess={() => {
              setShowReplyComposer(false);
              setRepliesCount((prev) => prev + 1);
              loadReplies();
            }}
            onShowMessage={onShowMessage}
          />
        </div>
      )}

      {/* Nested Replies List */}
      {repliesOpen && (
        <div className="pt-2 pl-4 sm:pl-6 border-l-2 border-white/10 space-y-2.5">
          {repliesLoading ? (
            <div className="py-2 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-[#1683FF]" />
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
  );
};
