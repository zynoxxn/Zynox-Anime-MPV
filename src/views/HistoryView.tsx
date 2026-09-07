import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import type { WatchHistoryItem } from '../types/library';
import { getWatchHistory, removeWatchHistoryItem, clearWatchHistory } from '../lib/firestore/user-activity';
import { History, Trash2, Play, Film, Clock } from 'lucide-react';

interface HistoryViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ navigate, onShowMessage }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const items = await getWatchHistory(user?.uid || null);
      setHistory(items);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.uid]);

  const handleRemove = async (animeId: string, episodeNumber: number, title?: string) => {
    await removeWatchHistoryItem(user?.uid || null, animeId, episodeNumber);
    setHistory((prev) =>
      prev.filter((h) => !(h.animeId === animeId && h.episodeNumber === episodeNumber))
    );
    onShowMessage?.(`Removed episode from watch history.`);
  };

  const handleConfirmClearAll = async () => {
    try {
      setClearing(true);
      await clearWatchHistory(user?.uid || null);
      setHistory([]);
      setShowClearModal(false);
      onShowMessage?.('Watch history cleared.');
    } catch (err) {
      console.error('Failed to clear watch history:', err);
      onShowMessage?.('Failed to clear history. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateVal: any) => {
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal?.toDate ? dateVal.toDate() : new Date();
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#F5F9FF] flex items-center gap-3 tracking-tight">
            <History className="w-7 h-7 text-[#00A8FF]" />
            <span>Watch History</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A9B8CC] mt-1">
            Recently watched episodes and playback checkpoints
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A1628] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-[#F5F9FF]">Clear Watch History?</h3>
              <p className="text-xs text-[#A9B8CC] leading-relaxed">
                This will remove all {history.length} watched episode checkpoints from your account. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-[#CBD5E1] text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center text-xs text-[#A9B8CC]">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-xl">
          <Clock className="w-12 h-12 mx-auto text-[#6E7F95]" />
          <h3 className="text-lg font-bold text-[#F5F9FF]">No watch history yet</h3>
          <p className="text-xs text-[#A9B8CC] leading-relaxed">
            Episodes you watch will automatically be recorded here so you can pick up where you left off.
          </p>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0066FF]/30"
          >
            Browse Anime
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={`${item.animeId}-ep${item.episodeNumber}`}
              className="group bg-[#0D1B2E] border border-white/5 hover:border-[#00A8FF]/40 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition-all shadow-lg hover:bg-[#11243C]"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Thumbnail / Poster */}
                <div
                  onClick={() => navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`)}
                  className="w-16 h-20 rounded-xl bg-[#06101F] overflow-hidden shrink-0 cursor-pointer relative border border-white/5"
                >
                  {item.animePoster ? (
                    <img
                      src={item.animePoster}
                      alt={item.animeTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Film className="w-6 h-6 m-auto mt-7 text-[#6E7F95]" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>

                {/* Metadata */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-[#00A8FF]/20 text-[#00D9FF] font-bold px-2 py-0.5 rounded-md font-mono border border-[#00A8FF]/30">
                      EP {item.episodeNumber}
                    </span>
                    <span className="text-[10px] text-[#6E7F95] font-semibold">
                      {formatDate(item.watchedAt)}
                    </span>
                  </div>

                  <h3
                    onClick={() => navigate(`/anime/${item.animeSlug}`)}
                    className="text-sm font-bold text-[#F5F9FF] hover:text-[#00D9FF] cursor-pointer transition-colors truncate mt-1"
                  >
                    {item.animeTitle}
                  </h3>

                  <p className="text-xs text-[#A9B8CC] truncate mt-0.5">
                    {item.episodeTitle || `Episode ${item.episodeNumber}`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`)}
                  className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#0066FF]/30"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden sm:inline">Resume</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(item.animeId, item.episodeNumber, item.animeTitle)}
                  className="p-2 text-[#6E7F95] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
