import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import type { WatchlistItem, WatchlistStatus } from '../types/library';
import type { Anime } from '../types/anime';
import {
  getWatchlist,
  removeFromWatchlist,
  setWatchlistStatus,
} from '../lib/firestore/user-activity';
import { getPublishedAnimes } from '../lib/firestore/anime';
import { AdminSelect } from '../components/admin/AdminSelect';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import { Bookmark, Search, Trash2, Film, Clock, CheckCircle2, PlayCircle } from 'lucide-react';

interface WatchlistViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

export const WatchlistView: React.FC<WatchlistViewProps> = ({ navigate, onShowMessage }) => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [animeCatalog, setAnimeCatalog] = useState<Record<string, Anime>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'watching' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');

  usePageSeo({
    title: 'My Watchlist | ZYNOX ANIME',
    description: 'Manage your saved anime series, watching status, and completed titles.',
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [items, catalog] = await Promise.all([
        getWatchlist(user?.uid || null),
        getPublishedAnimes(),
      ]);

      const catMap: Record<string, Anime> = {};
      catalog.forEach((a) => {
        if (a.id) catMap[a.id] = a;
        if (a.slug) catMap[a.slug] = a;
      });
      setAnimeCatalog(catMap);
      setWatchlist(items);
    } catch (err) {
      console.error('Watchlist fetch error:', err);
      setError('Failed to load your watchlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const getTotalEpisodes = (item: WatchlistItem): number => {
    if (item.totalEpisodes && item.totalEpisodes > 0) return item.totalEpisodes;
    const fromCat = animeCatalog[item.animeId] || animeCatalog[item.animeSlug];
    if (fromCat?.totalEpisodes && fromCat.totalEpisodes > 0) return fromCat.totalEpisodes;
    return 12;
  };

  const handleRemove = async (animeId: string, title: string) => {
    await removeFromWatchlist(user?.uid || null, animeId);
    setWatchlist((prev) => prev.filter((item) => item.animeId !== animeId));
    onShowMessage?.(`Removed "${title}" from watchlist.`);
  };

  const handleStatusChange = async (item: WatchlistItem, newStatus: WatchlistStatus) => {
    const totalEp = getTotalEpisodes(item);
    const updatedCompleted =
      newStatus === 'completed'
        ? totalEp
        : newStatus === 'plan_to_watch'
        ? 0
        : item.completedEpisodes || 0;

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
    onShowMessage?.(`Updated status to ${newStatus.replace(/_/g, ' ')}.`);
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
      const matchSearch = q === '' || (item.animeTitle || '').toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.animeTitle || '').localeCompare(b.animeTitle || '');
      }
      const timeA =
        typeof a.updatedAt === 'string'
          ? new Date(a.updatedAt).getTime()
          : a.updatedAt?.toMillis?.() || 0;
      const timeB =
        typeof b.updatedAt === 'string'
          ? new Date(b.updatedAt).getTime()
          : b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [watchlist, selectedTab, searchQuery, sortBy]);

  const TABS: { key: 'all' | 'watching' | 'completed'; label: string }[] = [
    { key: 'all', label: 'All Series' },
    { key: 'watching', label: 'Watching' },
    { key: 'completed', label: 'Completed' },
  ];

  const SORT_OPTIONS: { value: 'recent' | 'title'; label: string }[] = [
    { value: 'recent', label: 'Recently Updated' },
    { value: 'title', label: 'Alphabetical (A-Z)' },
  ];

  const STATUS_OPTIONS: {
    value: WatchlistStatus;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: 'watching', label: 'Watching', icon: PlayCircle },
    { value: 'plan_to_watch', label: 'Plan to Watch', icon: Clock },
    { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Bookmark className="w-6 h-6 sm:w-7 sm:h-7 text-[#1E88FF] shrink-0" />
            <span className="truncate">My Watchlist</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Track saved anime series, manage status, and pick up anytime.
          </p>
        </div>

        {/* Search & Custom Sort Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 sm:w-60 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search saved titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search watchlist"
              className="w-full h-10 bg-[#0B1324] border border-white/10 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm text-white placeholder:text-[#64748B] focus:border-[#1E88FF] focus:outline-none transition-colors"
            />
          </div>

          <AdminSelect<'recent' | 'title'>
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={SORT_OPTIONS}
            sheetTitle="Sort Watchlist"
            className="sm:w-48 shrink-0"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors flex items-center gap-2 border cursor-pointer ${
                selectedTab === tab.key
                  ? 'bg-[#1E88FF] text-white border-[#1E88FF]'
                  : 'bg-[#0B1324] text-[#94A3B8] hover:text-white border-white/10 hover:bg-[#101A30]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                  selectedTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-[#94A3B8]'
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse p-4 flex gap-3.5"
            >
              <div className="w-20 h-full rounded-xl bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-4 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
                <div className="h-8 w-28 bg-white/5 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load Watchlist"
          message={error}
          onRetry={fetchItems}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Film className="w-7 h-7 text-[#1E88FF]" />}
          title={searchQuery ? 'No matching titles' : 'Your watchlist is empty'}
          description={
            searchQuery
              ? 'No anime in your watchlist matched that search query.'
              : 'Bookmark any anime series to track progress and find it quickly here.'
          }
          actionLabel={searchQuery ? 'Clear Search' : 'Explore Anime'}
          onAction={() => (searchQuery ? setSearchQuery('') : navigate('/browse'))}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const currentStatus: WatchlistStatus =
              item.status === 'completed' || item.status === 'plan_to_watch'
                ? item.status
                : 'watching';

            return (
              <div
                key={item.animeId}
                className="bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-2xl p-3.5 sm:p-4 flex gap-3.5 transition-colors group min-w-0"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/anime/${item.animeSlug}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/anime/${item.animeSlug}`);
                    }
                  }}
                  className="w-20 sm:w-24 aspect-[2/3] rounded-xl bg-[#050A14] overflow-hidden shrink-0 cursor-pointer border border-white/10"
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
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                  <div className="min-w-0">
                    <h4
                      onClick={() => navigate(`/anime/${item.animeSlug}`)}
                      className="text-sm font-bold text-white hover:text-[#1E88FF] cursor-pointer transition-colors line-clamp-2 leading-snug"
                    >
                      {item.animeTitle}
                    </h4>

                    {item.genres && item.genres.length > 0 && (
                      <p className="text-[11px] text-[#94A3B8] mt-1 truncate">
                        {item.genres.slice(0, 3).join(' • ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <AdminSelect<WatchlistStatus>
                      value={currentStatus}
                      onChange={(val) => handleStatusChange(item, val)}
                      options={STATUS_OPTIONS}
                      sheetTitle="Watchlist Status"
                      className="flex-1 min-w-0"
                      buttonClassName="h-9 bg-[#050A14] text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemove(item.animeId, item.animeTitle)}
                      className="w-9 h-9 rounded-xl text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      aria-label={`Remove ${item.animeTitle} from watchlist`}
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
