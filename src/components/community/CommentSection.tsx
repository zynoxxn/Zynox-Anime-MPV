import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { getSiteSettings } from '../../lib/firestore/site-settings';
import { ChevronDown, Check, X } from 'lucide-react';

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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_liked', label: 'Top Liked' },
  { value: 'oldest', label: 'Oldest' },
] as const;

type SortOptionValue = (typeof SORT_OPTIONS)[number]['value'];

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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasIntersected, setHasIntersected] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  useEffect(() => {
    getSiteSettings().then((cfg) => {
      if (cfg.enableComments === false || cfg.enableCommunityComments === false) {
        setCommentsEnabled(false);
      }
    });
  }, []);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOptionValue>('newest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(10);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedCommentForReport, setSelectedCommentForReport] = useState<CommentItem | null>(null);

  // Lazy loading observer: only fetch comments when nearing viewport
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setHasIntersected(true);
      return;
    }
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(currentRef);
    return () => observer.disconnect();
  }, []);

  // Fetch comments and user data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      setError(err?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [animeId, targetType, episodeNumber, sortBy, user?.uid]);

  useEffect(() => {
    if (hasIntersected && commentsEnabled) {
      fetchAll();
    } else if (!commentsEnabled) {
      setLoading(false);
    }
  }, [hasIntersected, commentsEnabled, fetchAll]);

  // Lock body scroll on phone when sort dropdown sheet is open
  useEffect(() => {
    if (sortDropdownOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sortDropdownOpen]);

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

  const handleNewCommentAdded = (_id: string, optimisticData?: any) => {
    if (optimisticData) {
      setComments((prev) => [optimisticData, ...prev]);
    } else {
      fetchAll();
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Newest';
  const visibleComments = comments.slice(0, displayLimit);
  const hasMore = comments.length > displayLimit;

  if (!commentsEnabled) {
    return (
      <div
        ref={containerRef}
        className="border-t border-white/[0.08] pt-5 sm:pt-6 px-4 sm:px-6 max-w-[800px] w-full mx-auto"
      >
        <div className="py-6 text-center text-sm text-zinc-400 bg-[#0B1324] border border-white/10 rounded-xl">
          Comments are currently disabled.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border-t border-white/[0.08] pt-5 sm:pt-6 px-4 sm:px-6 max-w-[800px] w-full mx-auto space-y-4"
    >
      {/* 1. Header (One Line): "Comments" + count pill on left, compact sort dropdown on right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white tracking-tight">Comments</h3>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/10 text-zinc-300">
            {comments.length}
          </span>
        </div>

        {/* Custom Sort Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="h-8 px-3 rounded-lg bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-zinc-300 hover:text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            aria-label="Sort comments"
          >
            <span>{currentSortLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
                sortDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {sortDropdownOpen && (
            <>
              {/* Desktop Dropdown (>=640px) */}
              <div
                className="hidden sm:block fixed inset-0 z-20"
                onClick={() => setSortDropdownOpen(false)}
              />
              <div className="hidden sm:block absolute right-0 top-full mt-1.5 w-36 bg-[#101A30] border border-white/10 rounded-xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 space-y-0.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[13px] rounded-lg flex items-center justify-between transition-colors ${
                      sortBy === opt.value
                        ? 'bg-[#1E88FF]/15 text-[#1E88FF] font-semibold'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.value && <Check className="w-3.5 h-3.5 text-[#1E88FF]" />}
                  </button>
                ))}
              </div>

              {/* Phone Bottom Sheet (<640px) */}
              <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="fixed inset-0" onClick={() => setSortDropdownOpen(false)} />
                <div className="relative w-full max-w-lg bg-[#0B1324] border-t border-white/10 rounded-t-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom))] space-y-1.5 z-10 animate-in slide-in-from-bottom duration-200">
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
                    <span className="text-sm font-semibold text-zinc-300">Sort comments by</span>
                    <button
                      type="button"
                      onClick={() => setSortDropdownOpen(false)}
                      className="p-1 text-zinc-400 hover:text-white rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full h-12 px-3 text-sm rounded-xl flex items-center justify-between transition-colors ${
                        sortBy === opt.value
                          ? 'bg-[#1E88FF]/15 text-[#1E88FF] font-semibold'
                          : 'text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Check className="w-4 h-4 text-[#1E88FF]" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Compact Comment Input (expands on focus/tap) */}
      <CommentComposer
        targetType={targetType}
        animeId={animeId}
        animeSlug={animeSlug}
        animeTitle={animeTitle}
        episodeId={episodeId}
        episodeNumber={episodeNumber}
        onSuccess={handleNewCommentAdded}
        onShowMessage={onShowMessage}
        navigate={navigate}
      />

      {/* 3. Comments List / Skeletons / Empty / Error */}
      <div className="pt-1">
        {loading && !comments.length ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-start gap-3 py-3 border-b border-white/[0.04]">
                <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-zinc-400">
            <span>Failed to load comments.</span>
            <button
              type="button"
              onClick={fetchAll}
              className="text-[#1E88FF] hover:underline font-semibold ml-2"
            >
              Retry
            </button>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm">
            No comments yet — be the first!
          </div>
        ) : (
          <div>
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
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 10)}
                  className="h-9 px-5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-colors border border-white/10"
                >
                  Load more comments ({comments.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
