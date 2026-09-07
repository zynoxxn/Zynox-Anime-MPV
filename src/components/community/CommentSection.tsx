import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import type { CommentItem } from '../../types/library';
import {
  getComments,
  getUserLikedCommentIds,
  getUserBlocks,
} from '../../lib/firestore/comments';
import { CommentComposer } from './CommentComposer';
import { CommentItemCard } from './CommentItemCard';
import { ReportCommentModal } from './ReportCommentModal';
import {
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Clock,
  Heart,
  TrendingUp,
} from 'lucide-react';

interface CommentSectionProps {
  targetType: 'anime' | 'episode';
  animeId: string;
  animeSlug?: string;
  animeTitle?: string;
  episodeId?: string;
  episodeNumber?: number;
  onShowMessage: (msg: string) => void;
  navigate?: (path: string) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  targetType,
  animeId,
  animeSlug,
  animeTitle,
  episodeId,
  episodeNumber,
  onShowMessage,
  navigate,
}) => {
  const { user } = useAuth();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'most_liked' | 'oldest'>('newest');
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(10);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedCommentForReport, setSelectedCommentForReport] = useState<CommentItem | null>(null);

  // Fetch comments and blocked users
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      let blocks: string[] = [];
      let likes = new Set<string>();

      if (user?.uid) {
        const [blocksList, likesSet] = await Promise.all([
          getUserBlocks(user.uid),
          getUserLikedCommentIds(user.uid),
        ]);
        blocks = blocksList.map((b) => b.blockedUserId);
        likes = likesSet;
      }

      setBlockedUserIds(blocks);
      setLikedCommentIds(likes);

      const items = await getComments({
        targetType,
        animeId,
        episodeNumber,
        sortBy,
        blockedUserIds: blocks,
      });

      setComments(items);
    } catch (err) {
      console.warn('Failed to load comment discussions:', err);
    } finally {
      setLoading(false);
    }
  }, [animeId, targetType, episodeNumber, sortBy, user?.uid]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleReportClick = (comment: CommentItem) => {
    setSelectedCommentForReport(comment);
    setReportModalOpen(true);
  };

  const handleUserBlocked = (blockedUid: string) => {
    setBlockedUserIds((prev) => [...prev, blockedUid]);
    setComments((prev) => prev.filter((c) => c.userId !== blockedUid));
  };

  const handleCommentDeleted = (deletedId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== deletedId));
  };

  const handleNewCommentAdded = () => {
    fetchAll();
  };

  const visibleComments = comments.slice(0, displayLimit);
  const hasMore = comments.length > displayLimit;

  return (
    <div className="space-y-6">
      {/* Section Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1683FF]/20 border border-[#1683FF]/40 flex items-center justify-center text-[#1683FF]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{targetType === 'episode' ? `Episode ${episodeNumber} Discussion` : 'Community Comments'}</span>
              <span className="px-2 py-0.5 bg-white/10 text-zinc-300 text-xs rounded-full font-mono">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Share your thoughts, episode reactions, and theories
            </p>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="flex items-center bg-[#050A14] border border-white/10 p-1 rounded-xl text-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              sortBy === 'newest'
                ? 'bg-[#1683FF] text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Newest</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('most_liked')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              sortBy === 'most_liked'
                ? 'bg-[#1683FF] text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>Top Liked</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('oldest')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              sortBy === 'oldest'
                ? 'bg-[#1683FF] text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Oldest</span>
          </button>
        </div>
      </div>

      {/* Main Comment Composer */}
      <CommentComposer
        targetType={targetType}
        animeId={animeId}
        animeSlug={animeSlug}
        animeTitle={animeTitle}
        episodeId={episodeId}
        episodeNumber={episodeNumber}
        onSuccess={handleNewCommentAdded}
        onShowMessage={onShowMessage}
      />

      {/* Comments List Feed */}
      {loading ? (
        <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#1683FF]" />
          <span className="text-xs">Loading community discussions...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-[#050A14]/70 border border-white/5 rounded-2xl p-8 text-center space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-zinc-600" />
          <div className="text-sm font-bold text-white">No comments yet</div>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Be the first to start the conversation on this {targetType === 'episode' ? 'episode' : 'anime'}!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleComments.map((comment) => (
            <CommentItemCard
              key={comment.id}
              comment={comment}
              userLiked={likedCommentIds.has(comment.id!)}
              blockedUserIds={blockedUserIds}
              onReportClick={handleReportClick}
              onUserBlocked={handleUserBlocked}
              onCommentDeleted={handleCommentDeleted}
              onShowMessage={onShowMessage}
              navigate={navigate}
            />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + 10)}
                className="px-6 py-2.5 bg-[#050A14] hover:bg-[#0D1B2E] border border-white/10 hover:border-[#1683FF]/40 text-xs font-bold text-white rounded-xl transition-all shadow-md"
              >
                Load More Comments ({comments.length - displayLimit} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      <ReportCommentModal
        isOpen={reportModalOpen}
        comment={selectedCommentForReport}
        currentUserId={user?.uid}
        currentUserName={user?.displayName || user?.email?.split('@')[0]}
        onClose={() => setReportModalOpen(false)}
        onSuccessToast={onShowMessage}
      />
    </div>
  );
};
