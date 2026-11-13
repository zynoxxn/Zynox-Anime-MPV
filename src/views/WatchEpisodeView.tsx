import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { Anime } from '../types/anime';
import type { Episode, VideoSource } from '../types/episode';
import type { CmsSeoSettings } from '../types/cms';
import { useAuth } from '../lib/auth';
import {
  getAnimeBySlug,
  getAnimeById,
  getCachedPublishedAnimes,
  getLocalStoredAnimes,
  incrementAnimeViews,
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
import { AdminSelect } from '../components/admin/AdminSelect';
import {
  executeDownloadRedirect,
  getAllEpisodeDownloadMirrors,
  type DownloadMirror,
} from '../lib/downloadRedirect';
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
  Shield,
  Zap,
  Lock,
  Layers,
  LayoutGrid,
  List,
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FastForward,
  Monitor,
  Maximize,
  Info,
  X,
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

  // Video & Stream Preferences remembered per user in localStorage
  const [selectedCategory, setSelectedCategory] = useState<AudioCategory>(() => {
    try {
      const saved = localStorage.getItem(`${prefKeyPrefix}_audio`);
      if (saved === 'dub' || saved === 'sub') return saved;
    } catch {}
    return 'sub';
  });
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(() => {
    try {
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

  // UI Modes & Toggles
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [episodeSearch, setEpisodeSearch] = useState<string>('');
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<number | 'all'>('all');
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number>(0);

  // Modals / Bottom Sheets
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [downloadSheetOpen, setDownloadSheetOpen] = useState<boolean>(false);
  const [downloadMirrors, setDownloadMirrors] = useState<DownloadMirror[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const activeEpisodeItemRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

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

  // Load Watch Data (cache-first, single episode fetch, non-blocking user activity)
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

    // Failsafe guarantee so the full-screen loading spinner can never hang indefinitely
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

        // Fire views & user-activity non-blocking after player is already rendered
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

  // Discover servers for this episode
  const { subServers, dubServers } = useMemo(() => {
    if (!episode) return { subServers: [] as VideoSource[], dubServers: [] as VideoSource[] };

    const rawSourcesList: VideoSource[] = [];
    const seenIds = new Set<string>();

    const addSource = (cand: Partial<VideoSource> | null | undefined, prefix: string) => {
      if (!cand) return;
      const url = (cand.embedUrl || '').trim();
      const frame = (cand.frameCode || (cand as any).frameEmbedUrl || '').trim();
      if (!url && !frame) return;
      if (isMockVideoUrl(url) || isMockVideoUrl(frame)) return;

      let uid = (cand.id || '').trim();
      if (!uid || seenIds.has(uid)) uid = `${prefix}-${seenIds.size + 1}`;
      seenIds.add(uid);
      rawSourcesList.push({ ...cand, id: uid } as VideoSource);
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
          name: 'HD Server 1',
          provider: 'Abyss High Definition',
          embedUrl: episode.videoUrl.trim(),
          active: true,
          category: episode.defaultCategory || 'sub',
        },
        'def'
      );
    }

    const sub: VideoSource[] = [];
    const dub: VideoSource[] = [];

    rawSourcesList.forEach((s) => {
      if (s.active === false) return;
      const cat = (s.category || '').toLowerCase();
      const lang = (s.language || '').toLowerCase();
      const prov = (s.provider || '').toLowerCase();
      const name = (s.name || s.sourceName || '').toLowerCase();

      const isDub =
        cat === 'dub' ||
        lang.includes('dub') ||
        lang === 'hi' ||
        prov.includes('dub') ||
        prov.includes('hindi') ||
        name.includes('dub');
      if (isDub) {
        dub.push(s);
      } else {
        sub.push(s);
      }
    });

    return { subServers: sub, dubServers: dub };
  }, [episode]);

  // Effective category automatically falls back if selected category has 0 servers
  const effectiveCategory: AudioCategory =
    selectedCategory === 'sub'
      ? subServers.length > 0
        ? 'sub'
        : 'dub'
      : dubServers.length > 0
      ? 'dub'
      : 'sub';
  const currentServers = effectiveCategory === 'sub' ? subServers : dubServers;
  const safeServerIndex = selectedServerIndex < currentServers.length ? selectedServerIndex : 0;
  const activeSource: VideoSource | undefined =
    currentServers[safeServerIndex] || currentServers[0] || subServers[0] || dubServers[0];

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

  // Auto-clear player loading overlay so slow/cross-origin iframe embeds never hang on spinner
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

  // Save helper
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

  // Throttled Watch Progress saving every 10 seconds + on leave
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

  // Scroll active episode into view on load
  useEffect(() => {
    if (activeEpisodeItemRef.current) {
      activeEpisodeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [episode?.id, viewMode]);

  // Switch server helper (Preserves current playback time & saves pref per user)
  const handleSwitchServer = (cat: AudioCategory, idx: number) => {
    if (currentTimeRef.current > 0) {
      pendingSeekRef.current = currentTimeRef.current;
    }
    setSelectedCategory(cat);
    setSelectedServerIndex(idx);
    setUseAlternateFrame(false);
    setPlayerLoading(true);
    setPlayerError(false);

    try {
      localStorage.setItem(`${prefKeyPrefix}_audio`, cat);
      localStorage.setItem(`${prefKeyPrefix}_server_idx`, String(idx));
    } catch {}
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

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Desktop Keyboard Shortcuts (Space, Left/Right 10s, F, N, M)
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
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
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

  // Autoplay countdown timer
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

  // Skip Intro / Outro Check
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

  // Download Mirrors Sheet
  const handleOpenDownloadSheet = () => {
    if (!episode) return;
    const mirrors = getAllEpisodeDownloadMirrors(episode, anime);
    setDownloadMirrors(mirrors);
    setDownloadSheetOpen(true);
  };

  // Season Options for Episode List
  const seasonsAvailable = useMemo(() => {
    const s = new Set<number>();
    allEpisodes.forEach((e) => s.add(Number(e.seasonNumber || e.season || 1)));
    return Array.from(s).sort((a, b) => a - b);
  }, [allEpisodes]);

  // Range Pagination for Episode List
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050A14] flex flex-col items-center justify-center text-[#94A3B8] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E88FF]" />
        <p className="text-xs font-semibold">Connecting to high-speed stream...</p>
      </div>
    );
  }

  if (error || !anime || !episode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#050A14]">
        <div className="max-w-md w-full bg-[#0B1324] border border-white/10 p-8 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#101A30] border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
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
            className="w-full h-11 bg-[#1E88FF] hover:bg-[#1570d8] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Anime Details</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F8FAFC] pb-16 overflow-x-clip">
      {/* Invisible link prefetch for next episode */}
      {nextEpisode && (
        <link
          rel="prefetch"
          href={`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}?season=${nextEpisode.seasonNumber || 1}`}
        />
      )}

      {/* TOP COMPACT BREADCRUMB & DETAILS ACTION */}
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 pt-3 pb-3 flex items-center justify-between gap-3 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-1.5 truncate min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            Home
          </button>
          <span className="shrink-0 text-white/30">/</span>
          <button
            type="button"
            onClick={() => navigate(`/anime/${anime.slug}`)}
            className="hover:text-white transition-colors truncate max-w-[150px] sm:max-w-xs font-medium cursor-pointer"
          >
            {anime.title}
          </button>
          <span className="shrink-0 text-white/30">/</span>
          <span className="text-[#00B4FF] font-bold shrink-0">Ep {episode.episodeNumber}</span>
        </div>

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
            className="hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer shrink-0"
          >
            <Monitor className="w-3.5 h-3.5 text-[#1E88FF]" />
            <span>{theaterMode ? 'Default View' : 'Theater Mode'}</span>
          </button>

          {/* Details Button */}
          <button
            type="button"
            onClick={() => navigate(`/anime/${anime.slug}`)}
            className="h-8 px-3 rounded-xl bg-[#0B1324] hover:bg-[#101A30] border border-[#1E88FF]/40 text-[#00B4FF] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Details</span>
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6">
        <div className={`grid gap-5 ${theaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[minmax(0,1100px)_360px] justify-center'}`}>
          
          {/* PLAYER COLUMN (Max 1100px in default view, full width in Theater mode) */}
          <div className="space-y-4 min-w-0">
            {/* 1. FRAMED VIDEO PLAYER CONTAINER (16:9, rounded-2xl, scrolls naturally with page) */}
            <div
              ref={playerContainerRef}
              className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative select-none"
            >
              {/* Spinner / Thumbnail while loading stream or fetching fresh links */}
              {(streamsRefreshing && !currentStreamUrl) || (playerLoading && !playerError && Boolean(currentStreamUrl)) ? (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
                  {(episode.thumbnail || anime.banner) && (
                    <img
                      src={episode.thumbnail || anime.banner}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-30 filter blur-sm"
                    />
                  )}
                  <Loader2 className="w-9 h-9 animate-spin text-[#1E88FF] relative z-10" />
                  <span className="text-xs font-semibold text-white relative z-10">Loading stream...</span>
                </div>
              ) : null}

              {/* Player Error State */}
              {!streamsRefreshing && (playerError || !currentStreamUrl) ? (
                <div className="absolute inset-0 bg-[#0B1324] flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Stream Failed to Load</h3>
                    <p className="text-xs text-[#94A3B8] max-w-sm">
                      This server is unavailable. Try another server or report this broken link.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {currentServers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = (safeServerIndex + 1) % currentServers.length;
                          handleSwitchServer(effectiveCategory, nextIdx);
                        }}
                        className="h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1570d8] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Try another server</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="h-10 px-4 rounded-xl bg-[#101A30] hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 border border-white/10 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Flag className="w-3.5 h-3.5 text-rose-400" />
                      <span>Report broken link</span>
                    </button>
                  </div>
                </div>
              ) : !currentStreamUrl ? null : isDirectVideo ? (
                /* Native HTML5 Video Player */
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
                /* Iframe Embed Player */
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

              {/* Floating Fullscreen Toggle Button for Embeds */}
              {!isDirectVideo && !playerError && currentStreamUrl && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  aria-label="Toggle fullscreen"
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-lg bg-black/60 hover:bg-[#1E88FF] text-white border border-white/15 flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              )}

              {/* Floating Skip Intro Pill */}
              {showSkipIntro && (
                <button
                  type="button"
                  onClick={handleSkipIntro}
                  className="absolute bottom-14 right-4 z-20 h-10 px-4 rounded-xl bg-[#1E88FF]/95 hover:bg-[#1E88FF] text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-2xl transition-all cursor-pointer"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Skip Intro</span>
                </button>
              )}

              {/* Floating Skip Outro Pill */}
              {showSkipOutro && (
                <button
                  type="button"
                  onClick={handleSkipOutro}
                  className="absolute bottom-14 right-4 z-20 h-10 px-4 rounded-xl bg-[#1E88FF]/95 hover:bg-[#1E88FF] text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-white/20 shadow-2xl transition-all cursor-pointer"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Skip Outro</span>
                </button>
              )}

              {/* Floating Autoplay Next 5s Countdown Pill */}
              {countdownSeconds !== null && nextEpisode && (
                <div className="absolute bottom-4 right-4 z-30 bg-[#0B1324]/95 border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-2xl">
                  <span className="text-xs font-semibold text-white">
                    Next episode in {countdownSeconds}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setCountdownSeconds(null)}
                    className="text-xs font-bold text-[#1E88FF] hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* 2. EPISODE INFO & PRIMARY ACTIONS CARD */}
            <div>
              <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                {/* Episode Counter, Title & Anime Series Line */}
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-[#00B4FF]">
                    EPISODE {episode.episodeNumber} OF{' '}
                    {Math.max(
                      allEpisodes.length || 0,
                      anime.totalEpisodes || 0,
                      episode.episodeNumber
                    )}
                  </p>
                  <h1 className="text-lg sm:text-xl font-extrabold text-white leading-snug line-clamp-2">
                    {episode.title || `Episode ${episode.episodeNumber}`}
                  </h1>
                  <button
                    type="button"
                    onClick={() => navigate(`/anime/${anime.slug}`)}
                    className="text-xs sm:text-sm text-[#94A3B8] hover:text-[#1E88FF] transition-colors cursor-pointer block truncate text-left max-w-full"
                  >
                    {anime.title}
                    {anime.year ? ` (${anime.year})` : ''}
                  </button>
                </div>

                {/* Row 1: Segmented Prev/Next + Download */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center rounded-xl border border-white/10 bg-[#050A14]/70 p-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={!prevEpisode}
                      onClick={() => {
                        if (prevEpisode) {
                          const s = prevEpisode.seasonNumber || prevEpisode.season || 1;
                          navigate(`/anime/${anime.slug}/episode/${prevEpisode.episodeNumber}?season=${s}`);
                        }
                      }}
                      className={`h-9 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all whitespace-nowrap ${
                        prevEpisode
                          ? 'text-white hover:bg-white/5 cursor-pointer'
                          : 'text-[#94A3B8]/40 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>Prev</span>
                    </button>

                    <span className="w-px h-5 bg-white/10 mx-0.5" aria-hidden="true" />

                    <button
                      type="button"
                      disabled={!nextEpisode}
                      onClick={() => {
                        if (nextEpisode) {
                          const s = nextEpisode.seasonNumber || nextEpisode.season || 1;
                          navigate(`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}?season=${s}`);
                        }
                      }}
                      className={`h-9 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all whitespace-nowrap ${
                        nextEpisode
                          ? 'bg-[#1E88FF] hover:bg-[#1570d8] text-white cursor-pointer'
                          : 'text-[#94A3B8]/40 cursor-not-allowed'
                      }`}
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenDownloadSheet}
                    className="h-10 px-4 rounded-xl bg-[#050A14]/40 hover:bg-[#101A30] border border-white/10 text-[#CBD5E1] hover:text-white text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Row 2: Watchlist + Favorite + Share + Mark Watched + Report */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleWatchlist}
                    className={`h-10 px-4 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      watchlistStatus
                        ? 'bg-[#1E88FF]/15 border-[#1E88FF]/50 text-[#1E88FF]'
                        : 'bg-[#050A14]/40 hover:bg-[#101A30] border-white/10 text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 shrink-0 ${watchlistStatus ? 'fill-current' : ''}`} />
                    <span>{watchlistStatus ? 'In Watchlist' : 'Watchlist'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
                    aria-label="Toggle favorite"
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      fav
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-400'
                        : 'bg-[#050A14]/40 hover:bg-[#101A30] border-white/10 text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShareEpisode}
                    title="Share episode"
                    aria-label="Share episode"
                    className="w-10 h-10 rounded-xl bg-[#050A14]/40 hover:bg-[#101A30] border border-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkWatchedClick}
                    title={
                      watchedEpNumbers.includes(episode.episodeNumber)
                        ? 'Watched'
                        : 'Mark as watched'
                    }
                    aria-label="Mark episode watched"
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      watchedEpNumbers.includes(episode.episodeNumber)
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        : 'bg-[#050A14]/40 hover:bg-[#101A30] border-white/10 text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    title="Report broken link"
                    aria-label="Report broken link"
                    className="w-10 h-10 rounded-xl bg-[#050A14]/40 hover:bg-[#101A30] border border-white/10 text-[#CBD5E1] hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. AUTHORIZED STREAMS SERVER CARD */}
            <div>
              <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-4 h-4 text-[#1E88FF] shrink-0" />
                  <h2 className="text-sm font-bold text-white truncate">Authorized Streams</h2>
                </div>

                <div className="space-y-3">
                  {subServers.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-[#94A3B8] min-w-[44px] shrink-0">
                        Sub :
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {subServers.map((s, idx) => {
                          const isActive =
                            effectiveCategory === 'sub' && safeServerIndex === idx;
                          return (
                            <button
                              key={s.id || `sub-${idx}`}
                              type="button"
                              onClick={() => handleSwitchServer('sub', idx)}
                              className={`h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                isActive
                                  ? 'bg-[#1E88FF] hover:bg-[#1570d8] text-white'
                                  : 'bg-[#101A30] hover:bg-[#16223e] border border-white/10 text-[#CBD5E1] hover:text-white'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5 shrink-0" />
                              <span>{s.name || s.sourceName || `Server ${idx + 1}`}</span>
                            </button>
                          );
                        })}

                        {effectiveCategory === 'sub' && hasAlternateFrame && (
                          <button
                            type="button"
                            onClick={() => {
                              if (currentTimeRef.current > 0) {
                                pendingSeekRef.current = currentTimeRef.current;
                              }
                              setUseAlternateFrame(!useAlternateFrame);
                              setPlayerLoading(true);
                            }}
                            className={`h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                              useAlternateFrame
                                ? 'bg-[#1E88FF]/20 border-[#1E88FF] text-[#1E88FF]'
                                : 'bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            Mirror 2
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {dubServers.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-[#94A3B8] min-w-[44px] shrink-0">
                        Dub :
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {dubServers.map((s, idx) => {
                          const isActive =
                            effectiveCategory === 'dub' && safeServerIndex === idx;
                          return (
                            <button
                              key={s.id || `dub-${idx}`}
                              type="button"
                              onClick={() => handleSwitchServer('dub', idx)}
                              className={`h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                isActive
                                  ? 'bg-[#1E88FF] hover:bg-[#1570d8] text-white'
                                  : 'bg-[#101A30] hover:bg-[#16223e] border border-white/10 text-[#CBD5E1] hover:text-white'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5 shrink-0" />
                              <span>{s.name || s.sourceName || `Server ${idx + 1}`}</span>
                            </button>
                          );
                        })}

                        {effectiveCategory === 'dub' && hasAlternateFrame && (
                          <button
                            type="button"
                            onClick={() => {
                              if (currentTimeRef.current > 0) {
                                pendingSeekRef.current = currentTimeRef.current;
                              }
                              setUseAlternateFrame(!useAlternateFrame);
                              setPlayerLoading(true);
                            }}
                            className={`h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                              useAlternateFrame
                                ? 'bg-[#1E88FF]/20 border-[#1E88FF] text-[#1E88FF]'
                                : 'bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            Mirror 2
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {subServers.length === 0 && dubServers.length === 0 && (
                    <p className="text-xs text-[#94A3B8]">
                      No stream servers available for this episode yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* MOBILE / THEATER EPISODE LIST (Shown below player controls on <1024px or in Theater Mode) */}
            <div className={theaterMode ? 'block' : 'block lg:hidden'}>
              <EpisodeListSection
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
                onSelectEpisode={(ep) => {
                  const s = ep.seasonNumber || ep.season || 1;
                  navigate(`/anime/${anime.slug}/episode/${ep.episodeNumber}?season=${s}`);
                }}
                activeRef={activeEpisodeItemRef}
              />
            </div>

            {/* 5. COMMENTS SECTION (Lazy Loaded via CommentSection IntersectionObserver) */}
            <div className="pt-1">
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
          </div>

          {/* 6. RIGHT COLUMN: STICKY EPISODE LIST (Desktop default mode, 360px wide, max-h calc(100dvh - 120px)) */}
          {!theaterMode && (
            <div className="hidden lg:block sticky top-20 max-h-[calc(100dvh-120px)] overflow-y-auto no-scrollbar">
              <EpisodeListSection
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-[#0B1324] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl max-h-[85dvh] overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="min-w-0 pr-3">
                <h3 className="text-base font-bold text-white truncate">Download EP {episode.episodeNumber}</h3>
                <p className="text-xs text-[#94A3B8] truncate">{anime.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setDownloadSheetOpen(false)}
                aria-label="Close downloads"
                className="w-8 h-8 rounded-xl bg-[#101A30] hover:bg-white/10 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {downloadMirrors.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No Direct Download Links</p>
                <p className="text-xs text-[#94A3B8]">
                  Downloads for this episode have not been added yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {downloadMirrors.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      executeDownloadRedirect(
                        m.url,
                        `${anime.title} - Episode ${episode.episodeNumber} [${m.quality}]`,
                        onShowMessage
                      );
                      setDownloadSheetOpen(false);
                    }}
                    className="w-full p-3.5 rounded-xl bg-[#101A30] hover:bg-[#1E88FF]/15 border border-white/10 hover:border-[#1E88FF]/50 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-[#1E88FF]">
                          {m.quality}
                        </span>
                        {m.size && (
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-[#94A3B8]">
                            {m.size}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#94A3B8] block truncate">
                        Host: {m.host || 'Direct Mirror'}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#1E88FF] text-white flex items-center justify-center shrink-0 shadow-md">
                      <Download className="w-4 h-4" />
                    </div>
                  </button>
                ))}
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
  onSelectEpisode: (ep: Episode) => void;
  activeRef: React.RefObject<HTMLDivElement | null>;
}

const EpisodeListSection: React.FC<EpisodeListSectionProps> = ({
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
      label: `EP ${r.label}`,
    }));
  }, [episodeRanges]);

  return (
    <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-4 space-y-3">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#1E88FF] shrink-0" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">Episodes</h3>
          <span className="text-xs text-[#94A3B8] shrink-0">({allEpisodes.length})</span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[#101A30] p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs cursor-pointer ${
              viewMode === 'list' ? 'bg-[#1E88FF] text-white shadow' : 'text-[#94A3B8]'
            }`}
            title="List View"
            aria-label="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs cursor-pointer ${
              viewMode === 'grid' ? 'bg-[#1E88FF] text-white shadow' : 'text-[#94A3B8]'
            }`}
            title="Grid View"
            aria-label="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Season / Range / Search row (Custom AdminSelect - no native select) */}
      <div className="flex flex-wrap items-center gap-2">
        {seasonsAvailable.length > 1 && (
          <div className="w-32 shrink-0">
            <AdminSelect
              value={String(selectedSeasonFilter)}
              onChange={(val) => setSelectedSeasonFilter(val === 'all' ? 'all' : Number(val))}
              options={seasonOptions}
              sheetTitle="Select Season"
              buttonClassName="h-8 text-xs bg-[#101A30]"
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
              buttonClassName="h-8 text-xs bg-[#101A30]"
            />
          </div>
        )}

        <div className="relative flex-1 min-w-[110px]">
          <Search className="w-3 h-3 text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ep..."
            value={episodeSearch}
            onChange={(e) => setEpisodeSearch(e.target.value)}
            className="w-full h-8 pl-7 pr-2 rounded-lg bg-[#101A30] border border-white/10 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#1E88FF]"
          />
        </div>
      </div>

      {/* Episode Tiles or List Items */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[420px] overflow-y-auto no-scrollbar p-0.5">
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
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto no-scrollbar p-0.5">
          {allEpisodes.map((ep) => {
            const isCurrent = Number(ep.episodeNumber) === Number(currentEpisodeNumber);
            const isWatched = watchedEpNumbers.includes(ep.episodeNumber);
            const isUpcoming = ep.status === 'upcoming' || Boolean(ep.isUpcoming);

            return (
              <div
                key={ep.id || ep.episodeNumber}
                ref={isCurrent ? (activeRef as any) : null}
                onClick={() => onSelectEpisode(ep)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
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
                    <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-white' : 'text-[#F8FAFC]'}`}>
                      {ep.title || `Episode ${ep.episodeNumber}`}
                    </p>
                    {ep.duration && (
                      <span className="text-[10px] text-[#94A3B8]">{ep.duration}m</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isCurrent ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#1E88FF] text-white text-[10px] font-bold">
                      Playing
                    </span>
                  ) : isWatched ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isUpcoming ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
