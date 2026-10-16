import React, { useState, useMemo, useEffect } from 'react';
import type { Episode } from '../types/episode';
import type { AnimeSeasonEntry } from '../types/anime';
import { Search, Play, Check, Download, Sparkles, Layers, Calendar } from 'lucide-react';
import { resolveEpisodeDownloadUrl, executeDownloadRedirect } from '../lib/downloadRedirect';
interface ScheduledEpisodeMetaProps {
  dayOfWeek?: string;
  releaseTime?: string;
  airDate?: string;
  language?: string;
}

const ScheduledEpisodeMeta: React.FC<ScheduledEpisodeMetaProps> = ({
  dayOfWeek,
  releaseTime,
  airDate,
  language,
}) => {
  const formattedDateTime = airDate
    ? airDate
    : dayOfWeek
    ? `${dayOfWeek}${releaseTime ? ` · ${releaseTime}` : ''}`
    : releaseTime
    ? `Airing at ${releaseTime}`
    : 'Scheduled Broadcast';

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 text-[11px]">
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1683FF]/10 border border-[#1683FF]/25 text-[#00CFFF] font-semibold">
        <Calendar className="w-3 h-3 text-[#00CFFF] shrink-0" />
        <span>{formattedDateTime}</span>
      </span>

      {language && (
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#94A3B8] text-[10px] font-medium truncate max-w-[150px]">
          {language}
        </span>
      )}
    </div>
  );
};

interface EpisodeSelectorProps {
  episodes: Episode[];
  animeTitle?: string;
  animePoster?: string;
  animeBanner?: string;
  seasonsList?: AnimeSeasonEntry[];
  currentEpisodeNumber?: number;
  watchedEpisodeNumbers?: number[];
  selectedSeason?: number | 'all';
  isAnimeUpcoming?: boolean;
  onSeasonChange?: (seasonNumber: number | 'all') => void;
  onSelectEpisode: (episodeNumber: number) => void;
  onDownloadEpisode?: (episode: Episode) => void;
  onNavigateSeasonAnime?: (slug: string) => void;
}

export const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  episodes,
  animeTitle,
  animePoster,
  animeBanner,
  seasonsList = [],
  currentEpisodeNumber,
  watchedEpisodeNumbers = [],
  selectedSeason: controlledSeason,
  isAnimeUpcoming = false,
  onSeasonChange,
  onSelectEpisode,
  onDownloadEpisode,
  onNavigateSeasonAnime,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSeason, setInternalSeason] = useState<number | 'all'>('all');
  const selectedSeason = controlledSeason !== undefined ? controlledSeason : internalSeason;
  const viewMode: 'list' | 'grid' = 'list';

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

  // If currentEpisodeNumber is provided, auto-switch to its season if not selected
  useEffect(() => {
    if (currentEpisodeNumber) {
      const activeEp = episodes.find((e) => e.episodeNumber === currentEpisodeNumber);
      if (activeEp) {
        const epSeason = Number(activeEp.seasonNumber || activeEp.season || 1);
        if (seasons.includes(epSeason)) {
          handleSeasonSelect(epSeason);
        }
      }
    }
  }, [currentEpisodeNumber, episodes, seasons]);

  const filteredEpisodes = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return episodes.filter((ep) => {
      const epSeason = Number(ep.seasonNumber || ep.season || 1);
      const matchSeason = selectedSeason === 'all' || epSeason === selectedSeason;
      const matchSearch =
        q === '' ||
        ep.episodeNumber.toString() === (searchQuery || '').trim() ||
        (ep.title || '').toLowerCase().includes(q);
      return matchSeason && matchSearch;
    });
  }, [episodes, selectedSeason, searchQuery]);

  return (
    <div className="bg-[#07111F] border border-white/[0.06] hover:border-[#1683FF]/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl transition-all">
      {/* Header & Controls Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1683FF] animate-pulse" />
          <h3 className="font-black text-[#F8FAFC] text-base sm:text-lg tracking-tight">
            Episodes <span className="text-[#00CFFF]">({filteredEpisodes.length})</span>
          </h3>
        </div>

        {/* Episode Quick Search */}
        <div className="relative w-40 sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search episode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050A14] border border-white/10 text-xs text-[#F8FAFC] rounded-xl pl-8 pr-3 py-2 focus:border-[#1683FF] outline-none placeholder-[#64748B]"
          />
        </div>
      </div>

      {/* Horizontal Side-by-Side Season Tabs: Direct Season 1, Season 2... */}
      {seasons.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
          {seasons.map((s) => {
            const isActive = selectedSeason === s || (selectedSeason === 'all' && s === seasons[0]);
            const meta = seasonsList.find((sl) => Number(sl.seasonNumber) === s);
            const label = `Season ${s}`;

            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (meta?.slug && onNavigateSeasonAnime) {
                    onNavigateSeasonAnime(meta.slug);
                  } else {
                    handleSeasonSelect(s);
                  }
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30 border border-[#1683FF]'
                    : 'bg-[#050A14] text-[#94A3B8] hover:text-white hover:bg-white/5 border border-white/10'
                }`}
              >
                <span>{label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Episodes Content */}
      {filteredEpisodes.length === 0 ? (
        <div className="text-center py-10 text-xs text-[#94A3B8]">
          No episodes match your search criteria.
        </div>
      ) : viewMode === 'list' ? (
        /* 1. HORIZONTAL LIST VIEW */
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {filteredEpisodes.map((ep) => {
            const isPlaying = currentEpisodeNumber === ep.episodeNumber;
            const isWatched = watchedEpisodeNumbers.includes(ep.episodeNumber);
            const isEpUpcoming = ep.status === 'upcoming' || Boolean(ep.isUpcoming);
            // Every episode thumbnail uses anime title's banner image
            const epThumbnail = animeBanner || animePoster || ep.thumbnail;

            return (
              <div
                key={ep.id || ep.episodeNumber}
                id={`ep-row-${ep.episodeNumber}`}
                onClick={() => onSelectEpisode(ep.episodeNumber)}
                className={`group relative p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${
                  isPlaying
                    ? 'bg-[#1683FF]/20 border-[#1683FF] shadow-lg shadow-[#1683FF]/15 ring-1 ring-[#1683FF]'
                    : isEpUpcoming
                    ? 'bg-[#050A14] border-[#1683FF]/30 hover:border-[#00CFFF]/60 hover:bg-[#081426]'
                    : 'bg-[#050A14] border-white/5 hover:border-[#1683FF]/40 hover:bg-[#081426]'
                }`}
              >
                {/* Left: Thumbnail with Duration & Play button */}
                <div className="relative w-24 sm:w-32 aspect-video bg-[#050A14] rounded-xl overflow-hidden shrink-0 border border-white/10">
                  {epThumbnail ? (
                    <img
                      src={epThumbnail}
                      alt={ep.title || `Episode ${ep.episodeNumber}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#64748B]">
                      <Play className="w-5 h-5 opacity-40" />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        isPlaying
                          ? 'bg-[#1683FF] text-white scale-110 shadow-md shadow-[#1683FF]/50'
                          : isEpUpcoming
                          ? 'bg-[#081426]/90 border border-[#1683FF]/60 text-[#00CFFF] group-hover:bg-[#1683FF] group-hover:text-white group-hover:border-[#1683FF]'
                          : 'bg-black/60 border border-white/20 text-white group-hover:bg-[#1683FF] group-hover:text-white group-hover:border-[#1683FF]'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge bottom right (hidden if invalid or NaN) */}
                  {(() => {
                    if (!ep.duration) return null;
                    let formatted = '';
                    if (typeof ep.duration === 'number' && !isNaN(ep.duration) && ep.duration > 0) {
                      formatted = ep.duration > 180 ? `${Math.round(ep.duration / 60)}m` : `${ep.duration}m`;
                    } else {
                      const str = String(ep.duration).trim();
                      if (
                        !str ||
                        str.toLowerCase().includes('nan') ||
                        str.toLowerCase().includes('null') ||
                        str.toLowerCase().includes('undefined')
                      ) {
                        return null;
                      }
                      if (str.endsWith('m') || str.includes('min')) {
                        formatted = str;
                      } else if (str.includes(':')) {
                        const parts = str.split(':').map(Number);
                        if (!parts.some(isNaN) && parts.length >= 2) {
                          formatted = `${parts[0]}m`;
                        }
                      } else {
                        const num = Number(str);
                        if (!isNaN(num) && num > 0) {
                          formatted = num > 180 ? `${Math.round(num / 60)}m` : `${num}m`;
                        }
                      }
                    }
                    if (!formatted || formatted.includes('NaN')) return null;
                    return (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-[9px] font-bold text-[#94A3B8] rounded backdrop-blur-sm">
                        {formatted}
                      </div>
                    );
                  })()}
                </div>

                {/* Center: Title & Episode Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className={`text-xs font-black tracking-wide ${
                        isEpUpcoming
                          ? 'text-[#00CFFF]'
                          : isPlaying
                          ? 'text-[#00CFFF]'
                          : 'text-[#1683FF]'
                      }`}
                    >
                      Episode {String(ep.episodeNumber).padStart(2, '0')}
                    </span>
                    {isEpUpcoming ? (
                      <span className="px-1.5 py-0.5 bg-[#1683FF]/20 border border-[#1683FF]/40 text-[#00CFFF] text-[9px] font-black uppercase rounded shadow-sm">
                        Upcoming
                      </span>
                    ) : isPlaying ? (
                      <span className="px-1.5 py-0.5 bg-[#1683FF] text-white text-[9px] font-black uppercase rounded shadow-sm">
                        Playing
                      </span>
                    ) : null}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-[#F8FAFC] group-hover:text-white truncate">
                    {ep.title || `Episode ${ep.episodeNumber}`}
                  </h4>

                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    {isEpUpcoming ? (
                      <ScheduledEpisodeMeta
                        dayOfWeek={ep.dayOfWeek}
                        releaseTime={ep.releaseTime}
                        airDate={ep.airDate}
                        language={ep.language}
                      />
                    ) : (
                      <p className="line-clamp-1">
                        {ep.description ||
                          `In episode ${ep.episodeNumber}, intense revelations and tactical skirmishes escalate as key heroes unfold new power.`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions (Download & Status) */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEpUpcoming ? (
                    <div className="px-2.5 py-1 rounded-lg bg-[#1683FF]/10 border border-[#1683FF]/25 text-[#00CFFF] text-xs font-bold shrink-0">
                      Scheduled
                    </div>
                  ) : (
                    <>
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
                        className="p-2 rounded-xl bg-[#081426] hover:bg-emerald-600 hover:text-white text-[#94A3B8] border border-white/10 hover:border-emerald-500/50 transition-all"
                        title={`Download Episode ${ep.episodeNumber}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isWatched
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : isPlaying
                            ? 'bg-[#1683FF]/20 border-[#1683FF] text-[#00CFFF]'
                            : 'border-white/20 text-transparent'
                        }`}
                        title={isWatched ? 'Watched' : isPlaying ? 'Playing' : 'Unwatched'}
                      >
                        {isWatched ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : isPlaying ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00CFFF]" />
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
          {filteredEpisodes.map((ep) => {
            const isPlaying = currentEpisodeNumber === ep.episodeNumber;
            const isWatched = watchedEpisodeNumbers.includes(ep.episodeNumber);
            const isEpUpcoming = ep.status === 'upcoming' || Boolean(ep.isUpcoming);

            return (
              <button
                key={ep.id || ep.episodeNumber}
                type="button"
                onClick={() => onSelectEpisode(ep.episodeNumber)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isPlaying
                    ? 'bg-[#1683FF] border-[#00CFFF] text-white shadow-lg shadow-[#1683FF]/40'
                    : isEpUpcoming
                    ? 'bg-[#050A14] border-[#1683FF]/30 text-[#00CFFF] hover:border-[#00CFFF] hover:bg-[#081426]'
                    : isWatched
                    ? 'bg-[#050A14] border-white/5 text-[#64748B] hover:border-[#1683FF]/30 hover:text-white'
                    : 'bg-[#050A14] border-white/10 hover:border-[#1683FF]/50 text-[#F8FAFC] hover:bg-[#081426]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-xs font-bold font-mono ${
                      isPlaying
                        ? 'text-white'
                        : isEpUpcoming
                        ? 'text-[#00CFFF]'
                        : 'text-[#00CFFF]'
                    }`}
                  >
                    EP {ep.episodeNumber}
                  </span>
                  {isWatched && !isPlaying ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : null}
                </div>
                <div className="text-[11px] truncate font-semibold text-[#F8FAFC] group-hover:text-white">
                  {ep.title || `Episode ${ep.episodeNumber}`}
                </div>
                {isEpUpcoming && (
                  <div className="mt-1.5 px-1.5 py-0.5 rounded bg-[#1683FF]/15 border border-[#1683FF]/30 text-[#00CFFF] text-[10px] font-semibold flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-[#00CFFF] shrink-0" />
                    <span className="truncate">
                      {ep.airDate || (ep.dayOfWeek ? `${ep.dayOfWeek.slice(0, 3)}${ep.releaseTime ? ` · ${ep.releaseTime}` : ''}` : 'Scheduled')}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
