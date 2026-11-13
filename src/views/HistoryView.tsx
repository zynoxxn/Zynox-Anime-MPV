import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import type { WatchHistoryItem } from '../types/library';
import {
  getWatchHistory,
  removeWatchHistoryItem,
  clearWatchHistory,
} from '../lib/firestore/user-activity';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import { History, Trash2, Play, Clock } from 'lucide-react';

interface HistoryViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

export const HistoryView: React.FC<HistoryViewProps> = ({ navigate, onShowMessage }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  usePageSeo({
    title: 'Watch History | ZYNOX ANIME',
    description: 'Recently watched anime episodes and resume checkpoints.',
  });

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getWatchHistory(user?.uid || null);
      setHistory(items);
    } catch (err) {
      console.error('History fetch error:', err);
      setError('Failed to load your watch history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRemove = async (animeId: string, episodeNumber: number) => {
    await removeWatchHistoryItem(user?.uid || null, animeId, episodeNumber);
    setHistory((prev) =>
      prev.filter((h) => !(h.animeId === animeId && h.episodeNumber === episodeNumber))
    );
    onShowMessage?.('Removed episode from watch history.');
  };

  const handleConfirmClearAll = async () => {
    try {
      await clearWatchHistory(user?.uid || null);
      setHistory([]);
      setShowClearModal(false);
      onShowMessage?.('Watch history cleared.');
    } catch (err) {
      console.error('Failed to clear watch history:', err);
      onShowMessage?.('Failed to clear history. Please try again.');
    }
  };

  const formatDate = (dateVal: any) => {
    try {
      if (!dateVal) return '';
      const d =
        typeof dateVal === 'string'
          ? new Date(dateVal)
          : dateVal?.toDate
          ? dateVal.toDate()
          : new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <History className="w-6 h-6 sm:w-7 sm:h-7 text-[#1E88FF] shrink-0" />
            <span className="truncate">Watch History</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Recently watched episodes and playback checkpoints.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="h-10 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse p-3.5 flex items-center gap-4"
            >
              <div className="w-16 h-full rounded-xl bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-white/5 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
                <div className="h-3 w-1/3 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load History"
          message={error}
          onRetry={fetchHistory}
        />
      ) : history.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-7 h-7 text-[#1E88FF]" />}
          title="No watch history yet"
          description="Episodes you watch will be saved here so you can resume where you left off."
          actionLabel="Browse Anime"
          onAction={() => navigate('/browse')}
        />
      ) : (
        <div className="space-y-2.5">
          {history.map((item) => {
            const watchedLabel = formatDate(item.watchedAt);
            return (
              <div
                key={`${item.animeId}-ep${item.episodeNumber}`}
                className="group bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`);
                      }
                    }}
                    className="w-14 sm:w-16 aspect-[3/4] rounded-xl bg-[#050A14] overflow-hidden shrink-0 cursor-pointer relative border border-white/10"
                  >
                    <img
                      src={item.animePoster || FALLBACK_POSTER}
                      alt={item.animeTitle}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-[#1E88FF]/15 text-[#1E88FF] font-bold px-2 py-0.5 rounded-md font-mono border border-[#1E88FF]/30 shrink-0">
                        EP {item.episodeNumber}
                      </span>
                      {watchedLabel && (
                        <span className="text-[11px] text-[#64748B] font-medium truncate">
                          {watchedLabel}
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => navigate(`/anime/${item.animeSlug}`)}
                      className="text-xs sm:text-sm font-bold text-white hover:text-[#1E88FF] cursor-pointer transition-colors truncate mt-1"
                    >
                      {item.animeTitle}
                    </h3>

                    <p className="text-[11px] sm:text-xs text-[#94A3B8] truncate mt-0.5">
                      {item.episodeTitle || `Episode ${item.episodeNumber}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`)
                    }
                    className="h-9 px-3 sm:px-4 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span className="hidden sm:inline">Resume</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.animeId, item.episodeNumber)}
                    className="w-9 h-9 text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    aria-label={`Remove ${item.animeTitle} episode ${item.episodeNumber} from history`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Watch History?"
        message={`This will remove all ${history.length} watched episode checkpoints from your account. This action cannot be undone.`}
        confirmLabel="Clear All"
        isDestructive
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
};
