import React, { useEffect, useState, useMemo, useRef } from 'react';
import type { Anime } from '../types/anime';
import type { Episode } from '../types/episode';
import type { WatchlistStatus, WatchProgress } from '../types/library';
import type { CmsSeoSettings } from '../types/cms';
import { useAuth } from '../lib/auth';
import {
  getAnimeBySlug,
  getAnimeById,
  getPublishedAnimes,
  getCachedPublishedAnimes,
  getLocalStoredAnimes,
  incrementAnimeViews,
} from '../lib/firestore/anime';
import { getPublishedEpisodesByAnimeId } from '../lib/firestore/episodes';
import { getCmsSeoSettings } from '../lib/firestore/cms';
import { getCachedSiteSettings } from '../lib/firestore/site-settings';
import { withTimeout } from '../lib/firestore/fast-cache';
import { DEFAULT_ANIMES } from '../data/defaultCatalog';
import {
  toggleFavorite,
  isFavorite,
  setWatchlistStatus,
  removeFromWatchlist,
  getAnimeWatchlistStatus,
  getWatchedEpisodes,
  getContinueWatching,
  isFavoriteCached,
  getAnimeWatchlistStatusCached,
} from '../lib/firestore/user-activity';
import { ShareModal } from '../components/ShareModal';
import { openSystemShare } from '../lib/share';
import { DownloadModal } from '../components/DownloadModal';
import { AnimeCard } from '../components/AnimeCard';
import { EpisodeSelector } from '../components/EpisodeSelector';
import { AnimeDetailSkeleton } from '../components/SkeletonLoader';
import { CommentSection } from '../components/community/CommentSection';
import {
  resolveEpisodeDownloadUrl,
  executeDownloadRedirect,
  getAllEpisodeDownloadMirrors,
  type DownloadMirror,
} from '../lib/downloadRedirect';
import { isValidSafeUrl } from '../lib/security';
import { generateAnimeSeoMetadata } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  getOptimizedImageUrl,
  getHeroBlurPlaceholder,
  isImagePreloaded,
  markImagePreloaded,
} from '../lib/image-optimizer';
import {
  ArrowLeft,
  Play,
  Star,
  Heart,
  Bookmark,
  Share2,
  AlertCircle,
  Film,
  X,
  Download,
  Sparkles,
  Tv,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';

interface AnimeDetailViewProps {
  slug: string;
  initialSeason?: number | 'all';
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

function findCachedAnimeSynchronously(rawSlug: string): Anime | null {
  if (!rawSlug) return null;
  let decoded = rawSlug;
  try {
    decoded = decodeURIComponent(rawSlug);
  } catch {}
  const clean = decoded.trim();
  const lower = clean.toLowerCase();
  const slugified = lower.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  const pools = [
    ...getLocalStoredAnimes(),
    ...getCachedPublishedAnimes(),
    ...DEFAULT_ANIMES,
  ];
  return (
    pools.find((a) => {
      if (!a || (a as any).isDeleted === true) return false;
      const aSlug = a.slug?.trim()?.toLowerCase();
      const aId = a.id?.trim()?.toLowerCase();
      const aTitle = a.title?.trim()?.toLowerCase();
      return (
        a.slug === clean ||
        a.id === clean ||
        aSlug === lower ||
        aId === lower ||
        aTitle === lower ||
        (Boolean(slugified) && (aSlug === slugified || aId === slugified))
      );
    }) || null
  );
}

export const AnimeDetailView: React.FC<AnimeDetailViewProps> = ({
  slug,
  initialSeason,
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin } = useAuth();
  const initialCached = useMemo(() => findCachedAnimeSynchronously(slug), [slug]);
  const [anime, setAnime] = useState<Anime | null>(initialCached);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [relatedAnimes, setRelatedAnimes] = useState<Anime[]>([]);
  const [watchedEpNumbers, setWatchedEpNumbers] = useState<number[]>([]);
  const [continueProgress, setContinueProgress] = useState<WatchProgress | null>(null);
  const [seoSettings, setSeoSettings] = useState<CmsSeoSettings | null>(null);
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // Active season selection
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | 'all'>(() => {
    if (initialSeason !== undefined) return initialSeason;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('season');
      if (p) {
        const num = parseInt(p, 10);
        if (!isNaN(num)) return num;
      }
    }
    return 'all';
  });

  useEffect(() => {
    if (initialSeason !== undefined) {
      setSelectedSeasonNumber(initialSeason);
    }
  }, [initialSeason]);

  // User state
  const [fav, setFav] = useState(() =>
    initialCached?.id ? isFavoriteCached(initialCached.id) : false
  );
  const [watchlistStatus, setWatchStatus] = useState<WatchlistStatus | null>(() =>
    initialCached?.id ? getAnimeWatchlistStatusCached(initialCached.id) : null
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadMirrors, setDownloadMirrors] = useState<DownloadMirror[]>([]);
  const [downloadModalSubtitle, setDownloadModalSubtitle] = useState('');
  const [heroBannerState, setHeroBannerState] = useState<'placeholder' | 'loaded'>('placeholder');
  const [posterState, setPosterState] = useState<'placeholder' | 'loaded'>('placeholder');
  const heroBackdropRef = useRef<HTMLImageElement | null>(null);
  const posterImgRef = useRef<HTMLImageElement | null>(null);

  // SEO synchronized with Admin SEO Settings & Site Name
  const seoMetadata = useMemo(() => {
    if (!anime) return null;
    const siteCfg = getCachedSiteSettings();
    return generateAnimeSeoMetadata(anime, {
      siteName: siteCfg?.siteName || 'ZYNOX ANIME',
      seoSettings: seoSettings || undefined,
    });
  }, [anime, seoSettings]);
  usePageSeo(seoMetadata);

  // Active season metadata
  const activeSeasonEntry = useMemo(() => {
    if (selectedSeasonNumber === 'all' || !anime?.seasonsList) return null;
    return anime.seasonsList.find((s) => Number(s.seasonNumber) === Number(selectedSeasonNumber)) || null;
  }, [anime?.seasonsList, selectedSeasonNumber]);

  const syncedPosterUrl = useMemo(() => {
    if (!anime) return '';
    const raw = activeSeasonEntry?.poster || anime.poster;
    return getOptimizedImageUrl(raw, { width: 600, fallbackType: 'poster' });
  }, [anime, activeSeasonEntry?.poster]);

  const syncedBannerUrl = useMemo(() => {
    if (!anime) return '';
    const raw = activeSeasonEntry?.banner || anime.banner || activeSeasonEntry?.poster || anime.poster;
    return getOptimizedImageUrl(raw, { width: 1400, fallbackType: 'banner' });
  }, [anime, activeSeasonEntry?.banner, activeSeasonEntry?.poster]);

  useEffect(() => {
    if (!syncedBannerUrl) {
      setHeroBannerState('placeholder');
    } else if (
      isImagePreloaded(syncedBannerUrl) ||
      (heroBackdropRef.current?.src === syncedBannerUrl &&
        heroBackdropRef.current.complete &&
        heroBackdropRef.current.naturalWidth > 0)
    ) {
      markImagePreloaded(syncedBannerUrl);
      setHeroBannerState('loaded');
    } else {
      setHeroBannerState('placeholder');
    }

    if (!syncedPosterUrl) {
      setPosterState('placeholder');
    } else if (
      isImagePreloaded(syncedPosterUrl) ||
      (posterImgRef.current?.src === syncedPosterUrl &&
        posterImgRef.current.complete &&
        posterImgRef.current.naturalWidth > 0)
    ) {
      markImagePreloaded(syncedPosterUrl);
      setPosterState('loaded');
    } else {
      setPosterState('placeholder');
    }
  }, [syncedBannerUrl, syncedPosterUrl]);

  // Fetch Anime details
  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      const cachedMatch = findCachedAnimeSynchronously(slug);
      if (cachedMatch) {
        if (isMounted) {
          setAnime(cachedMatch);
          setLoading(false);
          setError(null);
        }
      } else {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
      }
      if (isMounted) {
        setEpisodesLoading(true);
      }

      try {
        withTimeout(getCmsSeoSettings(), 3000, null)
          .then((s) => {
            if (isMounted && s) setSeoSettings(s);
          })
          .catch(() => {});

        let animeData = cachedMatch;
        if (!animeData) {
          animeData = await withTimeout(getAnimeBySlug(slug), 5000, null);
          if (!animeData) {
            animeData = await withTimeout(getAnimeById(slug), 3500, null);
          }
        }

        if (!animeData) {
          if (isMounted) {
            setError('Anime not found or not published.');
            setLoading(false);
            setEpisodesLoading(false);
          }
          return;
        }

        if (animeData.published === false && !isAdmin) {
          if (isMounted) {
            setError('This anime is currently not published.');
            setLoading(false);
            setEpisodesLoading(false);
          }
          return;
        }

        if (isMounted) {
          setAnime(animeData);
          setLoading(false);
        }

        const animeKey = animeData.id || animeData.slug;
        if (animeKey) {
          incrementAnimeViews(animeKey);

          const epPromise = withTimeout(getPublishedEpisodesByAnimeId(animeKey), 6000, [] as Episode[])
            .then((epList) => {
              if (isMounted) {
                setEpisodes(epList);
                setEpisodesLoading(false);
              }
            })
            .catch(() => {
              if (isMounted) setEpisodesLoading(false);
            });

          const relatedPromise = withTimeout(getPublishedAnimes(), 4500, getCachedPublishedAnimes())
            .then((allAnimes) => {
              if (!isMounted || !animeData) return;
              const related = allAnimes.filter((a) => {
                if (a.id === animeData?.id || a.slug === animeData?.slug) return false;
                const sameStudio = Boolean(
                  animeData?.studio && a.studio && a.studio.toLowerCase() === animeData.studio.toLowerCase()
                );
                const sharedGenre = Boolean(
                  animeData?.genres && a.genres && a.genres.some((g) => animeData?.genres?.includes(g))
                );
                return sameStudio || sharedGenre;
              });
              const fallback = allAnimes.filter(
                (a) => a.id !== animeData?.id && a.slug !== animeData?.slug && !related.some((r) => r.id === a.id)
              );
              setRelatedAnimes([...related, ...fallback].slice(0, 12));
            })
            .catch(() => {});

          const userActivityPromise = Promise.allSettled([
            withTimeout(isFavorite(user?.uid || null, animeKey), 3500, isFavoriteCached(animeKey)),
            withTimeout(getAnimeWatchlistStatus(user?.uid || null, animeKey), 3500, getAnimeWatchlistStatusCached(animeKey)),
            withTimeout(getWatchedEpisodes(user?.uid || null, animeKey), 3500, [] as number[]),
            withTimeout(getContinueWatching(user?.uid || null), 3500, [] as WatchProgress[]),
          ]).then(([favRes, watchRes, watchedRes, contRes]) => {
            if (!isMounted) return;
            if (favRes.status === 'fulfilled') setFav(favRes.value);
            if (watchRes.status === 'fulfilled') setWatchStatus(watchRes.value);
            if (watchedRes.status === 'fulfilled') setWatchedEpNumbers(watchedRes.value);
            if (contRes.status === 'fulfilled') {
              const activeProgress = contRes.value.find(
                (p) => p.animeId === animeData?.id || p.animeSlug === animeData?.slug
              );
              setContinueProgress(activeProgress && !activeProgress.completed ? activeProgress : null);
            }
          });

          await Promise.allSettled([epPromise, relatedPromise, userActivityPromise]);
        } else if (isMounted) {
          setEpisodesLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching anime details:', err);
          if (!cachedMatch) {
            setError('Failed to load anime details.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setEpisodesLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [slug, user?.uid, isAdmin]);

  const handleFavoriteClick = async () => {
    if (!anime?.id) return;
    const newFav = await toggleFavorite(
      user?.uid || null,
      anime.id,
      anime.slug,
      anime.title,
      anime.poster,
      anime.genres
    );
    setFav(newFav);
    onShowMessage?.(newFav ? `Added "${anime.title}" to favorites.` : 'Removed from favorites.');
  };

  const handleWatchlistToggle = async () => {
    if (!anime?.id) return;
    if (watchlistStatus) {
      setWatchStatus(null);
      await removeFromWatchlist(user?.uid || null, anime.id);
      onShowMessage?.(`Removed "${anime.title}" from Watchlist.`);
    } else {
      const newStatus: WatchlistStatus = 'watching';
      setWatchStatus(newStatus);
      await setWatchlistStatus(
        user?.uid || null,
        anime.id,
        anime.slug,
        anime.title,
        anime.poster,
        newStatus,
        anime.genres,
        anime.rating
      );
      onShowMessage?.(`Added "${anime.title}" to Watchlist!`);
    }
  };

  const handleShare = () => {
    const shareTitle = anime?.title || 'Anime';
    const shareText = `Watch ${shareTitle} in Hindi Dub & English Sub on ZYNOX ANIME`;
    openSystemShare({
      title: shareTitle,
      text: shareText,
      url: typeof window !== 'undefined' ? window.location.href : '',
      onShowMessage,
      onFallback: () => setShareOpen(true),
    });
  };

  const handleDownloadClick = (ep?: Episode) => {
    if (anime?.slug || anime?.id) {
      const sParam = selectedSeasonNumber !== 'all' ? `?season=${selectedSeasonNumber}` : '';
      const epParam = ep ? (sParam ? `&episode=${ep.episodeNumber}` : `?episode=${ep.episodeNumber}`) : '';
      navigate(`/anime/${anime.slug || anime.id}/download${sParam}${epParam}`);
      return;
    }

    const targetEp = ep || episodes[0];
    const mirrors = getAllEpisodeDownloadMirrors(targetEp, anime);
    if (mirrors.length > 1) {
      setDownloadMirrors(mirrors);
      setDownloadModalSubtitle(
        targetEp ? `Select quality to download Episode ${targetEp.episodeNumber}` : 'Select download mirror'
      );
      setDownloadModalOpen(true);
      return;
    }

    const dlUrl = mirrors.length === 1 ? mirrors[0].url : resolveEpisodeDownloadUrl(targetEp, anime);
    if (!dlUrl) {
      onShowMessage?.('Download link for this anime/episode has not been added yet.');
      return;
    }

    executeDownloadRedirect(
      dlUrl,
      targetEp ? `${anime?.title || 'Anime'} - Episode ${targetEp.episodeNumber}` : anime?.title,
      onShowMessage
    );
  };

  if (loading) {
    return <AnimeDetailSkeleton />;
  }

  if (error || !anime) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#050A14]">
        <div className="max-w-md w-full bg-[#0B1324] border border-white/10 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#101A30] border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">{error || 'Anime Not Found'}</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              The title you are looking for does not exist, has been unpublished, or the link has changed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="w-full h-11 bg-[#1E88FF] hover:bg-[#1570d8] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse</span>
          </button>
        </div>
      </div>
    );
  }

  // Dynamic visual assets
  const rawPoster = activeSeasonEntry?.poster || anime.poster;
  const rawBanner = activeSeasonEntry?.banner || anime.banner || rawPoster;
  const currentPoster = getOptimizedImageUrl(rawPoster, { width: 600, fallbackType: 'poster' });
  const currentBanner = getOptimizedImageUrl(rawBanner, { width: 1400, fallbackType: 'banner' });
  const detailBlurPlaceholder = getHeroBlurPlaceholder(String(anime.id || anime.slug || anime.title || 'detail'));
  const currentDescription = activeSeasonEntry?.description || anime.description || 'No synopsis available.';

  // Target episode for primary Watch button
  const continueEpNum = continueProgress?.episodeNumber;
  const targetEp = continueEpNum
    ? episodes.find((e) => e.episodeNumber === continueEpNum) || episodes[0]
    : episodes[0];
  const targetEpNum = targetEp?.episodeNumber || 1;
  const targetSeasonNum = targetEp ? targetEp.seasonNumber || targetEp.season || 1 : 1;
  const isContinue = Boolean(continueProgress && continueEpNum);

  // Audio labels derived strictly from Anime model properties
  const audioBadges: string[] = [];
  const rawAudioLang = (anime.audioLanguage || '').toLowerCase();
  const hasHindi =
    rawAudioLang.includes('hindi') ||
    anime.audioTags?.some((t) => t.toLowerCase().includes('hindi')) ||
    anime.languages?.some((l) => l.toLowerCase().includes('hindi'));
  const hasEng =
    rawAudioLang.includes('english') ||
    anime.audioTags?.some((t) => t.toLowerCase().includes('eng')) ||
    anime.languages?.some((l) => l.toLowerCase().includes('english'));
  const hasSub =
    rawAudioLang.includes('sub') ||
    rawAudioLang.includes('japanese') ||
    anime.audioTags?.some((t) => t.toLowerCase().includes('sub')) ||
    anime.languages?.some((l) => l.toLowerCase().includes('japanese'));

  if (hasHindi) audioBadges.push('Hindi Dub');
  if (hasEng) audioBadges.push('English Dub');
  if (hasSub) audioBadges.push('Sub');
  if (audioBadges.length === 0) audioBadges.push('Hindi Dub');

  const safeTrailerUrl = anime.trailerUrl && isValidSafeUrl(anime.trailerUrl) ? anime.trailerUrl : '';

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F8FAFC] overflow-x-clip">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8] min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-[#CBD5E1] hover:text-white font-semibold transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <span className="shrink-0 text-white/30">/</span>
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Browse
            </button>
            <span className="shrink-0 text-white/30">/</span>
            <span className="text-white font-medium truncate">{anime.title}</span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share anime"
            title="Share"
            className="w-9 h-9 rounded-xl bg-[#07111F] hover:bg-[#101A30] border border-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* 1. HEADER / HERO DETAILS CARD */}
        <div className="bg-[#07111F] border border-white/[0.06] rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle Blurred Backdrop inside Card with Immediate Placeholder State */}
          <div
            className="absolute inset-0 pointer-events-none select-none overflow-hidden"
            data-banner-state={heroBannerState}
            style={{
              background:
                'radial-gradient(circle at 75% 25%, rgba(30, 136, 255, 0.16) 0%, rgba(7, 17, 31, 0.92) 55%, #07111F 100%)',
            }}
          >
            <img
              src={detailBlurPlaceholder}
              alt=""
              decoding="sync"
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover scale-110 blur-xl transition-opacity duration-500 ${
                heroBannerState === 'loaded' ? 'opacity-0' : 'opacity-30'
              }`}
            />
            {currentBanner && (
              <img
                ref={heroBackdropRef}
                src={currentBanner}
                alt=""
                referrerPolicy="no-referrer"
                onLoad={() => {
                  markImagePreloaded(currentBanner);
                  setHeroBannerState('loaded');
                }}
                onError={() => setHeroBannerState('placeholder')}
                className={`w-full h-full object-cover blur-md scale-105 transition-opacity duration-500 ${
                  heroBannerState === 'loaded' || isImagePreloaded(currentBanner)
                    ? 'opacity-20'
                    : 'opacity-0'
                }`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/90 to-[#07111F]/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07111F] via-[#07111F]/80 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* Large Poster Container (2:3 aspect) */}
            <div className="relative w-44 sm:w-56 md:w-64 aspect-[2/3] shrink-0 rounded-2xl bg-[#050A14] border border-[#1E88FF]/20 shadow-2xl overflow-hidden group">
              <img
                src={detailBlurPlaceholder}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover scale-110 blur-lg transition-opacity duration-300 ${
                  posterState === 'loaded' || isImagePreloaded(currentPoster) ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <img
                ref={posterImgRef}
                src={currentPoster}
                alt={anime.title}
                referrerPolicy="no-referrer"
                onLoad={() => {
                  markImagePreloaded(currentPoster);
                  setPosterState('loaded');
                }}
                className={`relative w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                  posterState === 'loaded' || isImagePreloaded(currentPoster) ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {anime.rating && (
                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-bold flex items-center gap-1 shadow-md">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{anime.rating}</span>
                </div>
              )}
            </div>

            {/* Info Column */}
            <div className="flex-1 text-center md:text-left space-y-4 w-full min-w-0">
              {/* Metadata Badges Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {anime.type && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1A263D] border border-[#2A3A57] text-white text-xs font-semibold">
                    {anime.type}
                  </span>
                )}
                {anime.year && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#121D33] border border-[#223250] text-[#CBD5E1] text-xs font-medium">
                    {anime.year}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-[#121D33] border border-[#223250] text-[#CBD5E1] text-xs font-medium">
                  {episodes.length || anime.totalEpisodes || 0} Episodes
                </span>
                {anime.status && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#0B2A28] border border-[#145349] text-emerald-400 text-xs font-semibold capitalize">
                    {anime.status}
                  </span>
                )}
                {audioBadges.map((badge) => (
                  <span
                    key={badge}
                    className="px-2.5 py-1 rounded-lg bg-[#0E2444] border border-[#1E4B8A] text-[#3B9BFF] text-xs font-bold"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Title & Japanese Title */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  {anime.title}
                </h1>
                {anime.japaneseTitle && (
                  <p className="text-xs sm:text-sm text-[#94A3B8] font-medium">
                    {anime.japaneseTitle}
                  </p>
                )}
              </div>

              {/* Rating, Studio & Details Line */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs sm:text-sm text-[#94A3B8]">
                {anime.rating && (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{anime.rating}</span>
                  </span>
                )}
                {anime.studio && (
                  <span className="inline-flex items-center gap-1.5 text-[#CBD5E1]">
                    <Tv className="w-3.5 h-3.5 text-[#1E88FF]" />
                    <span>{anime.studio}</span>
                  </span>
                )}
                {anime.season && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#1E88FF]" />
                    <span>
                      {anime.season} {anime.year || ''}
                    </span>
                  </span>
                )}
                {anime.duration && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1E88FF]" />
                    <span>{anime.duration}</span>
                  </span>
                )}
              </div>

              {/* Synopsis */}
              <div className="max-w-3xl mx-auto md:mx-0 pt-1 space-y-1.5">
                <p
                  className={`text-xs sm:text-sm text-[#CBD5E1] leading-relaxed ${
                    !showFullSynopsis ? 'line-clamp-4' : ''
                  }`}
                >
                  {currentDescription}
                </p>
                {currentDescription.length > 240 && (
                  <button
                    type="button"
                    onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                    className="text-xs font-semibold text-[#1E88FF] hover:underline cursor-pointer"
                  >
                    {showFullSynopsis ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>

              {/* Genre Chips */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                  {anime.genres.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => navigate(`/browse?genre=${encodeURIComponent(g)}`)}
                      className="px-3 py-1 rounded-xl bg-[#050A14] hover:bg-[#1E88FF]/20 border border-white/10 hover:border-[#1E88FF]/40 text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/anime/${anime.slug}/episode/${targetEpNum}?season=${targetSeasonNum}`);
                  }}
                  className="h-11 sm:h-12 px-6 bg-[#1E88FF] hover:bg-[#1570d8] text-white text-sm font-bold rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span>{isContinue ? `Continue EP ${targetEpNum}` : 'Watch Now'}</span>
                  {isContinue && continueProgress?.percentage && (
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-white/50"
                      style={{ width: `${continueProgress.percentage}%` }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadClick()}
                  className="h-11 sm:h-12 px-5 bg-[#0C2F2B] hover:bg-[#11423C] border border-[#176459] text-emerald-400 text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleWatchlistToggle}
                  className={`h-11 sm:h-12 px-4 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    watchlistStatus
                      ? 'bg-[#0E2444] border-[#1E88FF] text-[#3B9BFF]'
                      : 'bg-[#050A14] hover:bg-[#101A30] border-[#1E2A42] text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 shrink-0 ${watchlistStatus ? 'fill-current' : ''}`} />
                  <span>{watchlistStatus ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFavoriteClick}
                  title={fav ? 'Favorited' : 'Add to Favorites'}
                  aria-label="Toggle favorite"
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    fav
                      ? 'bg-[#2B1221] border-[#881337] text-rose-400'
                      : 'bg-[#050A14] hover:bg-[#101A30] border-[#1E2A42] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
                </button>

                {safeTrailerUrl && (
                  <button
                    type="button"
                    onClick={() => setShowTrailerModal(true)}
                    className="h-11 sm:h-12 px-4 rounded-xl bg-[#050A14] hover:bg-[#101A30] border border-white/10 text-[#CBD5E1] hover:text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Film className="w-4 h-4 text-[#1E88FF] shrink-0" />
                    <span>Trailer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 1.5 SEASONS POSTER STRIP (displays each season's custom poster when multiple seasons exist) */}
        {anime.seasonsList && anime.seasonsList.length > 1 && (
          <section className="space-y-2.5">
            <div className="h-8 min-h-[32px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
                <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
                  Seasons
                </h2>
              </div>
              <span className="text-xs text-[#94A3B8] font-medium shrink-0">
                {anime.seasonsList.length} Seasons
              </span>
            </div>

            <div className="-mx-4 sm:mx-0">
              <div className="flex items-start gap-[10px] overflow-x-auto no-scrollbar snap-x snap-proximity px-4 sm:px-0 scroll-pl-4 sm:scroll-pl-0 pb-1">
                {[...anime.seasonsList]
                  .sort((a, b) => Number(a.seasonNumber) - Number(b.seasonNumber))
                  .map((s) => {
                    const sNum = Number(s.seasonNumber) || 1;
                    const isActive =
                      selectedSeasonNumber !== 'all' && Number(selectedSeasonNumber) === sNum;
                    const seasonPosterUrl = getOptimizedImageUrl(s.poster || anime.poster, {
                      width: 240,
                      fallbackType: 'poster',
                    });

                    return (
                      <button
                        key={s.id || `season-card-${sNum}`}
                        type="button"
                        onClick={() => {
                          if (s.slug && s.slug !== anime.slug) {
                            navigate(`/anime/${encodeURIComponent(s.slug)}`);
                          } else {
                            setSelectedSeasonNumber(sNum);
                          }
                        }}
                        className="flex-none w-[clamp(96px,26vw,120px)] sm:w-[128px] lg:w-[144px] snap-start text-left group cursor-pointer focus:outline-none"
                      >
                        <div
                          className={`relative aspect-[2/3] w-full rounded-[10px] overflow-hidden bg-[#0B1324] border-2 transition-all duration-150 ${
                            isActive
                              ? 'border-[#1E88FF] shadow-[0_0_16px_rgba(30,136,255,0.35)]'
                              : 'border-white/10 group-hover:border-[#1E88FF]/60'
                          }`}
                        >
                          <img
                            src={seasonPosterUrl}
                            alt={s.title || `Season ${sNum}`}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#050A14]/90 via-[#050A14]/40 to-transparent pointer-events-none" />
                          <span
                            className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${
                              isActive
                                ? 'bg-[#1E88FF] text-white'
                                : 'bg-black/70 text-white border border-white/15'
                            }`}
                          >
                            S{sNum}
                          </span>
                        </div>
                        <div className="mt-[6px] min-w-0">
                          <p
                            className={`text-[12px] font-semibold leading-[16px] truncate ${
                              isActive
                                ? 'text-[#1E88FF]'
                                : 'text-white group-hover:text-[#1E88FF] transition-colors'
                            }`}
                          >
                            {s.title || `Season ${sNum}`}
                          </p>
                          <p className="text-[11px] text-[#94A3B8] truncate leading-tight mt-0.5">
                            {s.totalEpisodes ? `${s.totalEpisodes} Eps` : `Season ${sNum}`}
                            {s.year ? ` · ${s.year}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* 2. EPISODES SELECTOR */}
        <EpisodeSelector
          episodes={episodes}
          animeTitle={anime.title}
          animePoster={currentPoster}
          animeBanner={currentBanner}
          seasonsList={anime.seasonsList}
          currentEpisodeNumber={continueProgress?.episodeNumber}
          watchedEpisodeNumbers={watchedEpNumbers}
          selectedSeason={selectedSeasonNumber}
          isAnimeUpcoming={anime.status === 'upcoming'}
          loading={episodesLoading}
          onSeasonChange={(s) => setSelectedSeasonNumber(s)}
          onSelectEpisode={(epNum, sNum, ep) => {
            const isUpcoming = ep?.status === 'upcoming' || Boolean(ep?.isUpcoming);
            if (isUpcoming && !isAdmin) {
              onShowMessage?.(`Episode ${epNum} is scheduled and airing soon.`);
              return;
            }
            const targetSeason = sNum || (selectedSeasonNumber !== 'all' ? selectedSeasonNumber : 1);
            navigate(`/anime/${anime.slug}/episode/${epNum}?season=${targetSeason}`);
          }}
          onDownloadEpisode={(ep) => handleDownloadClick(ep)}
          onNavigateSeasonAnime={(sSlug) => navigate(`/anime/${encodeURIComponent(sSlug)}`)}
        />

        {/* 3. RELATED ANIME */}
        {relatedAnimes.length > 0 && (
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1E88FF] shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Related Anime
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/browse')}
                className="text-xs font-semibold text-[#1E88FF] hover:underline cursor-pointer shrink-0"
              >
                Explore All
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-[10px] sm:gap-3">
              {relatedAnimes.map((rel) => (
                <AnimeCard
                  key={rel.id || rel.slug}
                  anime={rel}
                  navigate={navigate}
                  onShowMessage={onShowMessage}
                />
              ))}
            </div>
          </section>
        )}

        {/* 4. COMMENTS SECTION */}
        <section className="bg-[#07111F] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
          <CommentSection
            targetType="anime"
            animeId={anime.id || slug}
            animeSlug={anime.slug}
            animeTitle={anime.title}
            onShowMessage={onShowMessage || (() => {})}
            navigate={navigate}
          />
        </section>
      </div>

      {/* TRAILER MODAL */}
      {showTrailerModal && safeTrailerUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-[#0B1324] border border-white/10 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate pr-2">
                <Film className="w-4 h-4 text-[#1E88FF] shrink-0" />
                <span className="truncate">{anime.title} — Trailer</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTrailerModal(false)}
                aria-label="Close trailer"
                className="w-8 h-8 rounded-lg bg-[#101A30] hover:bg-white/10 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe
                src={
                  safeTrailerUrl.includes('watch?v=')
                    ? safeTrailerUrl.replace('watch?v=', 'embed/')
                    : safeTrailerUrl
                }
                title="Anime Trailer"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareOpen && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          title={anime.title}
          url={typeof window !== 'undefined' ? window.location.href : ''}
        />
      )}

      {/* DOWNLOAD MIRRORS MODAL */}
      {downloadModalOpen && (
        <DownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          title={anime.title}
          subtitle={downloadModalSubtitle}
          mirrors={downloadMirrors}
          onShowMessage={onShowMessage}
        />
      )}
    </div>
  );
};
