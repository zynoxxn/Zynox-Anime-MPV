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
import { generateAnimeSeoMetadata, generateAnimeGoogleTags } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  Download,
  FolderArchive,
  Film,
  Play,
  ArrowLeft,
  Search,
  Layers,
  Sparkles,
  Tag,
  Copy,
  Check,
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
  const [copiedTags, setCopiedTags] = useState(false);

  // Dynamic SEO Setup for Google
  const seoMetadata = useMemo(() => {
    if (!anime) return null;
    return generateAnimeSeoMetadata(anime, {
      isDownload: true,
      siteName: 'ZYNOX ANIME',
    });
  }, [anime]);

  usePageSeo(seoMetadata);

  const googleSearchTags = useMemo(() => {
    if (!anime) return [];
    return generateAnimeGoogleTags(anime, { isDownload: true });
  }, [anime]);

  const handleCopyTags = () => {
    if (googleSearchTags.length === 0) return;
    navigator.clipboard.writeText(googleSearchTags.join(', '));
    setCopiedTags(true);
    if (onShowMessage) onShowMessage('Google Search tags copied to clipboard!');
    setTimeout(() => setCopiedTags(false), 2000);
  };

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

  // Filter episodes by quick search
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
        <div className="w-10 h-10 rounded-xl bg-[#1683FF]/15 border border-[#1683FF]/30 flex items-center justify-center animate-pulse">
          <Download className="w-5 h-5 text-[#1683FF]" />
        </div>
        <p className="text-xs font-bold text-[#94A3B8]">Loading Downloads...</p>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Film className="w-10 h-10 mx-auto text-[#64748B]" />
        <h2 className="text-lg font-bold text-white">Download Not Available</h2>
        <p className="text-xs text-[#94A3B8]">
          {error || 'We could not locate download links for this anime.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="px-4 py-2 bg-[#1683FF] hover:bg-[#2196FF] text-white font-bold text-xs rounded-xl transition-all shadow-lg"
        >
          Browse All Anime
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top Header */}
      <div className="border-b border-white/5 bg-[#050A14]/90 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/anime/${anime.slug || anime.id}`)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-white truncate">
                {anime.title}
              </h1>
              <p className="text-[11px] text-[#94A3B8]">Downloads (720p & 1080p)</p>
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
            className="px-3.5 py-1.5 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-[#1683FF]/20 transition-all shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Watch Online</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Simple Anime Summary */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#0B1322] border border-white/10 shadow-md">
          <div className="w-12 sm:w-14 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-[#050A14] border border-white/10">
            {anime.poster ? (
              <img
                src={anime.poster}
                alt={anime.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#64748B]">
                <Film className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {anime.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#94A3B8]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                720p & 1080p HD
              </span>
              <span>•</span>
              <span>{episodes.length} Episodes</span>
              {anime.audioLanguage && (
                <>
                  <span>•</span>
                  <span className="text-[#00CFFF]">{anime.audioLanguage}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector (If more than 1 season) */}
        {seasonsList.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {seasonsList.map((s) => {
              const isActive = Number(s.seasonNumber) === Number(selectedSeason);
              return (
                <button
                  key={`season-${s.seasonNumber}`}
                  type="button"
                  onClick={() => setSelectedSeason(s.seasonNumber)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isActive
                      ? 'bg-[#1683FF] text-white border-[#1683FF] shadow-sm'
                      : 'bg-[#0B1322] text-[#94A3B8] hover:text-white border-white/10'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Full Season Zip Batch (If Available) */}
        {zipPackages.length > 0 && (
          <div className="space-y-2 pt-1">
            {zipPackages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="p-3 rounded-xl bg-[#0B1322] border border-amber-500/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {pkg.title || `Zip Package ${idx + 1}`}
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {pkg.episodesRange || 'All Episodes'} • {pkg.quality || 'HD Batch'} • {pkg.size || 'Complete Pack'}
                      {pkg.host ? ` • ${pkg.host}` : ''}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(pkg.url, pkg.title)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Zip</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Episode Downloads List */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <Film className="w-4 h-4 text-[#1683FF]" />
              <span>Select Episode to Download</span>
            </h3>

            {/* Quick episode filter */}
            <div className="relative w-36 sm:w-44">
              <Search className="w-3 h-3 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                placeholder="Find episode..."
                className="w-full bg-[#0B1322] border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#1683FF]"
              />
            </div>
          </div>

          {displayedEpisodes.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#0B1322] border border-white/5 text-center text-xs text-[#94A3B8]">
              No episodes match your search.
            </div>
          ) : (
            <div className="space-y-2">
              {displayedEpisodes.map((epItem) => {
                const isHighlighted = highlightedEpNumber === epItem.episodeNumber;
                const link720 = epItem.resolutions['720p'];
                const link1080 = epItem.resolutions['1080p'];

                return (
                  <div
                    key={`ep-${epItem.episodeNumber}`}
                    id={`episode-row-${epItem.episodeNumber}`}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isHighlighted
                        ? 'bg-[#1683FF]/15 border-[#1683FF] shadow-sm ring-1 ring-[#1683FF]'
                        : 'bg-[#0B1322] hover:bg-[#0F1A2D] border-white/5'
                    }`}
                  >
                    {/* Episode Label */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-12 h-7 rounded-md bg-[#1683FF]/15 border border-[#1683FF]/30 text-[#00CFFF] flex items-center justify-center shrink-0 font-black text-xs">
                        EP {epItem.episodeNumber}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-white truncate">
                        {epItem.title}
                      </span>
                    </div>

                    {/* Quality Buttons: ONLY 720p and 1080p */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                      {/* 720p HD Button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            link720?.url,
                            `${anime.title} - Episode ${epItem.episodeNumber} (720p)`
                          )
                        }
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        title={`Download Episode ${epItem.episodeNumber} in 720p HD`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>720p HD</span>
                        <span className="text-[10px] font-normal opacity-85">
                          ({link720?.size || '~240MB'})
                        </span>
                      </button>

                      {/* 1080p Full HD Button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            link1080?.url,
                            `${anime.title} - Episode ${epItem.episodeNumber} (1080p)`
                          )
                        }
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-[#1683FF] hover:bg-[#0066ff] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        title={`Download Episode ${epItem.episodeNumber} in 1080p Full HD`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>1080p FHD</span>
                        <span className="text-[10px] font-normal opacity-85">
                          ({link1080?.size || '~480MB'})
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Organic Google Search Tags & Indexing Metadata */}
          {googleSearchTags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5 bg-[#070D19]/60 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#1683FF]/10 border border-[#1683FF]/30 flex items-center justify-center text-[#1683FF]">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Google Search Tags & Download Keywords
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTags}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer self-start sm:self-auto"
                >
                  {copiedTags ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#94A3B8]" />
                      <span>Copy Search Tags</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {googleSearchTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] text-[#94A3B8] bg-[#050A14] border border-white/5 px-2.5 py-1 rounded-md hover:border-[#1683FF]/40 hover:text-white transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <p className="text-[10px] text-[#94A3B8]/60 mt-3 leading-relaxed">
                Download {anime.title} episodes with high speed resume support. Compatible with VLC, MX Player, and IDM. Full season batch zip folders available on Google Drive and Mega.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
