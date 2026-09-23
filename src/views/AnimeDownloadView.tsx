import React, { useState, useEffect, useMemo } from 'react';
import { getAnimeBySlug } from '../lib/firestore/anime';
import { getPublishedEpisodesByAnimeId } from '../lib/firestore/episodes';
import type { Anime, ZipDownloadPackage } from '../types/anime';
import type { Episode } from '../types/episode';
import {
  formatEpisodeDownloads,
  resolveAnimeZipPackages,
  type FormattedEpisodeDownload,
} from '../lib/downloads';
import { executeDownloadRedirect } from '../lib/downloadRedirect';
import { generateAnimeSeoMetadata } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
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

  // Active season selection
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

  // Highlighted episode from URL (e.g. ?episode=5)
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

  // Search/Filter episodes
  const [episodeSearch, setEpisodeSearch] = useState('');

  // SEO metadata for crawler head tags only (clean, no UI text)
  const seoMetadata = useMemo(() => {
    if (!anime) return null;
    return generateAnimeSeoMetadata(anime, {
      isDownload: true,
      siteName: 'ZYNOX ANIME',
    });
  }, [anime]);

  usePageSeo(seoMetadata);

  // Fetch Anime and its Episodes
  useEffect(() => {
    let isMounted = true;

    const fetchAnimeAndEpisodes = async () => {
      try {
        setLoading(true);
        setError(null);

        const animeData = await getAnimeBySlug(slug);
        if (!animeData) {
          if (isMounted) setError('Anime not found.');
          return;
        }

        if (isMounted) setAnime(animeData);

        if (animeData.id) {
          const epList = await getPublishedEpisodesByAnimeId(animeData.id);
          if (isMounted) {
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
        }
      } catch (err: any) {
        console.error('Error fetching download data:', err);
        if (isMounted) setError('Failed to load anime downloads.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnimeAndEpisodes();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Scroll to highlighted episode when loaded
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

  // Handle season list
  const seasonsList = useMemo(() => {
    if (!anime) return [];
    if (anime.seasonsList && anime.seasonsList.length > 0) {
      return anime.seasonsList;
    }
    const derivedSeasonNums: number[] = Array.from(
      new Set(episodes.map((e) => Number(e.seasonNumber || e.season || 1)))
    ).map(Number).sort((a, b) => a - b);

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

  // Resolve Zip Packages for current season
  const zipPackages: ZipDownloadPackage[] = useMemo(() => {
    if (!anime) return [];
    return resolveAnimeZipPackages(anime, selectedSeason);
  }, [anime, selectedSeason]);

  // Format all episode downloads for active season
  const formattedEpisodes: FormattedEpisodeDownload[] = useMemo(() => {
    if (!anime) return [];
    const seasonEps = episodes.filter(
      (e) => Number(e.seasonNumber || e.season || 1) === Number(selectedSeason)
    );
    return seasonEps.map((ep) => formatEpisodeDownloads(ep, anime));
  }, [episodes, anime, selectedSeason]);

  // Filter episodes by search
  const displayedEpisodes = useMemo(() => {
    if (!episodeSearch.trim()) return formattedEpisodes;
    const query = episodeSearch.trim().toLowerCase();
    return formattedEpisodes.filter((ep) => {
      const numMatch = ep.episodeNumber.toString() === query;
      const titleMatch = ep.title.toLowerCase().includes(query);
      return numMatch || titleMatch;
    });
  }, [formattedEpisodes, episodeSearch]);

  // Direct download click
  const handleDownload = (url: string | undefined, label: string) => {
    if (!url || !url.trim()) {
      onShowMessage?.(`Download link for ${label} is not available.`);
      return;
    }
    executeDownloadRedirect(url, label, onShowMessage);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 rounded-xl bg-[#1683FF]/15 border border-[#1683FF]/30 flex items-center justify-center animate-pulse">
          <Download className="w-4 h-4 text-[#1683FF]" />
        </div>
        <p className="text-xs text-[#94A3B8]">Loading downloads...</p>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-base font-bold text-white">Download Not Available</h2>
        <p className="text-xs text-[#94A3B8]">
          {error || 'We could not locate download links for this anime.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="px-4 py-2 bg-[#1683FF] hover:bg-[#2196FF] text-white font-bold text-xs rounded-xl transition-all"
        >
          Browse Anime
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top Bar */}
      <div className="border-b border-white/5 bg-[#050A14]/90 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/anime/${anime.slug || anime.id}`)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="Back to anime"
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
            className="px-3.5 py-1.5 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Watch Online</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Simple Anime Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0B1322] border border-white/5">
          <div className="w-12 sm:w-14 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-[#050A14] border border-white/10">
            {anime.poster ? (
              <img
                src={anime.poster}
                alt={anime.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#64748B] text-xs">
                No Poster
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {anime.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
              <span className="font-semibold text-white">Season {selectedSeason}</span>
              <span>•</span>
              <span>{formattedEpisodes.length} Episodes</span>
              {anime.audioLanguage && (
                <>
                  <span>•</span>
                  <span className="text-cyan-400">{anime.audioLanguage}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector Tabs (If more than 1 season) */}
        {seasonsList.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {seasonsList.map((s) => {
              const isActive = Number(s.seasonNumber) === Number(selectedSeason);
              return (
                <button
                  key={`season-${s.seasonNumber}`}
                  type="button"
                  onClick={() => setSelectedSeason(s.seasonNumber)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#1683FF] text-white border-[#1683FF] shadow-sm'
                      : 'bg-[#0B1322] text-[#94A3B8] hover:text-white border-white/5'
                  }`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Full Season Zip Batch (If Available) */}
        {zipPackages.length > 0 && (
          <div className="space-y-2">
            {zipPackages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="p-3 rounded-xl bg-[#0B1322] border border-amber-500/20 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {pkg.title || `Season ${selectedSeason} Batch Zip`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(pkg.url, pkg.title || `Season ${selectedSeason} Batch Zip`)}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shrink-0 cursor-pointer"
                >
                  Download Zip
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Episodes Section */}
        <div className="space-y-3">
          {/* Header & Search */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold text-white">
              Episodes ({displayedEpisodes.length})
            </div>

            <div className="relative w-40 sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                placeholder="Search episode..."
                className="w-full bg-[#0B1322] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#1683FF] transition-colors"
              />
            </div>
          </div>

          {displayedEpisodes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0B1322] border border-white/5 text-center text-xs text-[#94A3B8]">
              No episodes match your search.
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Clean Table Header */}
              <div className="flex items-center justify-between px-4 py-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-white/5">
                <span>EP</span>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="w-20 sm:w-24 text-center">720P</span>
                  <span className="w-20 sm:w-24 text-center">1080P</span>
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
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                      isHighlighted
                        ? 'bg-[#1683FF]/15 border-[#1683FF] shadow-sm'
                        : 'bg-[#0B1322] hover:bg-[#0E1729] border-white/5'
                    }`}
                  >
                    {/* Episode Number */}
                    <div className="font-mono text-xs sm:text-sm font-bold text-white tracking-wide">
                      EP- {epItem.episodeNumber}
                    </div>

                    {/* 720p and 1080p Download Buttons */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            link720?.url || epItem.primaryUrl,
                            `${anime.title} - EP ${epItem.episodeNumber} (720p)`
                          )
                        }
                        disabled={!has720}
                        className="w-20 sm:w-24 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5"
                        title={`Download EP ${epItem.episodeNumber} (720p)`}
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
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
                        className="w-20 sm:w-24 py-1.5 rounded-lg bg-[#1683FF]/15 hover:bg-[#1683FF] text-cyan-400 hover:text-white border border-[#1683FF]/30 text-xs font-bold transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        title={`Download EP ${epItem.episodeNumber} (1080p)`}
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
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
