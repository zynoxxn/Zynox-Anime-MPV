import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import type { WatchlistItem, WatchlistStatus } from '../types/library';
import type { Anime } from '../types/anime';
import {
  getWatchlist,
  removeFromWatchlist,
  setWatchlistStatus,
  getWatchHistory,
} from '../lib/firestore/user-activity';
import { getPublishedAnimes } from '../lib/firestore/anime';
import {
  Bookmark,
  Search,
  Trash2,
  Film,
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
  const [selectedTab, setSelectedTab] = useState<'all' | 'watching' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');

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

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const list = watchlist.filter((item) => {
      const matchTab =
        selectedTab === 'all'
          ? true
          : selectedTab === 'completed'
          ? item.status === 'completed'
          : item.status !== 'completed';
      const matchSearch =
        q === '' ||
        (item.animeTitle || '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.animeTitle || '').localeCompare(b.animeTitle || '');
      }
      // Default: recent
      const timeA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt?.toMillis?.() || 0;
      const timeB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [watchlist, selectedTab, searchQuery, sortBy]);

  const TABS: { key: 'all' | 'watching' | 'completed'; label: string }[] = [
    { key: 'all', label: 'All Series' },
    { key: 'watching', label: 'Watching' },
    { key: 'completed', label: 'Completed' },
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
            Track your saved anime series, manage watchlist statuses, and watch anytime.
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
              <option value="title" className="bg-[#081426] text-white">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? watchlist.length
              : tab.key === 'completed'
              ? watchlist.filter((w) => w.status === 'completed').length
              : watchlist.filter((w) => w.status !== 'completed').length;

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
          <span>Loading your watchlist...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-[#081426] border border-white/10 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-xl">
          <Film className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-lg font-bold text-white">No series found</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {searchQuery
              ? 'No anime in your watchlist matched your search filter.'
              : 'Add anime to your watchlist to keep track of what you want to watch.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 bg-[#1683FF] hover:bg-[#0070ea] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#1683FF]/30"
          >
            Explore Anime
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            return (
              <div
                key={item.animeId}
                className="bg-[#081426] border border-white/10 hover:border-[#1683FF]/50 rounded-2xl p-4 flex gap-3.5 transition-all shadow-lg hover:shadow-[#1683FF]/10 group"
              >
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
                </div>

                {/* Info Header */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
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
                      value={item.status === 'completed' ? 'completed' : 'watching'}
                      onChange={(e) => handleStatusChange(item, e.target.value as WatchlistStatus)}
                      className="bg-[#050A14] border border-white/10 text-[11px] font-bold text-zinc-300 rounded-lg px-2.5 py-1.5 focus:border-[#1683FF] outline-none capitalize cursor-pointer hover:border-white/20 transition-colors"
                    >
                      <option value="watching">Watching</option>
                      <option value="completed">Completed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.animeId, item.animeTitle)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

