import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAnimeBySlug, getAnimeById } from '../lib/firestore/anime';
import { getPublishedEpisodesByAnimeId } from '../lib/firestore/episodes';
import type { Anime, ZipDownloadPackage } from '../types/anime';
import type { Episode } from '../types/episode';
import {
  formatEpisodeDownloads,
  resolveAnimeZipPackages,
  type FormattedEpisodeDownload,
} from '../lib/downloads';
import { executeDownloadRedirect } from '../lib/downloadRedirect';
import { isValidSafeUrl } from '../lib/security';
import { generateAnimeSeoMetadata } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import {
  Download,
  FolderArchive,
  Play,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface AnimeDownloadViewProps {
  slug: string;
  initialSeason?: number;
  initialEpisode?: number;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

export const AnimeDownloadView: React.FC<AnimeDownloadViewProps> = ({
  slug,
  initialSeason,
  initialEpisode,
  navigate,
  onShowMessage,
}) => {
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    if (initialSeason !== undefined && initialSeason > 0) return initialSeason;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('season');
      if (p) {
        const parsed = parseInt(p, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 1;
  });

  const [highlightedEpNumber] = useState<number | null>(() => {
    if (initialEpisode !== undefined && initialEpisode > 0) return initialEpisode;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('episode');
      if (p) {
        const parsed = parseInt(p, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return null;
  });

  const [episodeSearch, setEpisodeSearch] = useState('');

  const seoMetadata = useMemo(() => {
    if (!anime) return null;
    return generateAnimeSeoMetadata(anime, {
      isDownload: true,
      siteName: 'ZYNOX ANIME',
    });
  }, [anime]);

  usePageSeo(seoMetadata);

  const fetchAnimeAndEpisodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let animeData = await getAnimeBySlug(slug);
      if (!animeData) {
        animeData = await getAnimeById(slug);
      }
      if (!animeData) {
        setError('Anime not found.');
        return;
      }

      setAnime(animeData);

      if (animeData.id) {
        const epList = await getPublishedEpisodesByAnimeId(animeData.id);
        setEpisodes(epList);

        if (!initialSeason && epList.length > 0) {
          const availableSeasons = Array.from(
            new Set(epList.map((e) => Number(e.seasonNumber || e.season || 1)))
          ).sort((a, b) => a - b);
          if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason)) {
            setSelectedSeason(availableSeasons[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching download data:', err);
      setError('Failed to load anime downloads.');
    } finally {
      setLoading(false);
    }
  }, [slug, initialSeason]);

  useEffect(() => {
    fetchAnimeAndEpisodes();
  }, [fetchAnimeAndEpisodes]);

  useEffect(() => {
    if (!loading && highlightedEpNumber) {
      const el = document.getElementById(`episode-row-${highlightedEpNumber}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [loading, highlightedEpNumber]);

  const seasonsList = useMemo(() => {
    if (!anime) return [];
    if (anime.seasonsList && anime.seasonsList.length > 0) {
      return anime.seasonsList;
    }
    const derivedSeasonNums: number[] = Array.from(
      new Set(episodes.map((e) => Number(e.seasonNumber || e.season || 1)))
    )
      .map(Number)
      .sort((a, b) => a - b);

    if (derivedSeasonNums.length > 0) {
      return derivedSeasonNums.map((num) => ({
        seasonNumber: num,
        title: `Season ${num}`,
        totalEpisodes: episodes.filter(
          (e) => Number(e.seasonNumber || e.season || 1) === num
        ).length,
      }));
    }

    return [{ seasonNumber: 1, title: 'Season 1', totalEpisodes: episodes.length }];
  }, [anime, episodes]);

  const zipPackages: ZipDownloadPackage[] = useMemo(() => {
    if (!anime) return [];
    return resolveAnimeZipPackages(anime, selectedSeason);
  }, [anime, selectedSeason]);

  const formattedEpisodes: FormattedEpisodeDownload[] = useMemo(() => {
    if (!anime) return [];
    const seasonEps = episodes.filter(
      (e) => Number(e.seasonNumber || e.season || 1) === Number(selectedSeason)
    );
    return seasonEps.map((ep) => formatEpisodeDownloads(ep, anime));
  }, [episodes, anime, selectedSeason]);

  const displayedEpisodes = useMemo(() => {
    if (!episodeSearch.trim()) return formattedEpisodes;
    const query = episodeSearch.trim().toLowerCase();
    return formattedEpisodes.filter((ep) => {
      const numMatch = ep.episodeNumber.toString() === query;
      const titleMatch = ep.title.toLowerCase().includes(query);
      return numMatch || titleMatch;
    });
  }, [formattedEpisodes, episodeSearch]);

  const handleDownload = (url: string | undefined, label: string) => {
    if (!url || !url.trim()) {
      onShowMessage?.(`Download link for ${label} is not available.`);
      return;
    }
    if (!isValidSafeUrl(url)) {
      onShowMessage?.('Invalid download link URL.');
      return;
    }
    executeDownloadRedirect(url, label, onShowMessage);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-24 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[#0B1324] border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 space-y-4">
        <ErrorState
          title="Download Unavailable"
          message={error || 'We could not locate download links for this anime.'}
          onRetry={fetchAnimeAndEpisodes}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="h-10 px-4 bg-[#0B1324] border border-white/10 hover:bg-[#101A30] text-white font-semibold text-xs rounded-xl cursor-pointer"
          >
            Browse Anime
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-[#050A14] sticky top-14 z-30">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(`/anime/${anime.slug || anime.id}`)}
              className="w-9 h-9 rounded-xl bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Back to anime"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {anime.title}
              </h1>
              <p className="text-[11px] text-[#94A3B8]">Downloads</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const ep = episodes[0];
              if (ep) {
                navigate(`/anime/${anime.slug}/episode/${ep.episodeNumber}`);
              } else {
                navigate(`/anime/${anime.slug}`);
              }
            }}
            className="h-9 px-3 sm:px-3.5 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Watch</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-4">
        {/* Anime Summary Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0B1324] border border-white/10 min-w-0">
          <div className="w-12 sm:w-14 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-[#050A14] border border-white/10">
            <img
              src={anime.poster || FALLBACK_POSTER}
              alt={anime.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {anime.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
              <span className="font-semibold text-white">Season {selectedSeason}</span>
              <span>&bull;</span>
              <span>{formattedEpisodes.length} Episodes</span>
              {anime.audioLanguage && (
                <>
                  <span>&bull;</span>
                  <span className="text-[#1E88FF] font-medium">{anime.audioLanguage}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector Tabs */}
        {seasonsList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {seasonsList.map((s) => {
              const isActive = Number(s.seasonNumber) === Number(selectedSeason);
              return (
                <button
                  key={`season-${s.seasonNumber}`}
                  type="button"
                  onClick={() => setSelectedSeason(s.seasonNumber)}
                  className={`h-9 px-3.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer border shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1E88FF] text-white border-[#1E88FF]'
                      : 'bg-[#0B1324] text-[#94A3B8] hover:text-white border-white/10'
                  }`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Full Season Zip Batch */}
        {zipPackages.length > 0 && (
          <div className="space-y-2">
            {zipPackages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="p-3 rounded-xl bg-[#0B1324] border border-amber-500/25 flex items-center justify-between gap-2.5 min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {pkg.title || `Season ${selectedSeason} Batch Zip`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDownload(pkg.url, pkg.title || `Season ${selectedSeason} Batch Zip`)
                  }
                  className="h-9 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Download Zip
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Episodes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs sm:text-sm font-bold text-white shrink-0">
              Episodes ({displayedEpisodes.length})
            </div>

            <div className="relative w-40 sm:w-52 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                placeholder="Search episode..."
                aria-label="Search episodes"
                className="w-full h-9 bg-[#0B1324] border border-white/10 rounded-xl pl-8 pr-3 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#1E88FF] transition-colors"
              />
            </div>
          </div>

          {displayedEpisodes.length === 0 ? (
            <EmptyState
              icon={<Download className="w-6 h-6 text-[#1E88FF]" />}
              title="No matching episodes"
              description="Try another episode number or clear your filter."
              actionLabel={episodeSearch ? 'Clear Filter' : undefined}
              onAction={episodeSearch ? () => setEpisodeSearch('') : undefined}
              className="p-8"
            />
          ) : (
            <div className="space-y-1.5">
              {/* Header */}
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-white/10">
                <span>EP</span>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="w-[72px] sm:w-24 text-center">720P</span>
                  <span className="w-[72px] sm:w-24 text-center">1080P</span>
                </div>
              </div>

              {/* Rows */}
              {displayedEpisodes.map((epItem) => {
                const isHighlighted = highlightedEpNumber === epItem.episodeNumber;
                const link720 = epItem.resolutions['720p'];
                const link1080 = epItem.resolutions['1080p'];
                const has720 = Boolean(link720?.url || epItem.primaryUrl);
                const has1080 = Boolean(link1080?.url || epItem.primaryUrl);

                return (
                  <div
                    key={`ep-${epItem.episodeNumber}`}
                    id={`episode-row-${epItem.episodeNumber}`}
                    className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 rounded-xl border transition-colors min-w-0 ${
                      isHighlighted
                        ? 'bg-[#1E88FF]/15 border-[#1E88FF]'
                        : 'bg-[#0B1324] hover:bg-[#101A30] border-white/10'
                    }`}
                  >
                    <div className="font-mono text-xs sm:text-sm font-bold text-white truncate min-w-0">
                      EP {epItem.episodeNumber}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            link720?.url || epItem.primaryUrl,
                            `${anime.title} - EP ${epItem.episodeNumber} (720p)`
                          )
                        }
                        disabled={!has720}
                        className="w-[72px] sm:w-24 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                        title={`Download EP ${epItem.episodeNumber} (720p)`}
                      >
                        <Download className="w-3 h-3 shrink-0" />
                        <span>720p</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            link1080?.url || epItem.primaryUrl,
                            `${anime.title} - EP ${epItem.episodeNumber} (1080p)`
                          )
                        }
                        disabled={!has1080}
                        className="w-[72px] sm:w-24 h-8 rounded-lg bg-[#1E88FF]/15 hover:bg-[#1E88FF] text-[#1E88FF] hover:text-white border border-[#1E88FF]/30 text-xs font-semibold transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                        title={`Download EP ${epItem.episodeNumber} (1080p)`}
                      >
                        <Download className="w-3 h-3 shrink-0" />
                        <span>1080p</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
