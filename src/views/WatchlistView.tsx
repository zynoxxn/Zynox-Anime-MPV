import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import type { WatchlistItem, WatchlistStatus } from '../types/library';
import type { Anime } from '../types/anime';
import {
  getWatchlist,
  removeFromWatchlist,
  setWatchlistStatus,
  updateWatchlistEpisodeProgress,
  getWatchHistory,
} from '../lib/firestore/user-activity';
import { getPublishedAnimes } from '../lib/firestore/anime';
import {
  Bookmark,
  Search,
  Trash2,
  Film,
  Play,
  Plus,
  Minus,
  CheckCircle2,
  TrendingUp,
  Tv,
  Check,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';

interface WatchlistViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({ navigate, onShowMessage }) => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [animeCatalog, setAnimeCatalog] = useState<Record<string, Anime>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<WatchlistStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'progress' | 'recent' | 'title'>('recent');

  // Edit episode modal state
  const [editingItem, setEditingItem] = useState<{
    animeId: string;
    animeTitle: string;
    currentEp: number;
    totalEp: number;
  } | null>(null);
  const [customEpValue, setCustomEpValue] = useState<number>(0);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const [items, catalog, history] = await Promise.all([
        getWatchlist(user?.uid || null),
        getPublishedAnimes(),
        getWatchHistory(user?.uid || null),
      ]);

      // Map catalog by id and slug
      const catMap: Record<string, Anime> = {};
      catalog.forEach((a) => {
        if (a.id) catMap[a.id] = a;
        if (a.slug) catMap[a.slug] = a;
      });
      setAnimeCatalog(catMap);

      // Map watched episodes array by animeId
      const histMap: Record<string, number[]> = {};
      history.forEach((h) => {
        if (!histMap[h.animeId]) histMap[h.animeId] = [];
        if (!histMap[h.animeId].includes(h.episodeNumber)) {
          histMap[h.animeId].push(h.episodeNumber);
        }
      });
      setHistoryMap(histMap);

      setWatchlist(items);
    } catch (err) {
      console.error('Watchlist fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user?.uid]);

  // Helper to determine total episodes for an item
  const getTotalEpisodes = (item: WatchlistItem): number => {
    if (item.totalEpisodes && item.totalEpisodes > 0) return item.totalEpisodes;
    const fromCat = animeCatalog[item.animeId] || animeCatalog[item.animeSlug];
    if (fromCat?.totalEpisodes && fromCat.totalEpisodes > 0) return fromCat.totalEpisodes;
    return 12; // Standard seasonal fallback
  };

  // Helper to determine completed episodes count
  const getCompletedEpisodes = (item: WatchlistItem): number => {
    if (typeof item.completedEpisodes === 'number') {
      return item.completedEpisodes;
    }
    const watchedFromHistory = historyMap[item.animeId] || historyMap[item.animeSlug] || [];
    if (watchedFromHistory.length > 0) {
      return Math.max(...watchedFromHistory);
    }
    return item.status === 'completed' ? getTotalEpisodes(item) : 0;
  };

  const handleRemove = async (animeId: string, title: string) => {
    await removeFromWatchlist(user?.uid || null, animeId);
    setWatchlist((prev) => prev.filter((item) => item.animeId !== animeId));
    onShowMessage?.(`Removed "${title}" from watchlist.`);
  };

  const handleStatusChange = async (item: WatchlistItem, newStatus: WatchlistStatus) => {
    const totalEp = getTotalEpisodes(item);
    const currentCompleted = getCompletedEpisodes(item);
    const updatedCompleted =
      newStatus === 'completed'
        ? totalEp
        : newStatus === 'plan_to_watch' && currentCompleted === 0
        ? 0
        : currentCompleted;

    await setWatchlistStatus(
      user?.uid || null,
      item.animeId,
      item.animeSlug,
      item.animeTitle,
      item.animePoster || '',
      newStatus,
      item.genres,
      item.rating,
      updatedCompleted,
      totalEp
    );

    setWatchlist((prev) =>
      prev.map((w) =>
        w.animeId === item.animeId
          ? { ...w, status: newStatus, completedEpisodes: updatedCompleted, totalEpisodes: totalEp }
          : w
      )
    );
    onShowMessage?.(`Updated status to ${newStatus.replace('_', ' ')}.`);
  };

  const handleUpdateEpisodes = async (item: WatchlistItem, newCompleted: number) => {
    const totalEp = getTotalEpisodes(item);
    const clampedCompleted = Math.max(0, Math.min(totalEp, newCompleted));
    const newStatus: WatchlistStatus =
      clampedCompleted >= totalEp
        ? 'completed'
        : clampedCompleted > 0
        ? 'watching'
        : item.status === 'completed'
        ? 'watching'
        : item.status;

    // Optimistic state update
    setWatchlist((prev) =>
      prev.map((w) =>
        w.animeId === item.animeId
          ? { ...w, completedEpisodes: clampedCompleted, totalEpisodes: totalEp, status: newStatus }
          : w
      )
    );

    await updateWatchlistEpisodeProgress(
      user?.uid || null,
      item.animeId,
      clampedCompleted,
      totalEp
    );

    if (clampedCompleted === totalEp && item.status !== 'completed') {
      onShowMessage?.(`🎉 Completed all episodes of "${item.animeTitle}"!`);
    } else {
      onShowMessage?.(`Progress updated: ${clampedCompleted}/${totalEp} Episodes.`);
    }
  };

  const handleSaveCustomEp = async () => {
    if (!editingItem) return;
    const targetItem = watchlist.find((w) => w.animeId === editingItem.animeId);
    if (targetItem) {
      await handleUpdateEpisodes(targetItem, customEpValue);
    }
    setEditingItem(null);
  };

  // Summary statistics across entire watchlist
  const stats = useMemo(() => {
    let totalWatchedEps = 0;
    let totalPossibleEps = 0;
    let completedCount = 0;
    let watchingCount = 0;

    watchlist.forEach((item) => {
      const completed = getCompletedEpisodes(item);
      const total = getTotalEpisodes(item);
      totalWatchedEps += completed;
      totalPossibleEps += total;
      if (item.status === 'completed' || (total > 0 && completed >= total)) {
        completedCount++;
      } else if (item.status === 'watching' || completed > 0) {
        watchingCount++;
      }
    });

    const overallPercentage =
      totalPossibleEps > 0 ? Math.round((totalWatchedEps / totalPossibleEps) * 100) : 0;

    return {
      totalTitles: watchlist.length,
      totalWatchedEps,
      totalPossibleEps,
      completedCount,
      watchingCount,
      overallPercentage,
    };
  }, [watchlist, animeCatalog, historyMap]);

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const list = watchlist.filter((item) => {
      const matchTab = selectedTab === 'all' || item.status === selectedTab;
      const matchSearch =
        q === '' ||
        (item.animeTitle || '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === 'progress') {
        const progA = getCompletedEpisodes(a) / getTotalEpisodes(a);
        const progB = getCompletedEpisodes(b) / getTotalEpisodes(b);
        return progB - progA;
      }
      if (sortBy === 'title') {
        return (a.animeTitle || '').localeCompare(b.animeTitle || '');
      }
      // Default: recent
      const timeA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt?.toMillis?.() || 0;
      const timeB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [watchlist, selectedTab, searchQuery, sortBy, animeCatalog, historyMap]);

  const TABS: { key: WatchlistStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All Series' },
    { key: 'watching', label: 'Watching' },
    { key: 'completed', label: 'Completed' },
    { key: 'plan_to_watch', label: 'Plan to Watch' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'dropped', label: 'Dropped' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            <span className="w-9 h-9 rounded-2xl bg-[#1683FF]/20 border border-[#1683FF]/40 flex items-center justify-center text-[#1683FF]">
              <Bookmark className="w-5 h-5" />
            </span>
            <span>My Watchlist</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A9B8CC] mt-1.5">
            Track your anime journey, log completed episodes, and resume where you left off.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search saved titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#081426] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#1683FF] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-[#081426] border border-white/10 rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1683FF]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="recent" className="bg-[#081426] text-white">Recently Updated</option>
              <option value="progress" className="bg-[#081426] text-white">Highest Progress</option>
              <option value="title" className="bg-[#081426] text-white">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Progress Overview Stats Banner */}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 sm:p-5 bg-[#081426] border border-white/10 rounded-2xl sm:rounded-3xl shadow-xl">
          <div className="flex items-center gap-3 border-r border-white/5 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#1683FF]/15 border border-[#1683FF]/30 flex items-center justify-center text-[#1683FF] shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Titles</div>
              <div className="text-lg sm:text-xl font-black text-white">{stats.totalTitles}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:border-r border-white/5 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#00CFFF]/15 border border-[#00CFFF]/30 flex items-center justify-center text-[#00CFFF] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Episodes Done</div>
              <div className="text-lg sm:text-xl font-black text-white">
                {stats.totalWatchedEps}
                <span className="text-xs text-zinc-500 font-normal ml-1">/ {stats.totalPossibleEps}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-r border-white/5 pr-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Completed</div>
              <div className="text-lg sm:text-xl font-black text-white">{stats.completedCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Overall Rate</div>
              <div className="text-lg sm:text-xl font-black text-white">{stats.overallPercentage}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? watchlist.length
              : watchlist.filter((w) => w.status === tab.key).length;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                selectedTab === tab.key
                  ? 'bg-[#1683FF] text-white shadow-lg shadow-[#1683FF]/30 border border-[#1683FF]'
                  : 'bg-[#081426] text-zinc-400 hover:text-white border border-white/5 hover:bg-[#0D1B2E]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  selectedTab === tab.key
                    ? 'bg-black/30 text-white'
                    : 'bg-[#050A14] text-zinc-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Watchlist Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1683FF] border-t-transparent rounded-full animate-spin" />
          <span>Loading your watchlist and progress tracker...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-[#081426] border border-white/10 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-xl">
          <Film className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-lg font-bold text-white">No series found</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {searchQuery
              ? 'No anime in your watchlist matched your search filter.'
              : 'Add anime to your watchlist to track episode completion and progress.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 bg-[#1683FF] hover:bg-[#0070ea] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#1683FF]/30"
          >
            Explore Anime Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            const completed = getCompletedEpisodes(item);
            const total = getTotalEpisodes(item);
            const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
            const isAllCompleted = completed >= total && total > 0;
            const nextEpisode = isAllCompleted ? 1 : completed + 1;

            return (
              <div
                key={item.animeId}
                className="bg-[#081426] border border-white/10 hover:border-[#1683FF]/50 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-lg hover:shadow-[#1683FF]/10 group"
              >
                {/* Upper Section: Poster + Title + Status */}
                <div className="flex gap-3.5">
                  {/* Poster Thumbnail */}
                  <div
                    onClick={() => navigate(`/anime/${item.animeSlug}`)}
                    className="w-20 sm:w-24 h-28 sm:h-32 rounded-xl bg-[#050A14] overflow-hidden shrink-0 cursor-pointer relative border border-white/10 shadow-md group/poster"
                  >
                    {item.animePoster ? (
                      <img
                        src={item.animePoster}
                        alt={item.animeTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Film className="w-6 h-6 m-auto mt-10 text-zinc-600" />
                    )}

                    {/* Progress percentage pill over poster */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 backdrop-blur-md rounded-md py-0.5 px-1.5 text-center text-[10px] font-bold text-white border border-white/10">
                      {percent}%
                    </div>
                  </div>

                  {/* Info Header */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4
                        onClick={() => navigate(`/anime/${item.animeSlug}`)}
                        className="text-sm sm:text-base font-bold text-white hover:text-[#00CFFF] cursor-pointer transition-colors line-clamp-2 leading-snug"
                      >
                        {item.animeTitle}
                      </h4>

                      {item.genres && item.genres.length > 0 && (
                        <p className="text-[11px] text-zinc-400 mt-1 truncate">
                          {item.genres.slice(0, 3).join(' • ')}
                        </p>
                      )}
                    </div>

                    {/* Status dropdown & Delete */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value as WatchlistStatus)}
                        className="bg-[#050A14] border border-white/10 text-[11px] font-bold text-zinc-300 rounded-lg px-2 py-1 focus:border-[#1683FF] outline-none capitalize cursor-pointer hover:border-white/20 transition-colors"
                      >
                        <option value="watching">Watching</option>
                        <option value="completed">Completed</option>
                        <option value="plan_to_watch">Plan to Watch</option>
                        <option value="on_hold">On Hold</option>
                        <option value="dropped">Dropped</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemove(item.animeId, item.animeTitle)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lower Section: Interactive Episode Progress Tracker */}
                <div className="bg-[#050A14]/80 border border-white/5 rounded-xl p-3 space-y-2.5">
                  {/* Progress Header & Counter */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Progress:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem({
                            animeId: item.animeId,
                            animeTitle: item.animeTitle,
                            currentEp: completed,
                            totalEp: total,
                          });
                          setCustomEpValue(completed);
                        }}
                        className="text-xs font-mono font-black text-[#00CFFF] hover:underline bg-[#1683FF]/10 px-2 py-0.5 rounded border border-[#1683FF]/20"
                        title="Click to set custom episode number"
                      >
                        {completed} / {total} Ep
                      </button>
                    </div>

                    {isAllCompleted ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <Check className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-zinc-400">
                        {total - completed} eps left
                      </span>
                    )}
                  </div>

                  {/* Progress Visual Bar */}
                  <div className="w-full bg-[#081426] h-2 rounded-full overflow-hidden border border-white/5 relative">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isAllCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-[#1683FF] to-[#00CFFF]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Episode Stepper Controls & Watch Button */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Stepper buttons */}
                    <div className="flex items-center gap-1 bg-[#081426] border border-white/10 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateEpisodes(item, completed - 1)}
                        disabled={completed <= 0}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Mark previous episode as unwatched"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-mono font-bold text-zinc-300 px-1.5 min-w-[28px] text-center">
                        {completed}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateEpisodes(item, completed + 1)}
                        disabled={completed >= total}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Mark next episode as watched"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Watch Next Ep Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/watch/${item.animeSlug}?ep=${nextEpisode}`)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-md ${
                        isAllCompleted
                          ? 'bg-[#081426] hover:bg-[#0D1B2E] text-zinc-300 border border-white/10'
                          : 'bg-[#1683FF] hover:bg-[#0070ea] text-white shadow-[#1683FF]/30'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isAllCompleted ? 'Replay Series' : `Watch Ep ${nextEpisode}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Edit Episode Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#081426] border border-[#1683FF]/40 rounded-2xl sm:rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-white">Set Watched Progress</h3>
            <p className="text-xs text-zinc-400 line-clamp-1">{editingItem.animeTitle}</p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Completed Episodes (out of {editingItem.totalEp}):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={editingItem.totalEp}
                  value={customEpValue}
                  onChange={(e) => setCustomEpValue(parseInt(e.target.value, 10) || 0)}
                  className="flex-1 bg-[#050A14] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-[#1683FF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCustomEpValue(editingItem.totalEp)}
                  className="px-3 py-2.5 bg-[#1683FF]/15 hover:bg-[#1683FF]/25 border border-[#1683FF]/30 rounded-xl text-xs font-bold text-[#1683FF] transition-colors"
                >
                  All ({editingItem.totalEp})
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-[#050A14] hover:bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomEp}
                className="px-5 py-2 bg-[#1683FF] hover:bg-[#0070ea] rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-[#1683FF]/30"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

