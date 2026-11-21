import React, { useState, useMemo, useEffect } from 'react';
import type { Episode } from '../types/episode';
import type { AnimeSeasonEntry } from '../types/anime';
import {
  Search,
  Check,
  Download,
  Layers,
  LayoutGrid,
  List,
  Lock,
  Calendar,
} from 'lucide-react';
import { resolveEpisodeDownloadUrl, executeDownloadRedirect } from '../lib/downloadRedirect';
import { AdminSelect } from './admin/AdminSelect';
import { EpisodeListSkeleton } from './SkeletonLoader';

const EMPTY_SEASONS: AnimeSeasonEntry[] = [];
const EMPTY_WATCHED: number[] = [];

function formatDurationLabel(duration: unknown): string | null {
  if (duration === null || duration === undefined || duration === '') return null;
  if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
    return duration > 180 ? `${Math.round(duration / 60)}m` : `${duration}m`;
  }
  const str = String(duration).trim();
  const lower = str.toLowerCase();
  if (!str || lower.includes('nan') || lower.includes('null') || lower.includes('undefined')) {
    return null;
  }
  if (str.endsWith('m') || lower.includes('min')) return str;
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (!parts.some(isNaN) && parts.length >= 2 && parts[0] > 0) {
      return `${parts[0]}m`;
    }
    return null;
  }
  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    return num > 180 ? `${Math.round(num / 60)}m` : `${num}m`;
  }
  return null;
}

interface EpisodeSelectorProps {
  episodes: Episode[];
  animeTitle?: string;
  animePoster?: string;
  animeBanner?: string;
  seasonsList?: AnimeSeasonEntry[];
  currentEpisodeNumber?: number;
  currentSeasonNumber?: number;
  currentEpisodeId?: string;
  watchedEpisodeNumbers?: number[];
  selectedSeason?: number | 'all';
  isAnimeUpcoming?: boolean;
  loading?: boolean;
  onSeasonChange?: (seasonNumber: number | 'all') => void;
  onSelectEpisode: (episodeNumber: number, seasonNumber?: number, episode?: Episode) => void;
  onDownloadEpisode?: (episode: Episode) => void;
  onNavigateSeasonAnime?: (slug: string) => void;
}

export const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  episodes,
  seasonsList = EMPTY_SEASONS,
  currentEpisodeNumber,
  currentSeasonNumber,
  currentEpisodeId,
  watchedEpisodeNumbers = EMPTY_WATCHED,
  selectedSeason: controlledSeason,
  loading = false,
  onSeasonChange,
  onSelectEpisode,
  onDownloadEpisode,
  onNavigateSeasonAnime,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSeason, setInternalSeason] = useState<number | 'all'>('all');
  const [viewMode, setViewModeState] = useState<'list' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('zynox_episode_view_mode');
      if (saved === 'grid' || saved === 'list') return saved;
    } catch {}
    return 'list';
  });
  const setViewMode = (mode: 'list' | 'grid') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('zynox_episode_view_mode', mode);
    } catch {}
  };
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number>(0);
  const selectedSeason = controlledSeason !== undefined ? controlledSeason : internalSeason;

  const handleSeasonSelect = (s: number | 'all') => {
    setInternalSeason(s);
    onSeasonChange?.(s);
  };

  // Discover available seasons (checking ep.seasonNumber, ep.season, and seasonsList)
  const seasons = useMemo(() => {
    const s = new Set<number>();
    if (seasonsList && seasonsList.length > 0) {
      seasonsList.forEach((sl) => {
        if (sl.seasonNumber) s.add(Number(sl.seasonNumber));
      });
    }
    episodes.forEach((ep) => {
      s.add(Number(ep.seasonNumber || ep.season || 1));
    });
    const list = Array.from(s).sort((a, b) => a - b);
    return list.length > 0 ? list : [1];
  }, [episodes, seasonsList]);

  // If current episode or season is provided, auto-switch to its season if not selected
  useEffect(() => {
    if (controlledSeason !== undefined) return;
    if (currentEpisodeId || (currentEpisodeNumber && currentSeasonNumber)) {
      const activeEp = episodes.find(
        (e) =>
          (currentEpisodeId && e.id === currentEpisodeId) ||
          (currentSeasonNumber &&
            Number(e.seasonNumber || e.season || 1) === currentSeasonNumber &&
            e.episodeNumber === currentEpisodeNumber)
      );
      if (activeEp) {
        const epSeason = Number(activeEp.seasonNumber || activeEp.season || 1);
        if (seasons.includes(epSeason)) {
          setInternalSeason(epSeason);
        }
      }
    }
  }, [controlledSeason, currentEpisodeNumber, currentSeasonNumber, currentEpisodeId, episodes, seasons]);

  const filteredEpisodes = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return episodes.filter((ep) => {
      const epSeason = Number(ep.seasonNumber || ep.season || 1);
      const matchSeason = selectedSeason === 'all' || Number(epSeason) === Number(selectedSeason);
      const matchSearch =
        q === '' ||
        ep.episodeNumber.toString().includes(q) ||
        (ep.title && ep.title.toLowerCase().includes(q));
      return matchSeason && matchSearch;
    });
  }, [episodes, selectedSeason, searchQuery]);

  // Range Pagination for Episode List (exact parity with WatchEpisodeView)
  const RANGE_SIZE = 50;
  const episodeRanges = useMemo(() => {
    const total = filteredEpisodes.length;
    if (total <= RANGE_SIZE) return [];
    const ranges: { start: number; end: number; label: string }[] = [];
    for (let i = 0; i < total; i += RANGE_SIZE) {
      const end = Math.min(i + RANGE_SIZE, total);
      ranges.push({ start: i, end, label: `${i + 1}–${end}` });
    }
    return ranges;
  }, [filteredEpisodes.length]);

  const displayedEpisodes = useMemo(() => {
    if (episodeRanges.length === 0) return filteredEpisodes;
    const cur = episodeRanges[selectedRangeIndex] || episodeRanges[0];
    return filteredEpisodes.slice(cur.start, cur.end);
  }, [filteredEpisodes, episodeRanges, selectedRangeIndex]);

  useEffect(() => {
    setSelectedRangeIndex(0);
  }, [selectedSeason, searchQuery]);

  const seasonOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Seasons' },
      ...seasons.map((s) => ({ value: String(s), label: `Season ${s}` })),
    ];
  }, [seasons]);

  const rangeOptions = useMemo(() => {
    return episodeRanges.map((r, idx) => ({
      value: String(idx),
      label: `EP ${r.label}`,
    }));
  }, [episodeRanges]);

  return (
    <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
      {/* Header & View Mode Toggle */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#1E88FF] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
            Episodes
          </h3>
          <span className="text-xs text-[#94A3B8] shrink-0">({filteredEpisodes.length})</span>
        </div>

        {/* View Mode Toggle (List / Grid) */}
        <div className="flex items-center gap-1 bg-[#101A30] p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
              viewMode === 'list' ? 'bg-[#1E88FF] text-white shadow' : 'text-[#94A3B8] hover:text-white'
            }`}
            title="List View"
            aria-label="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
              viewMode === 'grid' ? 'bg-[#1E88FF] text-white shadow' : 'text-[#94A3B8] hover:text-white'
            }`}
            title="Grid View"
            aria-label="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Season / Range / Search Controls Row (Custom AdminSelect - no native select) */}
      <div className="flex flex-wrap items-center gap-2">
        {seasons.length > 1 && (
          <div className="w-32 shrink-0">
            <AdminSelect
              value={String(selectedSeason)}
              onChange={(val) => {
                if (val === 'all') {
                  handleSeasonSelect('all');
                  return;
                }
                const sNum = Number(val);
                const meta = seasonsList.find((sl) => Number(sl.seasonNumber) === sNum);
                if (meta?.slug && onNavigateSeasonAnime) {
                  onNavigateSeasonAnime(meta.slug);
                } else {
                  handleSeasonSelect(sNum);
                }
              }}
              options={seasonOptions}
              sheetTitle="Select Season"
              buttonClassName="h-9 text-xs bg-[#101A30]"
            />
          </div>
        )}

        {episodeRanges.length > 0 && (
          <div className="w-28 shrink-0">
            <AdminSelect
              value={String(selectedRangeIndex)}
              onChange={(val) => setSelectedRangeIndex(Number(val))}
              options={rangeOptions}
              sheetTitle="Episode Range"
              buttonClassName="h-9 text-xs bg-[#101A30]"
            />
          </div>
        )}

        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ep..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search episodes"
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#101A30] border border-white/10 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#1E88FF]"
          />
        </div>
      </div>

      {/* Episodes Content */}
      {loading && displayedEpisodes.length === 0 ? (
        <EpisodeListSkeleton />
      ) : displayedEpisodes.length === 0 ? (
        <div className="text-center py-10 text-xs text-[#94A3B8]">
          No episodes match your search criteria.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (matching WatchEpisodeView) */
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[420px] overflow-y-auto no-scrollbar p-0.5">
          {displayedEpisodes.map((ep) => {
            const epSeasonNum = Number(ep.seasonNumber || ep.season || 1);
            const isCurrent = currentEpisodeId
              ? ep.id === currentEpisodeId
              : currentEpisodeNumber !== undefined &&
                Number(currentEpisodeNumber) === Number(ep.episodeNumber) &&
                (currentSeasonNumber === undefined || epSeasonNum === currentSeasonNumber);
            const isWatched = watchedEpisodeNumbers.includes(ep.episodeNumber);
            const isUpcoming = ep.status === 'upcoming' || Boolean(ep.isUpcoming);

            return (
              <button
                key={ep.id || `${epSeasonNum}-${ep.episodeNumber}`}
                type="button"
                onClick={() => onSelectEpisode(ep.episodeNumber, epSeasonNum, ep)}
                title={`Episode ${ep.episodeNumber}${ep.title ? `: ${ep.title}` : ''}`}
                className={`h-11 rounded-xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer relative ${
                  isCurrent
                    ? 'bg-[#1E88FF] text-white border-2 border-white'
                    : isWatched
                    ? 'bg-[#101A30] border border-emerald-500/30 text-emerald-400'
                    : isUpcoming
                    ? 'border border-dashed border-amber-500/30 text-amber-300 bg-amber-500/5'
                    : 'bg-[#101A30] hover:bg-[#16223e] border border-white/5 text-white'
                }`}
              >
                <span>{ep.episodeNumber}</span>
                {isWatched && !isCurrent && (
                  <Check className="w-2.5 h-2.5 text-emerald-400 absolute bottom-1 right-1" />
                )}
                {isUpcoming && (
                  <Lock className="w-2.5 h-2.5 text-amber-400 absolute bottom-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW (matching WatchEpisodeView) */
        <div className="space-y-1.5 max-h-[460px] overflow-y-auto no-scrollbar p-0.5">
          {displayedEpisodes.map((ep) => {
            const epSeasonNum = Number(ep.seasonNumber || ep.season || 1);
            const isCurrent = currentEpisodeId
              ? ep.id === currentEpisodeId
              : currentEpisodeNumber !== undefined &&
                Number(currentEpisodeNumber) === Number(ep.episodeNumber) &&
                (currentSeasonNumber === undefined || epSeasonNum === currentSeasonNumber);
            const isWatched = watchedEpisodeNumbers.includes(ep.episodeNumber);
            const isUpcoming = ep.status === 'upcoming' || Boolean(ep.isUpcoming);
            const durationText = formatDurationLabel(ep.duration);
            const scheduleText = isUpcoming
              ? ep.airDate ||
                (ep.dayOfWeek
                  ? `${ep.dayOfWeek}${ep.releaseTime ? ` · ${ep.releaseTime}` : ''}`
                  : ep.releaseTime || 'Scheduled')
              : null;

            return (
              <div
                key={ep.id || `${epSeasonNum}-${ep.episodeNumber}`}
                id={`ep-row-${epSeasonNum}-${ep.episodeNumber}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectEpisode(ep.episodeNumber, epSeasonNum, ep)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectEpisode(ep.episodeNumber, epSeasonNum, ep);
                  }
                }}
                className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E88FF]/60 ${
                  isCurrent
                    ? 'bg-[#1E88FF]/15 border-[#1E88FF] shadow-sm'
                    : 'bg-[#101A30] hover:bg-[#16223e] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                      isCurrent ? 'bg-[#1E88FF] text-white' : 'bg-white/5 text-[#94A3B8]'
                    }`}
                  >
                    EP {ep.episodeNumber}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-[13px] font-semibold truncate ${
                        isCurrent ? 'text-white' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {ep.title || `Episode ${ep.episodeNumber}`}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] mt-0.5 truncate">
                      {seasons.length > 1 && <span>S{epSeasonNum}</span>}
                      {durationText && <span>{durationText}</span>}
                      {scheduleText && (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                          <span>{scheduleText}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isCurrent ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#1E88FF] text-white text-[10px] font-bold whitespace-nowrap">
                      {currentEpisodeId ? 'Playing' : 'Continue'}
                    </span>
                  ) : isWatched ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isUpcoming ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : null}

                  {!isUpcoming && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDownloadEpisode) {
                          onDownloadEpisode(ep);
                        } else {
                          const dlUrl = resolveEpisodeDownloadUrl(ep, undefined);
                          executeDownloadRedirect(dlUrl, `Episode ${ep.episodeNumber}`);
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#1E88FF] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title={`Download Episode ${ep.episodeNumber}`}
                      aria-label={`Download Episode ${ep.episodeNumber}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
