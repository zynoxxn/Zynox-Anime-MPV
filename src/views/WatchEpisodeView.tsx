import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import type { Anime } from '../types/anime';
import type { Episode, VideoSource } from '../types/episode';
import type { CmsSeoSettings } from '../types/cms';
import { useAuth } from '../lib/auth';
import {
  getAnimeBySlug,
  getAnimeById,
  getPublishedAnimes,
  getCachedPublishedAnimes,
  getLocalStoredAnimes,
  incrementAnimeViews,
  isAnimeDeleted,
  isHentaiAnime,
} from '../lib/firestore/anime';
import {
  getEpisodeById,
  getPublishedEpisodesByAnimeId,
  getCachedPublishedEpisodesByAnimeId,
  incrementEpisodeViews,
  isMockVideoUrl,
} from '../lib/firestore/episodes';
import { withTimeout } from '../lib/firestore/fast-cache';
import { DEFAULT_ANIMES } from '../data/defaultCatalog';
import { getCmsSeoSettings } from '../lib/firestore/cms';
import { getCachedSiteSettings } from '../lib/firestore/site-settings';
import {
  saveWatchProgress,
  markEpisodeWatched,
  getWatchedEpisodes,
  getContinueWatching,
  toggleFavorite,
  isFavorite,
  isFavoriteCached,
  setWatchlistStatus,
  removeFromWatchlist,
  getAnimeWatchlistStatus,
  getAnimeWatchlistStatusCached,
} from '../lib/firestore/user-activity';
import type { WatchProgress, WatchlistStatus } from '../types/library';
import { extractIframeSrc, transformStreamUrl } from '../lib/video-hosts';
import { openSystemShare } from '../lib/share';
import { ReportEpisodeModal } from '../components/ReportEpisodeModal';
import { ShareModal } from '../components/ShareModal';
import { CommentSection } from '../components/community/CommentSection';
import { AnimeCard } from '../components/AnimeCard';
import { AdminSelect } from '../components/admin/AdminSelect';
import {
  executeDownloadRedirect,
  getAllEpisodeDownloadMirrors,
  type DownloadMirror,
} from '../lib/downloadRedirect';
import {
  formatDurationMinutes,
  getUniqueServerLabels,
  formatAndSortDownloadMirrors,
} from '../lib/format-meta';
import { getOptimizedImageUrl } from '../lib/image-optimizer';
import { generateAnimeSeoMetadata } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Check,
  CheckCircle2,
  Bookmark,
  Heart,
  Share2,
  Lock,
  LayoutGrid,
  List,
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FastForward,
  Monitor,
  Info,
  MoreHorizontal,
  Film,
  X,
  Play,
  Shield,
  Zap,
  Layers,
  Sparkles,
} from 'lucide-react';

interface WatchEpisodeViewProps {
  animeSlug: string;
  episodeNumberOrId: string;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

type AudioCategory = 'sub' | 'dub';

function safeDecodeParam(val: string): string {
  if (!val) return '';
  try {
    return decodeURIComponent(val).trim();
  } catch {
    return val.trim();
  }
}

function selectRelatedSeries(currentAnime: Anime | null, catalog: Anime[], limit = 12): Anime[] {
  if (!currentAnime || !catalog.length) return [];
  const allowAdult = isHentaiAnime(currentAnime);
  const currentGenres = new Set(
    (currentAnime.genres || []).map((g) => g.toLowerCase().trim()).filter(Boolean)
  );
  const currentStudio = (currentAnime.studio || '').toLowerCase().trim();

  const seen = new Set<string>();
  const candidates = catalog.filter((a) => {
    if (!a) return false;
    const key = String(a.id || a.slug || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    if (a.id === currentAnime.id || a.slug === currentAnime.slug) return false;
    if (isAnimeDeleted(a.id) || (a.slug && isAnimeDeleted(a.slug))) return false;
    if (!allowAdult && isHentaiAnime(a)) return false;
    seen.add(key);
    return true;
  });

  const scored = candidates
    .map((a) => {
      const sameStudio = Boolean(
        currentStudio && a.studio && a.studio.toLowerCase().trim() === currentStudio
      );
      const sharedGenreCount = (a.genres || []).reduce(
        (acc, g) => acc + (currentGenres.has(g.toLowerCase().trim()) ? 1 : 0),
        0
      );
      const score = sharedGenreCount * 10 + (sameStudio ? 8 : 0);
      return { anime: a, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (Number(b.anime.rating) || 0) - (Number(a.anime.rating) || 0);
    });

  return scored.slice(0, limit).map((item) => item.anime);
}

function findCachedAnimeSynchronously(rawSlug: string): Anime | null {
  const clean = safeDecodeParam(rawSlug);
  if (!clean) return null;
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

function matchEpisodeInList(
  episodes: Episode[],
  episodeNumberOrId: string,
  seasonNum?: number
): Episode | null {
  if (!episodes || episodes.length === 0) return null;
  const cleanEp = safeDecodeParam(episodeNumberOrId);
  const parsedEpNum = Number(cleanEp);

  if (!isNaN(parsedEpNum) && cleanEp !== '') {
    const exactMatch = episodes.find((e) => {
      const sMatch = seasonNum
        ? Number(e.seasonNumber || e.season || 1) === Number(seasonNum)
        : true;
      const numMatch =
        Number(e.episodeNumber) === Number(parsedEpNum) ||
        (seasonNum === 2 && Number(e.episodeNumber) === Number(parsedEpNum) + 12);
      return sMatch && numMatch;
    });
    if (exactMatch) return exactMatch;
  }

  const idMatch = episodes.find(
    (e) => e.id === cleanEp || e.id?.toLowerCase() === cleanEp.toLowerCase()
  );
  if (idMatch) return idMatch;

  if (!isNaN(parsedEpNum) && cleanEp !== '') {
    const numOnlyMatch = episodes.find(
      (e) => Number(e.episodeNumber) === Number(parsedEpNum)
    );
    if (numOnlyMatch) return numOnlyMatch;
  }

  return null;
}

function episodeHasPlayableStream(ep?: Episode | null): boolean {
  if (!ep) return false;
  if (ep.videoUrl && !isMockVideoUrl(ep.videoUrl)) return true;
  const checkArr = (arr?: VideoSource[]) =>
    Array.isArray(arr) &&
    arr.some(
      (s) =>
        s &&
        s.active !== false &&
        ((s.embedUrl && !isMockVideoUrl(s.embedUrl)) ||
          Boolean(s.frameCode && s.frameCode.trim()) ||
          Boolean((s as any).frameEmbedUrl && (s as any).frameEmbedUrl.trim()))
    );
  return checkArr(ep.sources) || checkArr(ep.videoSources);
}

export const WatchEpisodeView: React.FC<WatchEpisodeViewProps> = ({
  animeSlug,
  episodeNumberOrId,
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const prefKeyPrefix = user?.uid ? `zynox_${user.uid}` : 'zynox_guest';

  // Landscape fullscreen body class
  useEffect(() => {
    document.body.classList.add('watching-episode');
    return () => {
      document.body.classList.remove('watching-episode');
    };
  }, []);

  const initialCache = useMemo(() => {
    const cachedAnime = findCachedAnimeSynchronously(animeSlug);
    if (!cachedAnime) return { anime: null, episode: null, episodes: [] as Episode[] };
    const searchParams =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const querySeason = searchParams?.get('season') || searchParams?.get('s');
    const seasonNum = querySeason ? parseInt(querySeason, 10) : undefined;
    const cachedEpisodes = getCachedPublishedEpisodesByAnimeId(
      cachedAnime.id || cachedAnime.slug,
      cachedAnime.slug
    );
    const cachedEpisode = matchEpisodeInList(
      cachedEpisodes,
      episodeNumberOrId,
      !isNaN(Number(seasonNum)) ? seasonNum : undefined
    );
    return { anime: cachedAnime, episode: cachedEpisode, episodes: cachedEpisodes };
  }, [animeSlug, episodeNumberOrId]);

  const [anime, setAnime] = useState<Anime | null>(initialCache.anime);
  const [episode, setEpisode] = useState<Episode | null>(initialCache.episode);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>(initialCache.episodes);
  const [watchedEpNumbers, setWatchedEpNumbers] = useState<number[]>([]);
  const [seoSettings, setSeoSettings] = useState<CmsSeoSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(!(initialCache.anime && initialCache.episode));
  const [streamsRefreshing, setStreamsRefreshing] = useState<boolean>(
    Boolean(initialCache.episode && !episodeHasPlayableStream(initialCache.episode))
  );
  const [error, setError] = useState<string | null>(null);
  const [relatedSeries, setRelatedSeries] = useState<Anime[]>(() =>
    selectRelatedSeries(initialCache.anime, getCachedPublishedAnimes(), 12)
  );

  // Per-anime server & audio preferences (persisted under zynox_watch_pref_${animeKey})
  const [selectedCategory, setSelectedCategory] = useState<AudioCategory>(() => {
    const animeKey = initialCache.anime?.id || initialCache.anime?.slug || safeDecodeParam(animeSlug);
    try {
      const perAnimeRaw = localStorage.getItem(`zynox_watch_pref_${animeKey}`);
      if (perAnimeRaw) {
        const parsed = JSON.parse(perAnimeRaw);
        if (parsed?.category === 'dub' || parsed?.category === 'sub') return parsed.category;
      }
      const saved = localStorage.getItem(`${prefKeyPrefix}_audio`);
      if (saved === 'dub' || saved === 'sub') return saved;
    } catch {}
    return 'sub';
  });
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(() => {
    const animeKey = initialCache.anime?.id || initialCache.anime?.slug || safeDecodeParam(animeSlug);
    try {
      const perAnimeRaw = localStorage.getItem(`zynox_watch_pref_${animeKey}`);
      if (perAnimeRaw) {
        const parsed = JSON.parse(perAnimeRaw);
        if (typeof parsed?.serverIndex === 'number' && parsed.serverIndex >= 0) {
          return parsed.serverIndex;
        }
      }
      const saved = localStorage.getItem(`${prefKeyPrefix}_server_idx`);
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    } catch {}
    return 0;
  });
  const [useAlternateFrame, setUseAlternateFrame] = useState<boolean>(false);
  const [playerLoading, setPlayerLoading] = useState<boolean>(true);
  const [playerError, setPlayerError] = useState<boolean>(false);

  // User library / quick action state
  const [fav, setFav] = useState<boolean>(() =>
    initialCache.anime?.id ? isFavoriteCached(initialCache.anime.id) : false
  );
  const [watchlistStatus, setWatchlistState] = useState<WatchlistStatus | null>(() =>
    initialCache.anime?.id ? getAnimeWatchlistStatusCached(initialCache.anime.id) : null
  );

  // Playback & Timing
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1440);
  const pendingSeekRef = useRef<number | null>(null);

  // UI Modes & Toggles (Default Episode list mode = 'grid')
  const [theaterMode, setTheaterMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zynox_theater_mode') === 'true';
    } catch {}
    return false;
  });
  const [autoplayNext] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zynox_autoplay_next');
      return saved !== null ? saved === 'true' : true;
    } catch {}
    return true;
  });
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('zynox_episode_view_mode');
      if (saved === 'grid' || saved === 'list') return saved;
    } catch {}
    return 'list';
  });
  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('zynox_episode_view_mode', mode);
    } catch {}
  }, []);
  const [episodeSearch, setEpisodeSearch] = useState<string>('');
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<number | 'all'>('all');
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number>(0);

  // Modals / Menus / Bottom Sheets
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);
  const [downloadSheetOpen, setDownloadSheetOpen] = useState<boolean>(false);
  const [downloadMirrors, setDownloadMirrors] = useState<DownloadMirror[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const activeEpisodeItemRef = useRef<HTMLElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

  // Populate and refresh Related Series whenever the active anime resolves
  useEffect(() => {
    if (!anime) return;
    let active = true;
    const cachedCatalog = getCachedPublishedAnimes();
    if (cachedCatalog.length > 0) {
      setRelatedSeries(selectRelatedSeries(anime, cachedCatalog, 12));
    }
    withTimeout(getPublishedAnimes(), 4500, cachedCatalog)
      .then((catalog) => {
        if (!active || !catalog.length) return;
        setRelatedSeries(selectRelatedSeries(anime, catalog, 12));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [anime?.id, anime?.slug]);

  // Sync per-anime server/audio preference whenever anime resolves
  useEffect(() => {
    const animeKey = anime?.id || anime?.slug;
    if (!animeKey) return;
    try {
      const raw = localStorage.getItem(`zynox_watch_pref_${animeKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.category === 'dub' || parsed?.category === 'sub') {
          setSelectedCategory(parsed.category);
        }
        if (typeof parsed?.serverIndex === 'number' && parsed.serverIndex >= 0) {
          setSelectedServerIndex(parsed.serverIndex);
        }
      }
    } catch {}
  }, [anime?.id, anime?.slug]);

  // Outside click / Escape for More menu
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [moreMenuOpen]);

  // SEO Metadata synced with Admin SEO settings
  const seoMetadata = useMemo(() => {
    if (!anime) return null;
    const siteCfg = getCachedSiteSettings();
    return generateAnimeSeoMetadata(anime, {
      episodeNumber: episode?.episodeNumber ? Number(episode.episodeNumber) : undefined,
      episodeTitle: episode?.title,
      siteName: siteCfg?.siteName || 'ZYNOX ANIME',
      seoSettings: seoSettings || undefined,
    });
  }, [anime, episode, seoSettings]);
  usePageSeo(seoMetadata);

  // Load Watch Data
  useEffect(() => {
    let isMounted = true;
    const cleanSlug = safeDecodeParam(animeSlug);
    const cleanEpParam = safeDecodeParam(episodeNumberOrId);
    const searchParams =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const querySeason = searchParams?.get('season') || searchParams?.get('s');
    const rawSeasonNum = querySeason ? parseInt(querySeason, 10) : undefined;
    const seasonNum = rawSeasonNum && !isNaN(rawSeasonNum) ? rawSeasonNum : undefined;

    const cachedAnime = findCachedAnimeSynchronously(cleanSlug);
    const cachedList = cachedAnime
      ? getCachedPublishedEpisodesByAnimeId(cachedAnime.id || cachedAnime.slug, cachedAnime.slug)
      : [];
    const cachedEp = matchEpisodeInList(cachedList, cleanEpParam, seasonNum);

    if (cachedAnime && cachedEp) {
      setAnime(cachedAnime);
      setEpisode(cachedEp);
      setAllEpisodes(cachedList);
      setLoading(false);
      setError(null);
      setStreamsRefreshing(!episodeHasPlayableStream(cachedEp));
      if (seasonNum) setSelectedSeasonFilter(seasonNum);
    } else {
      setLoading(true);
      setError(null);
      setStreamsRefreshing(true);
    }
    setPlayerLoading(true);
    setPlayerError(false);
    setCountdownSeconds(null);

    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setStreamsRefreshing(false);
      }
    }, 8000);

    const fetchWatchData = async () => {
      try {
        withTimeout(getCmsSeoSettings(), 3000, null)
          .then((s) => {
            if (isMounted && s) setSeoSettings(s);
          })
          .catch(() => {});

        let animeData = cachedAnime;
        if (!animeData) {
          animeData = await withTimeout(getAnimeBySlug(cleanSlug), 4500, null);
          if (!animeData) {
            animeData = await withTimeout(getAnimeById(cleanSlug), 3000, null);
          }
        }

        if (!animeData) {
          if (isMounted) {
            setError('Anime not found.');
            setLoading(false);
            setStreamsRefreshing(false);
          }
          return;
        }

        const animeKey = animeData.id || animeData.slug;
        const freshEpisodesList = await withTimeout(
          getPublishedEpisodesByAnimeId(animeKey, animeData.slug),
          4500,
          cachedList
        );

        let epData = matchEpisodeInList(freshEpisodesList, cleanEpParam, seasonNum);
        if (!epData) {
          epData = await withTimeout(getEpisodeById(cleanEpParam), 2500, null);
        }

        if (!epData && cachedEp) {
          epData = cachedEp;
        }

        if (!epData) {
          if (isMounted) {
            setError('Episode not found.');
            setLoading(false);
            setStreamsRefreshing(false);
          }
          return;
        }

        const finalEpisodesList =
          freshEpisodesList.length > 0
            ? freshEpisodesList
            : cachedList.length > 0
            ? cachedList
            : [epData];

        if (isMounted) {
          setAnime(animeData);
          setEpisode(epData);
          setAllEpisodes(finalEpisodesList);
          setLoading(false);
          setStreamsRefreshing(false);
          if (seasonNum) setSelectedSeasonFilter(seasonNum);
        }

        if (animeData.id && epData.id) {
          incrementEpisodeViews(epData.id);
          incrementAnimeViews(animeData.id);

          Promise.allSettled([
            withTimeout(getWatchedEpisodes(user?.uid || null, animeData.id), 3500, [] as number[]),
            withTimeout(getContinueWatching(user?.uid || null), 3500, [] as WatchProgress[]),
            withTimeout(isFavorite(user?.uid || null, animeData.id), 3500, isFavoriteCached(animeData.id)),
            withTimeout(getAnimeWatchlistStatus(user?.uid || null, animeData.id), 3500, getAnimeWatchlistStatusCached(animeData.id)),
          ]).then(([watchedRes, continueRes, favRes, watchRes]) => {
            if (!isMounted) return;
            if (watchedRes.status === 'fulfilled') {
              setWatchedEpNumbers(watchedRes.value);
            }
            if (favRes.status === 'fulfilled') {
              setFav(favRes.value);
            }
            if (watchRes.status === 'fulfilled') {
              setWatchlistState(watchRes.value);
            }
            if (continueRes.status === 'fulfilled') {
              const existingProgress = continueRes.value.find(
                (p) =>
                  (p.animeId === animeData?.id || p.animeSlug === animeData?.slug) &&
                  Number(p.episodeNumber) === Number(epData?.episodeNumber)
              );
              if (existingProgress && existingProgress.progress > 10 && !existingProgress.completed) {
                const resumeSec = Math.floor(existingProgress.progress);
                pendingSeekRef.current = resumeSec;
                setCurrentTime(resumeSec);
                if (existingProgress.duration) setDuration(existingProgress.duration);
                const mins = Math.floor(resumeSec / 60);
                const secs = resumeSec % 60;
                const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                onShowMessage?.(`Resumed from ${formatted}`);
              } else {
                pendingSeekRef.current = null;
                setCurrentTime(0);
              }
            }
          });
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching watch data:', err);
          if (!cachedAnime || !cachedEp) {
            setError('Failed to load video player.');
          }
        }
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) {
          setLoading(false);
          setStreamsRefreshing(false);
        }
      }
    };

    fetchWatchData();
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [animeSlug, episodeNumberOrId, user?.uid]);

  // Discover servers for this episode (deduplicating videoSources vs sources and resolving Dub/Sub accurately)
  const { subServers, dubServers } = useMemo(() => {
    if (!episode) return { subServers: [] as VideoSource[], dubServers: [] as VideoSource[] };

    const isDubLabel = (raw?: string): boolean => {
      if (!raw) return false;
      const lower = raw.toLowerCase();
      if (/\bsub\b/.test(lower) && !/\b(dub|hindi|dual|multi)\b/.test(lower)) return false;
      return (
        lower.includes('dub') ||
        lower.includes('hindi') ||
        lower.includes('dual') ||
        lower.includes('multi') ||
        lower === 'hi'
      );
    };

    const episodeLang = ((episode as any).language || '').trim();
    const animeLang = (anime?.audioLanguage || '').trim();
    const episodeFallbackIsDub =
      episode.defaultCategory === 'dub' ||
      (episode.defaultCategory !== 'sub' &&
        (isDubLabel(episodeLang) || (!episodeLang && isDubLabel(animeLang))));

    const rawSourcesList: VideoSource[] = [];
    const seenIds = new Set<string>();
    const seenStreamKeys = new Set<string>();

    const classifySourceIsDub = (cand: Partial<VideoSource>): boolean => {
      const cat = (cand.category || '').toLowerCase().trim();
      if (cat === 'dub') return true;
      if (cat === 'sub') return false;

      const lang = (cand.language || '').toLowerCase().trim();
      const prov = (cand.provider || '').toLowerCase().trim();
      const name = (cand.name || cand.sourceName || (cand as any).serverName || '').toLowerCase().trim();

      if (lang) {
        if (isDubLabel(lang)) return true;
        if (lang.includes('sub')) return false;
      }
      if (prov.includes('dub') || prov.includes('hindi') || name.includes('dub') || name.includes('hindi')) {
        return true;
      }
      if (prov.includes('sub') || name.includes('sub')) {
        return false;
      }
      return episodeFallbackIsDub;
    };

    const addSource = (cand: Partial<VideoSource> | null | undefined, prefix: string) => {
      if (!cand) return;
      if (cand.active === false) return;
      const url = (cand.embedUrl || '').trim();
      const frame = (cand.frameCode || (cand as any).frameEmbedUrl || '').trim();
      if (!url && !frame) return;
      if (isMockVideoUrl(url) || isMockVideoUrl(frame)) return;

      const rawId = (cand.id || '').trim();
      const normUrl = url.replace(/\/+$/, '').toLowerCase();
      const normFrame = frame.toLowerCase();
      const isDub = classifySourceIsDub(cand);
      const streamKey = `${isDub ? 'dub' : 'sub'}::${normUrl}::${normFrame}`;

      // Skip duplicates mirrored across both videoSources and sources arrays
      if (seenStreamKeys.has(streamKey)) return;
      if (rawId && seenIds.has(rawId)) return;

      const uid = rawId || `${prefix}-${rawSourcesList.length + 1}`;
      seenIds.add(uid);
      seenStreamKeys.add(streamKey);
      rawSourcesList.push({
        ...cand,
        id: uid,
        category: isDub ? 'dub' : 'sub',
        language: cand.language || (isDub ? episodeLang || animeLang || 'Dub' : 'Sub'),
      } as VideoSource);
    };

    if (Array.isArray(episode.videoSources)) {
      episode.videoSources.forEach((s, idx) => addSource(s, `vsrc-${idx}`));
    }
    if (Array.isArray(episode.sources)) {
      episode.sources.forEach((s, idx) => addSource(s, `src-${idx}`));
    }
    if (rawSourcesList.length === 0 && episode.videoUrl && !isMockVideoUrl(episode.videoUrl)) {
      addSource(
        {
          id: 'primary-stream',
          name: 'Server 1',
          provider: 'Primary Stream',
          embedUrl: episode.videoUrl.trim(),
          active: true,
          category: episodeFallbackIsDub ? 'dub' : 'sub',
          language: episodeFallbackIsDub ? episodeLang || animeLang || 'Dub' : 'Sub',
        },
        'def'
      );
    }

    const sub: VideoSource[] = [];
    const dub: VideoSource[] = [];

    rawSourcesList.forEach((s) => {
      if (s.category === 'dub') {
        dub.push(s);
      } else {
        sub.push(s);
      }
    });

    return { subServers: sub, dubServers: dub };
  }, [episode, anime?.audioLanguage]);

  const effectiveCategory: AudioCategory =
    selectedCategory === 'dub'
      ? dubServers.length > 0
        ? 'dub'
        : 'sub'
      : subServers.length > 0
      ? 'sub'
      : 'dub';
  const currentServers = effectiveCategory === 'dub' ? dubServers : subServers;
  const safeServerIndex = selectedServerIndex < currentServers.length ? selectedServerIndex : 0;
  const activeSource: VideoSource | undefined =
    currentServers[safeServerIndex] || currentServers[0] || dubServers[0] || subServers[0];

  const uniqueServerLabels = useMemo(
    () => getUniqueServerLabels(currentServers),
    [currentServers]
  );

  // Resolve stream URL
  const { currentStreamUrl, isDirectVideo, hasAlternateFrame } = useMemo(() => {
    if (!activeSource) {
      const fallbackUrl = episode?.videoUrl && !isMockVideoUrl(episode.videoUrl) ? episode.videoUrl : '';
      const tf = transformStreamUrl(fallbackUrl);
      return { currentStreamUrl: tf.url, isDirectVideo: tf.isDirect, hasAlternateFrame: false };
    }

    const rawFrame = activeSource.frameCode || (activeSource as any)?.frameEmbedUrl || '';
    const frameSrc = extractIframeSrc(rawFrame);
    const hasAlt = Boolean(frameSrc || (rawFrame && rawFrame.trim()));

    let targetUrl = '';
    if (useAlternateFrame && frameSrc) {
      targetUrl = frameSrc;
    } else {
      targetUrl = activeSource.embedUrl || frameSrc || '';
    }

    if (!targetUrl && episode?.videoUrl && !isMockVideoUrl(episode.videoUrl)) {
      targetUrl = episode.videoUrl;
    }

    const tf = transformStreamUrl(targetUrl);
    return {
      currentStreamUrl: tf.url || targetUrl,
      isDirectVideo: tf.isDirect,
      hasAlternateFrame: hasAlt,
    };
  }, [activeSource, useAlternateFrame, episode?.videoUrl]);

  // Auto-clear player loading overlay so cross-origin embeds never hang
  useEffect(() => {
    if (!currentStreamUrl) {
      setPlayerLoading(false);
      return;
    }
    setPlayerLoading(true);
    const timeoutId = setTimeout(() => {
      setPlayerLoading(false);
    }, isDirectVideo ? 6000 : 3500);
    return () => clearTimeout(timeoutId);
  }, [currentStreamUrl, isDirectVideo, episode?.id, safeServerIndex, selectedCategory, useAlternateFrame]);

  // Episode indices & Adjacent episodes
  const currentIndex = useMemo(() => {
    if (!episode) return -1;
    return allEpisodes.findIndex(
      (e) => e.id === episode.id || Number(e.episodeNumber) === Number(episode.episodeNumber)
    );
  }, [allEpisodes, episode]);

  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const flushProgress = (sec: number) => {
    if (!anime?.id || !episode?.id) return;
    const totalDur = duration || Number(episode.duration) * 60 || 1440;
    saveWatchProgress(user?.uid || null, {
      animeId: anime.id,
      animeSlug: anime.slug,
      animeTitle: anime.title,
      animePoster: anime.poster,
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
      episodeTitle: episode.title,
      progress: sec,
      duration: totalDur,
    });

    if (totalDur > 0 && sec / totalDur >= 0.9 && !watchedEpNumbers.includes(episode.episodeNumber)) {
      markEpisodeWatched(
        user?.uid || null,
        anime.id,
        anime.slug,
        anime.title,
        anime.poster,
        episode.id,
        episode.episodeNumber,
        episode.title
      );
      setWatchedEpNumbers((prev) => [...prev, episode.episodeNumber]);
    }
  };

  useEffect(() => {
    if (!anime?.id || !episode?.id) return;
    const interval = setInterval(() => {
      const sec = currentTimeRef.current > 0 ? currentTimeRef.current : 15;
      flushProgress(sec);
    }, 10000);

    return () => {
      clearInterval(interval);
      if (currentTimeRef.current > 0) {
        flushProgress(currentTimeRef.current);
      }
    };
  }, [anime, episode, user?.uid, duration, watchedEpNumbers]);

  // Scroll active episode into view inside desktop sticky panel
  useEffect(() => {
    if (activeEpisodeItemRef.current && window.innerWidth >= 1024) {
      activeEpisodeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [episode?.id, viewMode]);

  const handleSwitchServer = (cat: AudioCategory, idx: number) => {
    if (currentTimeRef.current > 0) {
      pendingSeekRef.current = currentTimeRef.current;
    }
    setSelectedCategory(cat);
    setSelectedServerIndex(idx);
    setUseAlternateFrame(false);
    setPlayerLoading(true);
    setPlayerError(false);

    const animeKey = anime?.id || anime?.slug;
    try {
      if (animeKey) {
        localStorage.setItem(
          `zynox_watch_pref_${animeKey}`,
          JSON.stringify({ category: cat, serverIndex: idx })
        );
      }
      localStorage.setItem(`${prefKeyPrefix}_audio`, cat);
      localStorage.setItem(`${prefKeyPrefix}_server_idx`, String(idx));
    } catch {}
  };

  const handleTryAnotherServer = () => {
    if (currentServers.length > 1) {
      const nextIdx = (safeServerIndex + 1) % currentServers.length;
      handleSwitchServer(effectiveCategory, nextIdx);
      return;
    }
    if (effectiveCategory === 'dub' && subServers.length > 0) {
      handleSwitchServer('sub', 0);
      return;
    }
    if (effectiveCategory === 'sub' && dubServers.length > 0) {
      handleSwitchServer('dub', 0);
      return;
    }
    setPlayerError(false);
    setPlayerLoading(true);
  };

  const handleToggleWatchlist = async () => {
    if (!anime?.id) return;
    if (watchlistStatus) {
      setWatchlistState(null);
      await removeFromWatchlist(user?.uid || null, anime.id);
      onShowMessage?.(`Removed "${anime.title}" from Watchlist.`);
    } else {
      const nextStatus: WatchlistStatus = 'watching';
      setWatchlistState(nextStatus);
      await setWatchlistStatus(
        user?.uid || null,
        anime.id,
        anime.slug,
        anime.title,
        anime.poster,
        nextStatus,
        anime.genres,
        anime.rating
      );
      onShowMessage?.(`Added "${anime.title}" to Watchlist!`);
    }
  };

  const handleToggleFavorite = async () => {
    if (!anime?.id) return;
    const nextFav = await toggleFavorite(
      user?.uid || null,
      anime.id,
      anime.slug,
      anime.title,
      anime.poster,
      anime.genres
    );
    setFav(nextFav);
    onShowMessage?.(nextFav ? `Added "${anime.title}" to favorites.` : 'Removed from favorites.');
  };

  const handleShareEpisode = () => {
    if (!anime || !episode) return;
    openSystemShare({
      title: `${anime.title} — Episode ${episode.episodeNumber}`,
      text: `Watch ${anime.title} Episode ${episode.episodeNumber} on ZYNOX ANIME`,
      url: typeof window !== 'undefined' ? window.location.href : '',
      onShowMessage,
      onFallback: () => setShareOpen(true),
    });
  };

  const handleMarkWatchedClick = async () => {
    if (!anime?.id || !episode?.id) return;
    if (watchedEpNumbers.includes(episode.episodeNumber)) {
      onShowMessage?.(`Episode ${episode.episodeNumber} is already marked as watched.`);
      return;
    }
    setWatchedEpNumbers((prev) => [...prev, episode.episodeNumber]);
    await markEpisodeWatched(
      user?.uid || null,
      anime.id,
      anime.slug,
      anime.title,
      anime.poster,
      episode.id,
      episode.episodeNumber,
      episode.title
    );
    onShowMessage?.(`Marked Episode ${episode.episodeNumber} as watched.`);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            setCurrentTime(videoRef.current.currentTime);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || duration, videoRef.current.currentTime + 10);
            setCurrentTime(videoRef.current.currentTime);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          if (nextEpisode && anime) {
            const s = nextEpisode.seasonNumber || nextEpisode.season || 1;
            navigate(`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}?season=${s}`);
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextEpisode, anime, duration]);

  useEffect(() => {
    if (countdownSeconds === null) return;
    if (countdownSeconds <= 0) {
      if (nextEpisode && anime) {
        const s = nextEpisode.seasonNumber || nextEpisode.season || 1;
        navigate(`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}?season=${s}`);
      }
      setCountdownSeconds(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdownSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdownSeconds, nextEpisode, anime]);

  const showSkipIntro = useMemo(() => {
    if (!episode?.introStart || !episode?.introEnd) return false;
    return currentTime >= episode.introStart && currentTime <= episode.introEnd;
  }, [currentTime, episode?.introStart, episode?.introEnd]);

  const showSkipOutro = useMemo(() => {
    if (!episode?.outroStart || !episode?.outroEnd) return false;
    return currentTime >= episode.outroStart && currentTime <= episode.outroEnd;
  }, [currentTime, episode?.outroStart, episode?.outroEnd]);

  const handleSkipIntro = () => {
    if (episode?.introEnd && videoRef.current) {
      videoRef.current.currentTime = episode.introEnd + 1;
      setCurrentTime(episode.introEnd + 1);
    }
  };

  const handleSkipOutro = () => {
    if (episode?.outroEnd && videoRef.current) {
      videoRef.current.currentTime = episode.outroEnd + 1;
      setCurrentTime(episode.outroEnd + 1);
    }
  };

  const handleOpenDownloadSheet = () => {
    if (!episode) return;
    const mirrors = getAllEpisodeDownloadMirrors(episode, anime);
    setDownloadMirrors(mirrors);
    setDownloadSheetOpen(true);
  };

  const normalizeAudioLabel = (raw?: string): string => {
    const val = (raw || '').trim();
    if (!val) return '';
    const lower = val.toLowerCase();
    if (lower.includes('hindi')) return 'Hindi Dub';
    if (lower.includes('dual')) return 'Dual Audio';
    if (lower.includes('multi')) return 'Multi Audio';
    if (lower.includes('english') && lower.includes('dub')) return 'English Dub';
    if (lower.includes('japanese') && lower.includes('sub')) return 'Japanese Sub';
    if (lower === 'dub') return 'Dub';
    if (lower === 'sub') return 'Sub';
    return val;
  };

  const dubRowLabel = useMemo(() => {
    const fromDub = normalizeAudioLabel(dubServers[0]?.language);
    if (fromDub && fromDub !== 'Dub' && fromDub !== 'Sub') return fromDub;
    const fromEp = normalizeAudioLabel((episode as any)?.language);
    if (fromEp && fromEp !== 'Sub' && fromEp !== 'Japanese Sub') return fromEp;
    const fromAnime = normalizeAudioLabel(anime?.audioLanguage);
    if (fromAnime && fromAnime !== 'Sub' && fromAnime !== 'Japanese Sub') return fromAnime;
    return 'Dub';
  }, [dubServers, episode, anime?.audioLanguage]);

  const subRowLabel = useMemo(() => {
    const fromSub = normalizeAudioLabel(subServers[0]?.language);
    if (fromSub && fromSub.toLowerCase().includes('sub')) return fromSub;
    const fromEp = normalizeAudioLabel((episode as any)?.language);
    if (fromEp && fromEp.toLowerCase().includes('sub')) return fromEp;
    return 'Sub';
  }, [subServers, episode]);

  const resolvedDownloadAudioLabel = useMemo(() => {
    if (effectiveCategory === 'dub') {
      const fromActive = normalizeAudioLabel(activeSource?.language);
      if (fromActive && fromActive !== 'Dub' && fromActive !== 'Sub') return fromActive;
      return dubRowLabel;
    }
    const fromActive = normalizeAudioLabel(activeSource?.language);
    if (fromActive && fromActive.toLowerCase().includes('sub')) return fromActive;
    return subRowLabel;
  }, [effectiveCategory, activeSource?.language, dubRowLabel, subRowLabel]);

  const formattedDownloadRows = useMemo(
    () => formatAndSortDownloadMirrors(downloadMirrors, resolvedDownloadAudioLabel),
    [downloadMirrors, resolvedDownloadAudioLabel]
  );

  const directDownloadRows = useMemo(
    () => formattedDownloadRows.filter((r) => !r.mirror.isEmbedPlayer),
    [formattedDownloadRows]
  );

  // Season & Range Filtering for Episode List
  const seasonsAvailable = useMemo(() => {
    const s = new Set<number>();
    allEpisodes.forEach((e) => s.add(Number(e.seasonNumber || e.season || 1)));
    return Array.from(s).sort((a, b) => a - b);
  }, [allEpisodes]);

  const RANGE_SIZE = 50;
  const filteredEpisodes = useMemo(() => {
    let list = allEpisodes;
    if (selectedSeasonFilter !== 'all') {
      list = list.filter((e) => Number(e.seasonNumber || e.season || 1) === Number(selectedSeasonFilter));
    }
    if (episodeSearch.trim()) {
      const q = episodeSearch.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.episodeNumber.toString().includes(q) ||
          (e.title && e.title.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEpisodes, selectedSeasonFilter, episodeSearch]);

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

  const displayedListEpisodes = useMemo(() => {
    if (episodeRanges.length === 0) return filteredEpisodes;
    const cur = episodeRanges[selectedRangeIndex] || episodeRanges[0];
    return filteredEpisodes.slice(cur.start, cur.end);
  }, [filteredEpisodes, episodeRanges, selectedRangeIndex]);

  useEffect(() => {
    setSelectedRangeIndex(0);
  }, [selectedSeasonFilter, episodeSearch]);

  // Exact-dimension skeleton (0 layout shift)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050A14] pb-16 overflow-x-clip">
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6 pt-3 pb-3 flex items-center justify-between gap-3">
          <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1100px)_360px] justify-center">
            <div className="min-w-0">
              <div className="sticky top-14 lg:static z-30 -mx-3 sm:mx-0 bg-black">
                <div className="aspect-video w-full bg-black sm:rounded-2xl border-y sm:border border-white/10 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-[#1E88FF]" />
                </div>
              </div>
              <div className="py-4 border-b border-white/[0.08] space-y-2 animate-pulse">
                <div className="h-3.5 w-36 bg-white/10 rounded" />
                <div className="h-5 w-3/4 bg-white/15 rounded" />
                <div className="h-3 w-28 bg-white/10 rounded" />
              </div>
              <div className="py-3.5 border-b border-white/[0.08] space-y-2.5 animate-pulse">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-11 bg-white/10 rounded-xl" />
                  <div className="h-11 bg-[#1E88FF]/40 rounded-xl" />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-11 bg-white/5 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-28 bg-white/10 rounded" />
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="h-12 bg-[#0B1324] rounded-xl border border-white/10" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !anime || !episode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#050A14]">
        <div className="max-w-md w-full bg-[#0B1324] border border-white/10 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#101A30] border border-white/10 text-[#94A3B8] mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">{error || 'Episode Unavailable'}</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              We could not locate this episode video stream or the title has been updated.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/anime/${animeSlug}`)}
            className="w-full h-11 bg-[#1E88FF] hover:bg-[#1670D6] text-white text-sm font-semibold rounded-xl transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Anime Details</span>
          </button>
        </div>
      </div>
    );
  }

  const audioMetaLabel =
    effectiveCategory === 'dub'
      ? anime.audioLanguage && anime.audioLanguage.toLowerCase().includes('hindi')
        ? 'Hindi Dub'
        : 'Dub'
      : 'Sub';

  const activeEpisodeSeasonNum = Number(episode.seasonNumber || episode.season || 1);
  const activeSeasonMeta = anime.seasonsList?.find(
    (s) => Number(s.seasonNumber) === activeEpisodeSeasonNum
  );
  const activeSeasonPoster = activeSeasonMeta?.poster || anime.poster;
  const loadingThumb =
    episode.thumbnail || activeSeasonMeta?.banner || anime.banner || activeSeasonPoster || '';

  return (
    <div className="min-h-screen bg-[#050A14] text-white pb-16 overflow-x-clip">
      {nextEpisode && (
        <link
          rel="prefetch"
          href={`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}?season=${nextEpisode.seasonNumber || 1}`}
        />
      )}

      {/* TOP COMPACT BREADCRUMB & DETAILS ACTION (Scrolls away normally) */}
      <div className="watch-non-player-ui max-w-[1500px] mx-auto px-3 sm:px-6 pt-3 pb-2.5 flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-white transition-colors duration-150 shrink-0 cursor-pointer"
          >
            Home
          </button>
          <span className="shrink-0 text-white/30">/</span>
          <button
            type="button"
            onClick={() => navigate(`/anime/${anime.slug}`)}
            className="hover:text-white transition-colors duration-150 truncate min-w-0 font-medium cursor-pointer"
          >
            {anime.title}
          </button>
          <span className="shrink-0 text-white/30">/</span>
          <span className="text-[#1E88FF] font-semibold shrink-0 whitespace-nowrap">
            Ep {episode.episodeNumber}
          </span>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {/* Theater Mode Toggle (Desktop >= 1024px) */}
          <button
            type="button"
            onClick={() => {
              const nextMode = !theaterMode;
              setTheaterMode(nextMode);
              try {
                localStorage.setItem('zynox_theater_mode', String(nextMode));
              } catch {}
            }}
            className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-xs font-semibold text-[#CBD5E1] hover:text-white transition-colors duration-150 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Monitor className="w-3.5 h-3.5 text-[#1E88FF]" />
            <span>{theaterMode ? 'Default View' : 'Theater Mode'}</span>
          </button>

          {/* Details Pill Button */}
          <button
            type="button"
            aria-label="Anime details"
            onClick={() => navigate(`/anime/${anime.slug}`)}
            className="h-9 px-3.5 rounded-full bg-[#0B1324] hover:bg-[#101A30] border border-white/15 text-[#CBD5E1] hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Info className="w-4 h-4 text-[#1E88FF] shrink-0" />
            <span>Details</span>
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6">
        <div
          className={`grid gap-5 lg:gap-6 ${
            theaterMode
              ? 'grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-[minmax(0,1100px)_360px] justify-center'
          }`}
        >
          {/* PLAYER & DETAILS COLUMN */}
          <div className="min-w-0 space-y-4">
            {/* 1. 16:9 VIDEO PLAYER CARD */}
            <div className="watch-player-sticky-wrap">
              <div
                ref={playerContainerRef}
                className="watch-player-frame aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/10 relative select-none shadow-2xl"
              >
                {/* Loading Overlay: Dimmed thumbnail 50% + 40px spinner */}
                {(streamsRefreshing && !currentStreamUrl) ||
                (playerLoading && !playerError && Boolean(currentStreamUrl)) ? (
                  <div className="absolute inset-0 bg-black flex items-center justify-center z-20 pointer-events-none">
                    {loadingThumb && (
                      <img
                        src={getOptimizedImageUrl(loadingThumb, { width: 960, fallbackType: 'banner' })}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                      />
                    )}
                    <Loader2 className="w-10 h-10 animate-spin text-[#1E88FF] relative z-10" />
                  </div>
                ) : null}

                {/* Player Error State */}
                {!streamsRefreshing && (playerError || !currentStreamUrl) ? (
                  <div className="absolute inset-0 bg-[#0B1324] flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 z-10">
                    <AlertTriangle className="w-9 h-9 text-[#94A3B8]" />
                    <p className="text-sm font-semibold text-white">
                      This server isn&apos;t working
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-0.5">
                      <button
                        type="button"
                        onClick={handleTryAnotherServer}
                        className="h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1670D6] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-150 whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Try another server</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportOpen(true)}
                        className="h-10 px-4 rounded-xl bg-transparent hover:bg-white/5 text-[#CBD5E1] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 border border-white/15 cursor-pointer transition-colors duration-150 whitespace-nowrap"
                      >
                        <Flag className="w-3.5 h-3.5 shrink-0" />
                        <span>Report broken link</span>
                      </button>
                    </div>
                  </div>
                ) : !currentStreamUrl ? null : isDirectVideo ? (
                  <video
                    key={`vid-${episode.id}-${safeServerIndex}-${useAlternateFrame}-${currentStreamUrl}`}
                    ref={videoRef}
                    src={currentStreamUrl}
                    controls
                    playsInline
                    autoPlay
                    onLoadedMetadata={() => {
                      if (videoRef.current && pendingSeekRef.current && pendingSeekRef.current > 0) {
                        videoRef.current.currentTime = pendingSeekRef.current;
                        pendingSeekRef.current = null;
                      }
                      setPlayerLoading(false);
                    }}
                    onLoadedData={() => setPlayerLoading(false)}
                    onCanPlay={() => setPlayerLoading(false)}
                    onPause={() => {
                      if (videoRef.current) flushProgress(videoRef.current.currentTime);
                    }}
                    onError={() => {
                      setPlayerLoading(false);
                      setPlayerError(true);
                    }}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                        setDuration(videoRef.current.duration || 1440);
                      }
                    }}
                    onEnded={() => {
                      if (videoRef.current) flushProgress(videoRef.current.duration || duration);
                      if (autoplayNext && nextEpisode) {
                        setCountdownSeconds(5);
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <iframe
                    key={`frm-${episode.id}-${safeServerIndex}-${useAlternateFrame}-${currentStreamUrl}`}
                    ref={iframeRef}
                    src={currentStreamUrl}
                    title={`Episode ${episode.episodeNumber} Stream`}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    onLoad={() => setPlayerLoading(false)}
                    onError={() => {
                      setPlayerLoading(false);
                      setPlayerError(true);
                    }}
                    className="w-full h-full border-0"
                  />
                )}

                {/* Bottom-Right Overlay Stack (Never covers native controls bar) */}
                {(showSkipIntro || showSkipOutro || (countdownSeconds !== null && nextEpisode)) && (
                  <div className="absolute bottom-14 sm:bottom-16 right-3 sm:right-4 z-20 flex flex-col items-end gap-2">
                    {showSkipIntro && (
                      <button
                        type="button"
                        onClick={handleSkipIntro}
                        className="h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1670D6] text-white text-xs font-semibold flex items-center gap-2 border border-white/20 shadow-lg transition-colors duration-150 cursor-pointer whitespace-nowrap"
                      >
                        <FastForward className="w-4 h-4" />
                        <span>Skip Intro</span>
                      </button>
                    )}

                    {showSkipOutro && (
                      <button
                        type="button"
                        onClick={handleSkipOutro}
                        className="h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1670D6] text-white text-xs font-semibold flex items-center gap-2 border border-white/20 shadow-lg transition-colors duration-150 cursor-pointer whitespace-nowrap"
                      >
                        <FastForward className="w-4 h-4" />
                        <span>Skip Outro</span>
                      </button>
                    )}

                    {countdownSeconds !== null && nextEpisode && (
                      <div className="bg-[#0B1324]/95 border border-white/15 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-lg">
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          Next episode in {countdownSeconds}s
                        </span>
                        <button
                          type="button"
                          onClick={() => setCountdownSeconds(null)}
                          className="text-xs font-semibold text-[#1E88FF] hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* NON-PLAYER UI (Hidden in mobile landscape fullscreen) */}
            <div className="watch-non-player-ui space-y-4">
              {/* 2. EPISODE INFO & ACTION CONTROLS CARD */}
              <section className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#1E88FF]">
                      EPISODE {episode.episodeNumber} OF {allEpisodes.length || anime.totalEpisodes || 1}
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-[#0E2444] border border-[#1E4B8A] text-[10px] font-bold text-[#3B9BFF] whitespace-nowrap">
                      {resolvedDownloadAudioLabel}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
                    {episode.title || anime.title}
                  </h1>
                  <p className="text-xs text-[#94A3B8] truncate">
                    {anime.title}
                    {anime.year ? ` (${anime.year})` : ''}
                  </p>
                </div>

                {/* Action Row 1: Grouped Prev/Next capsule + Download button */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center rounded-xl bg-[#101A30] border border-white/10 p-1">
                    <button
                      type="button"
                      disabled={!prevEpisode}
                      onClick={() => {
                        if (prevEpisode) {
                          const s = prevEpisode.seasonNumber || prevEpisode.season || 1;
                          navigate(`/anime/${anime.slug}/episode/${prevEpisode.episodeNumber}?season=${s}`);
                        }
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors duration-150 whitespace-nowrap ${
                        prevEpisode
                          ? 'text-[#CBD5E1] hover:text-white hover:bg-white/5 cursor-pointer'
                          : 'text-[#94A3B8]/40 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>Prev</span>
                    </button>

                    <button
                      type="button"
                      disabled={!nextEpisode}
                      onClick={() => {
                        if (nextEpisode) {
                          const s = nextEpisode.seasonNumber || nextEpisode.season || 1;
                          navigate(`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}?season=${s}`);
                        }
                      }}
                      className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors duration-150 whitespace-nowrap ${
                        nextEpisode
                          ? 'bg-[#1E88FF] hover:bg-[#1670D6] text-white cursor-pointer shadow-sm'
                          : 'bg-[#122645] text-[#64748B] cursor-not-allowed'
                      }`}
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenDownloadSheet}
                    title="Download episode"
                    aria-label="Download episode"
                    className="h-10 px-4 rounded-xl bg-[#101A30] hover:bg-[#0E2444] border border-[#223250] hover:border-[#1E88FF] text-xs font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Action Row 2: Watchlist pill + Favorite, Share, Mark Watched, Report icon buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleWatchlist}
                    title={watchlistStatus ? 'In Watchlist' : 'Add to Watchlist'}
                    aria-label={watchlistStatus ? 'Remove from watchlist' : 'Add to watchlist'}
                    className={`h-10 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                      watchlistStatus
                        ? 'bg-[#0E2444] border-[#1E88FF] text-[#3B9BFF]'
                        : 'bg-[#101A30] hover:bg-[#16233D] border-[#223250] text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 shrink-0 ${watchlistStatus ? 'fill-current' : ''}`} />
                    <span>Watchlist</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
                    aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 ${
                      fav
                        ? 'bg-[#2B1221] border-[#881337] text-red-500'
                        : 'bg-[#101A30] hover:bg-[#16233D] border-[#223250] text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 shrink-0 ${fav ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShareEpisode}
                    title="Share episode"
                    aria-label="Share episode"
                    className="w-10 h-10 rounded-xl bg-[#101A30] hover:bg-[#16233D] border border-[#223250] text-[#CBD5E1] hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkWatchedClick}
                    title={watchedEpNumbers.includes(episode.episodeNumber) ? 'Watched' : 'Mark as watched'}
                    aria-label={watchedEpNumbers.includes(episode.episodeNumber) ? 'Watched' : 'Mark as watched'}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 ${
                      watchedEpNumbers.includes(episode.episodeNumber)
                        ? 'bg-[#0E2444] border-[#1E88FF] text-[#3B9BFF]'
                        : 'bg-[#101A30] hover:bg-[#16233D] border-[#223250] text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    title="Report broken link"
                    aria-label="Report broken link"
                    className="w-10 h-10 rounded-xl bg-[#101A30] hover:bg-white/5 border border-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0"
                  >
                    <Flag className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </section>

              {/* 3. AUTHORIZED STREAMS CARD */}
              <section className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1E88FF] shrink-0" />
                  <h2 className="text-sm font-bold text-white">Authorized Streams</h2>
                </div>

                {dubServers.length === 0 && subServers.length === 0 ? (
                  <p className="text-xs text-[#94A3B8]">
                    No stream servers available for this episode yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {dubServers.length > 0 && (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#94A3B8] min-w-[40px] shrink-0 whitespace-nowrap">
                          {dubRowLabel} :
                        </span>
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          {dubServers.map((s, idx) => {
                            const isActive = effectiveCategory === 'dub' && safeServerIndex === idx;
                            const label = s.name || s.sourceName || `server ${idx + 1}`;
                            return (
                              <button
                                key={s.id || `dub-${idx}`}
                                type="button"
                                onClick={() => handleSwitchServer('dub', idx)}
                                className={`h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 border ${
                                  isActive
                                    ? 'bg-[#1E88FF] border-[#1E88FF] text-white shadow-lg shadow-[#1E88FF]/20'
                                    : 'bg-[#101A30] border-white/10 text-[#CBD5E1] hover:border-white/25 hover:text-white'
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5 shrink-0" />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {subServers.length > 0 && (
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#94A3B8] min-w-[40px] shrink-0 whitespace-nowrap">
                          {subRowLabel} :
                        </span>
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          {subServers.map((s, idx) => {
                            const isActive = effectiveCategory === 'sub' && safeServerIndex === idx;
                            const label = s.name || s.sourceName || `server ${idx + 1}`;
                            return (
                              <button
                                key={s.id || `sub-${idx}`}
                                type="button"
                                onClick={() => handleSwitchServer('sub', idx)}
                                className={`h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 border ${
                                  isActive
                                    ? 'bg-[#1E88FF] border-[#1E88FF] text-white shadow-lg shadow-[#1E88FF]/20'
                                    : 'bg-[#101A30] border-white/10 text-[#CBD5E1] hover:border-white/25 hover:text-white'
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5 shrink-0" />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {hasAlternateFrame && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentTimeRef.current > 0) {
                              pendingSeekRef.current = currentTimeRef.current;
                            }
                            setUseAlternateFrame(!useAlternateFrame);
                            setPlayerLoading(true);
                          }}
                          className={`h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 border ${
                            useAlternateFrame
                              ? 'bg-[#0E2444] border-[#1E88FF] text-[#3B9BFF]'
                              : 'bg-[#101A30] border-[#223250] text-[#CBD5E1] hover:border-[#364C75] hover:text-white'
                          }`}
                        >
                          Alternate Mirror
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* MOBILE / THEATER EPISODE LIST */}
              <div className={theaterMode ? 'block' : 'block lg:hidden'}>
                <EpisodeListSection
                  totalEpisodeCount={allEpisodes.length}
                  allEpisodes={displayedListEpisodes}
                  currentEpisodeNumber={episode.episodeNumber}
                  watchedEpNumbers={watchedEpNumbers}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  episodeSearch={episodeSearch}
                  setEpisodeSearch={setEpisodeSearch}
                  seasonsAvailable={seasonsAvailable}
                  selectedSeasonFilter={selectedSeasonFilter}
                  setSelectedSeasonFilter={setSelectedSeasonFilter}
                  episodeRanges={episodeRanges}
                  selectedRangeIndex={selectedRangeIndex}
                  setSelectedRangeIndex={setSelectedRangeIndex}
                  fallbackPoster={activeSeasonPoster}
                  onSelectEpisode={(ep) => {
                    const s = ep.seasonNumber || ep.season || 1;
                    navigate(`/anime/${anime.slug}/episode/${ep.episodeNumber}?season=${s}`);
                  }}
                  activeRef={activeEpisodeItemRef}
                />
              </div>

              {/* 5. COMMENTS SECTION */}
              <div className="pt-4">
                <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-6">
                  <CommentSection
                    targetType="episode"
                    animeId={anime.id || animeSlug}
                    animeSlug={anime.slug}
                    animeTitle={anime.title}
                    episodeId={episode.id}
                    episodeNumber={episode.episodeNumber}
                    onShowMessage={onShowMessage || (() => {})}
                    navigate={navigate}
                  />
                </div>
              </div>

              {/* 6. RELATED SERIES */}
              {relatedSeries.length > 0 && (
                <section className="pt-4 space-y-2.5 sm:space-y-3">
                  <div className="h-8 min-h-[32px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
                      <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
                        Related Series
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/browse')}
                      className="text-[13px] font-semibold text-[#1E88FF] hover:opacity-85 flex items-center gap-0.5 transition-opacity duration-150 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-[10px] sm:gap-3 ${
                      theaterMode ? 'xl:grid-cols-6 2xl:grid-cols-7' : 'xl:grid-cols-6'
                    }`}
                  >
                    {relatedSeries.map((rel) => (
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
            </div>
          </div>

          {/* 6. RIGHT COLUMN: STICKY EPISODE LIST ON DESKTOP (360px wide) */}
          {!theaterMode && (
            <div className="watch-non-player-ui hidden lg:block sticky top-20 max-h-[calc(100dvh-120px)] overflow-y-auto no-scrollbar">
              <EpisodeListSection
                totalEpisodeCount={allEpisodes.length}
                allEpisodes={displayedListEpisodes}
                currentEpisodeNumber={episode.episodeNumber}
                watchedEpNumbers={watchedEpNumbers}
                viewMode={viewMode}
                setViewMode={setViewMode}
                episodeSearch={episodeSearch}
                setEpisodeSearch={setEpisodeSearch}
                seasonsAvailable={seasonsAvailable}
                selectedSeasonFilter={selectedSeasonFilter}
                setSelectedSeasonFilter={setSelectedSeasonFilter}
                episodeRanges={episodeRanges}
                selectedRangeIndex={selectedRangeIndex}
                setSelectedRangeIndex={setSelectedRangeIndex}
                fallbackPoster={activeSeasonPoster}
                onSelectEpisode={(ep) => {
                  const s = ep.seasonNumber || ep.season || 1;
                  navigate(`/anime/${anime.slug}/episode/${ep.episodeNumber}?season=${s}`);
                }}
                activeRef={activeEpisodeItemRef}
              />
            </div>
          )}
        </div>
      </div>

      {/* DOWNLOAD BOTTOM SHEET MODAL */}
      {downloadSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDownloadSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-[#0B1324] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85dvh] overflow-y-auto pb-[calc(20px+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="min-w-0 pr-3">
                <h3 className="text-base font-bold text-white truncate">
                  Download EP {episode.episodeNumber}
                </h3>
                <p className="text-xs text-[#94A3B8] truncate">{anime.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setDownloadSheetOpen(false)}
                aria-label="Close downloads"
                className="w-9 h-9 rounded-xl bg-[#101A30] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors duration-150 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {directDownloadRows.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <p className="text-sm font-semibold text-white">No Direct Download Links</p>
                <p className="text-xs text-[#94A3B8]">
                  Downloads for this episode have not been added yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Direct Download Links
                </p>
                {directDownloadRows.map((row, idx) => {
                  const is720 = row.sortWeight === 720 || row.title.toLowerCase().includes('720');
                  return (
                    <button
                      key={`direct-${idx}`}
                      type="button"
                      onClick={() => {
                        executeDownloadRedirect(
                          row.mirror.url,
                          `${anime.title} - Episode ${episode.episodeNumber} [${row.title}]`,
                          onShowMessage
                        );
                        setDownloadSheetOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl bg-[#101A30] border border-[#223250] text-left transition-colors duration-150 flex items-center justify-between gap-3 group cursor-pointer ${
                        is720
                          ? 'hover:bg-[#0B2A28] hover:border-[#145349]'
                          : 'hover:bg-[#0E2444] hover:border-[#1E88FF]'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p
                          className={`text-[14px] font-semibold text-white truncate transition-colors duration-150 ${
                            is720 ? 'group-hover:text-emerald-400' : 'group-hover:text-[#1E88FF]'
                          }`}
                        >
                          {row.title}
                        </p>
                        <p className="text-[12px] text-[#94A3B8] truncate">
                          {row.meta}
                        </p>
                      </div>
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          is720 ? 'bg-emerald-500 text-black' : 'bg-[#1E88FF] text-white'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportOpen && (
        <ReportEpisodeModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          animeId={anime.id || animeSlug}
          animeTitle={anime.title}
          episodeId={episode.id}
          episodeNumber={episode.episodeNumber}
          onSuccessToast={(msg) => onShowMessage?.(msg)}
        />
      )}

      {/* SHARE MODAL */}
      {shareOpen && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          title={`${anime.title} Episode ${episode.episodeNumber}`}
          url={typeof window !== 'undefined' ? window.location.href : ''}
        />
      )}
    </div>
  );
};

/* REUSABLE EPISODE LIST COMPONENT */
interface EpisodeListSectionProps {
  totalEpisodeCount: number;
  allEpisodes: Episode[];
  currentEpisodeNumber: number;
  watchedEpNumbers: number[];
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  episodeSearch: string;
  setEpisodeSearch: (s: string) => void;
  seasonsAvailable: number[];
  selectedSeasonFilter: number | 'all';
  setSelectedSeasonFilter: (s: number | 'all') => void;
  episodeRanges: { start: number; end: number; label: string }[];
  selectedRangeIndex: number;
  setSelectedRangeIndex: (i: number) => void;
  fallbackPoster?: string;
  onSelectEpisode: (ep: Episode) => void;
  activeRef: React.RefObject<HTMLElement | null>;
}

const EpisodeListSection: React.FC<EpisodeListSectionProps> = ({
  totalEpisodeCount,
  allEpisodes,
  currentEpisodeNumber,
  watchedEpNumbers,
  viewMode,
  setViewMode,
  episodeSearch,
  setEpisodeSearch,
  seasonsAvailable,
  selectedSeasonFilter,
  setSelectedSeasonFilter,
  episodeRanges,
  selectedRangeIndex,
  setSelectedRangeIndex,
  fallbackPoster,
  onSelectEpisode,
  activeRef,
}) => {
  const seasonOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Seasons' },
      ...seasonsAvailable.map((s) => ({ value: String(s), label: `Season ${s}` })),
    ];
  }, [seasonsAvailable]);

  const rangeOptions = useMemo(() => {
    return episodeRanges.map((r, idx) => ({
      value: String(idx),
      label: r.label,
    }));
  }, [episodeRanges]);

  const showControlsRow = true;

  return (
    <section className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5">
      {/* Header: Layers icon + EPISODES (N) + List/Grid toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#1E88FF] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white truncate">
            EPISODES <span className="text-[#94A3B8] font-semibold">({allEpisodes.length})</span>
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-[#101A30] p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer ${
              viewMode === 'list' ? 'bg-[#1E88FF] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
            title="List View"
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer ${
              viewMode === 'grid' ? 'bg-[#1E88FF] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
            title="Grid View"
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search + Season / Range controls */}
      {showControlsRow && (
        <div className="flex flex-wrap items-center gap-2">
          {seasonsAvailable.length > 1 && (
            <div className="w-32 shrink-0">
              <AdminSelect
                value={String(selectedSeasonFilter)}
                onChange={(val) => setSelectedSeasonFilter(val === 'all' ? 'all' : Number(val))}
                options={seasonOptions}
                sheetTitle="Select Season"
                buttonClassName="h-10 text-xs bg-[#050A14]"
              />
            </div>
          )}

          {totalEpisodeCount > 50 && episodeRanges.length > 1 && (
            <div className="w-28 shrink-0">
              <AdminSelect
                value={String(selectedRangeIndex)}
                onChange={(val) => setSelectedRangeIndex(Number(val))}
                options={rangeOptions}
                sheetTitle="Episode Range"
                buttonClassName="h-10 text-xs bg-[#050A14]"
              />
            </div>
          )}

          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ep..."
              value={episodeSearch}
              onChange={(e) => setEpisodeSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#050A14] border border-white/10 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#1E88FF]"
            />
          </div>
        </div>
      )}

      {/* Episode List (Default, matching screenshot) or 6-col Grid */}
      {allEpisodes.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#94A3B8]">
          No episodes matched your filter.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {allEpisodes.map((ep) => {
            const isCurrent = Number(ep.episodeNumber) === Number(currentEpisodeNumber);
            const isWatched = watchedEpNumbers.includes(ep.episodeNumber);
            const isUpcoming = ep.status === 'upcoming' || Boolean(ep.isUpcoming);

            return (
              <button
                key={ep.id || ep.episodeNumber}
                type="button"
                onClick={() => onSelectEpisode(ep)}
                ref={isCurrent ? (activeRef as any) : null}
                aria-label={`Episode ${ep.episodeNumber}${isCurrent ? ' (Playing)' : ''}`}
                className={`h-12 w-full rounded-xl flex items-center justify-center font-semibold text-xs transition-colors duration-150 cursor-pointer relative ${
                  isCurrent
                    ? 'border-2 border-[#1E88FF] bg-[#0E2444] text-white'
                    : isWatched
                    ? 'bg-[#050A14] border border-[#1E2A42] text-[#94A3B8] hover:text-white'
                    : isUpcoming
                    ? 'border border-dashed border-[#2A3A57] text-[#94A3B8] bg-[#080F1E]'
                    : 'bg-[#101A30] hover:border-[#364C75] border border-[#1E2A42] text-white'
                }`}
              >
                <span className="tabular-nums">{ep.episodeNumber}</span>
                {isCurrent && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#1E88FF] absolute top-1.5 right-1.5"
                    aria-hidden="true"
                  />
                )}
                {isWatched && !isCurrent && (
                  <Check className="w-3 h-3 text-[#94A3B8] absolute bottom-1 right-1" />
                )}
                {isUpcoming && !isCurrent && !isWatched && (
                  <Lock className="w-2.5 h-2.5 text-[#94A3B8] absolute bottom-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {allEpisodes.map((ep) => {
            const isCurrent = Number(ep.episodeNumber) === Number(currentEpisodeNumber);
            const isWatched = watchedEpNumbers.includes(ep.episodeNumber);

            return (
              <div
                key={ep.id || ep.episodeNumber}
                ref={isCurrent ? (activeRef as any) : null}
                onClick={() => onSelectEpisode(ep)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectEpisode(ep);
                  }
                }}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer ${
                  isCurrent
                    ? 'bg-[#0E2444] border-[#1E88FF]'
                    : 'bg-[#0E172B] hover:bg-[#101A30] border-[#1E2A42]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 tabular-nums ${
                      isCurrent
                        ? 'bg-[#1E88FF] text-white'
                        : 'bg-white/10 text-[#CBD5E1]'
                    }`}
                  >
                    EP {ep.episodeNumber}
                  </span>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {ep.title || `Episode ${ep.episodeNumber}`}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] truncate">
                      {formatDurationMinutes(ep.duration)}
                    </p>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1E88FF] text-white text-[11px] font-bold shrink-0">
                    Playing
                  </span>
                ) : isWatched ? (
                  <Check className="w-4 h-4 text-[#1E88FF] shrink-0" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
