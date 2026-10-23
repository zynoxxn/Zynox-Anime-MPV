import React, { useEffect, useState, useRef } from 'react';
import type { Anime } from '../types/anime';
import type { Episode, VideoSource } from '../types/episode';
import type { WatchlistStatus } from '../types/library';
import { useAuth } from '../lib/auth';
import { getAnimeBySlug, getPublishedAnimes, incrementAnimeViews, cleanAnimeTitle } from '../lib/firestore/anime';
import {
  getEpisodeById,
  getEpisodeByAnimeAndNumber,
  getPublishedEpisodesByAnimeId,
  incrementEpisodeViews,
} from '../lib/firestore/episodes';
import {
  saveWatchProgress,
  markEpisodeWatched,
  getWatchedEpisodes,
  toggleFavorite,
  isFavorite,
  setWatchlistStatus,
  removeFromWatchlist,
  getAnimeWatchlistStatus,
} from '../lib/firestore/user-activity';
import { validateVideoUrl, extractIframeSrc, transformStreamUrl } from '../lib/video-hosts';
import { AutoNextModal } from '../components/AutoNextModal';
import { ReportEpisodeModal } from '../components/ReportEpisodeModal';
import { ShareModal } from '../components/ShareModal';
import { openSystemShare } from '../lib/share';
import { DownloadModal } from '../components/DownloadModal';
import { EpisodeSelector } from '../components/EpisodeSelector';
import { AnimeCard } from '../components/AnimeCard';
import { CommentSection } from '../components/community/CommentSection';
import {
  resolveEpisodeDownloadUrl,
  executeDownloadRedirect,
  getAllEpisodeDownloadMirrors,
  type DownloadMirror,
} from '../lib/downloadRedirect';
import { generateAnimeSeoMetadata, generateAnimeGoogleTags } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Film,
  Loader2,
  Code2,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Flag,
  Share2,
  Server,
  Zap,
  Mic,
  Volume2,
  Download,
  Bookmark,
  Shield,
  Info,
  Layers,
  ExternalLink,
  Star,
  Clock,
  Calendar,
  Sparkles,
  Check,
  Heart,
} from 'lucide-react';

interface WatchEpisodeViewProps {
  animeSlug: string;
  episodeNumberOrId: string;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

type SourceType = 'primary' | 'alternate';

export const WatchEpisodeView: React.FC<WatchEpisodeViewProps> = ({
  animeSlug,
  episodeNumberOrId,
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [relatedAnimes, setRelatedAnimes] = useState<Anime[]>([]);
  const [watchedEpNumbers, setWatchedEpNumbers] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(0);
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType>('primary');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [, setIframeLoaded] = useState<boolean>(false);

  const handleSelectStream = (category: 'sub' | 'dub', serverIndex: number) => {
    setSelectedCategory(category);
    setSelectedServerIndex(serverIndex);
    setSelectedSourceType('primary');
    setIframeError(false);
    setVideoError(false);
    setIframeLoaded(false);
  };

  // Modals & AutoNext state
  const [autoNextOpen, setAutoNextOpen] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  const [downloadMirrors, setDownloadMirrors] = useState<DownloadMirror[]>([]);

  // Watchlist & Favorite state
  const [watchlistStatus, setWatchlistStatusState] = useState<WatchlistStatus | null>(null);
  const [fav, setFav] = useState<boolean>(false);

  useEffect(() => {
    if (anime?.id) {
      getAnimeWatchlistStatus(user?.uid || null, anime.id).then(setWatchlistStatusState).catch(() => {});
      isFavorite(user?.uid || null, anime.id).then(setFav).catch(() => {});
    }
  }, [anime?.id, user?.uid]);

  const handleShare = () => {
    const shareTitle = `${anime?.title || 'Anime'} - Episode ${episode?.episodeNumber || episodeNumberOrId}`;
    const shareText = `Watch ${anime?.title || 'Anime'} Episode ${episode?.episodeNumber || episodeNumberOrId} in Hindi Dub & English Sub on ZYNOX ANIME`;
    openSystemShare({
      title: shareTitle,
      text: shareText,
      url: typeof window !== 'undefined' ? window.location.href : '',
      onShowMessage,
      onFallback: () => setShareOpen(true),
    });
  };

  // Dynamic Google Search SEO & TVEpisode Schema.org
  const seoMetadata = React.useMemo(() => {
    if (!anime) return null;
    return generateAnimeSeoMetadata(anime, {
      episodeNumber: episode?.episodeNumber ? Number(episode.episodeNumber) : undefined,
      episodeTitle: episode?.title,
      siteName: 'ZYNOX ANIME',
    });
  }, [anime, episode]);

  usePageSeo(seoMetadata);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchWatchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setIframeError(false);
        setIframeLoaded(false);
        setSelectedSourceType('primary');
        setAutoNextOpen(false);

        const animeData = await getAnimeBySlug(animeSlug);
        if (!animeData) {
          if (isMounted) setError('Anime not found.');
          return;
        }

        let epData: Episode | null = null;
        const parsedEpNum = Number(episodeNumberOrId);

        if (!isNaN(parsedEpNum) && animeData.id) {
          epData = await getEpisodeByAnimeAndNumber(animeData.id, parsedEpNum);
        }

        if (!epData) {
          epData = await getEpisodeById(episodeNumberOrId);
        }

        if (!epData) {
          if (isMounted) setError('Episode not found.');
          return;
        }

        if (isMounted) {
          setAnime(animeData);
          setEpisode(epData);
        }

        if (animeData.id && epData.id) {
          incrementEpisodeViews(epData.id);
          incrementAnimeViews(animeData.id);

          const [episodesList, watchedList, allCatalog] = await Promise.all([
            getPublishedEpisodesByAnimeId(animeData.id),
            getWatchedEpisodes(user?.uid || null, animeData.id),
            getPublishedAnimes(),
          ]);

          if (isMounted) {
            setAllEpisodes(episodesList);
            setWatchedEpNumbers(watchedList);

            // Related series calculation: genre matches first, then popular/catalog fallback
            const genreMatches = allCatalog.filter((a) => {
              if (a.id === animeData.id || a.slug === animeData.slug) return false;
              if (!animeData.genres || !a.genres) return false;
              return a.genres.some((g) => animeData.genres?.includes(g));
            });
            const otherCatalog = allCatalog.filter((a) => a.id !== animeData.id && a.slug !== animeData.slug && !genreMatches.some(gm => gm.id === a.id));
            const combinedRelated = [...genreMatches, ...otherCatalog];
            setRelatedAnimes(combinedRelated.slice(0, 6));

            // Record initial progress
            saveWatchProgress(user?.uid || null, {
              animeId: animeData.id,
              animeSlug: animeData.slug,
              animeTitle: animeData.title,
              animePoster: animeData.poster,
              episodeId: epData.id,
              episodeNumber: epData.episodeNumber,
              episodeTitle: epData.title,
              progress: 10,
              duration: 1440,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching watch data:', err);
          setError('Failed to load video player.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWatchData();
    return () => {
      isMounted = false;
    };
  }, [animeSlug, episodeNumberOrId, user?.uid]);

  // Fallback high-speed streaming links
  const FALLBACK_DIRECT_STREAMS = [
    'https://media.w3.org/2010/05/sintel/trailer.mp4',
    'https://media.w3.org/2010/05/bunny/trailer.mp4',
    'https://vjs.zencdn.net/v/oceans.mp4',
  ];

  // Helper to test if a source has a non-empty embed URL or frame code
  const hasValidStreamUrl = (s: Partial<VideoSource> | null | undefined): boolean => {
    if (!s) return false;
    const url = (s.embedUrl || '').trim();
    const frame = (s.frameCode || (s as any).frameEmbedUrl || '').trim();
    return Boolean(url || frame);
  };

  // Build filtered servers list containing ONLY servers with a valid embed URL or frameCode
  const { subServers, dubServers, defaultSelection } = React.useMemo(() => {
    if (!episode) {
      return {
        subServers: [] as VideoSource[],
        dubServers: [] as VideoSource[],
        defaultSelection: { category: 'sub' as const, index: 0 },
      };
    }

    const rawSourcesList: VideoSource[] = [];
    const seenIds = new Set<string>();

    const addSourceDeduplicated = (sourceCandidate: Partial<VideoSource> | null | undefined, fallbackPrefix: string) => {
      if (!sourceCandidate) return;
      // CRITICAL REQUIREMENT: Only keep servers that have a valid embed URL or frame code
      if (!hasValidStreamUrl(sourceCandidate)) return;

      const originalId = (sourceCandidate.id || '').trim();
      let uniqueId = originalId;
      if (!uniqueId || seenIds.has(uniqueId)) {
        uniqueId = `${fallbackPrefix}-${seenIds.size + 1}-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(uniqueId);
      rawSourcesList.push({
        ...sourceCandidate,
        id: uniqueId,
      } as VideoSource);
    };

    // 1. Add valid videoSources
    if (Array.isArray(episode.videoSources) && episode.videoSources.length > 0) {
      episode.videoSources.forEach((s, idx) => {
        addSourceDeduplicated(s, `vsrc-${idx + 1}`);
      });
    }

    // 2. Add valid sources if not already covered
    if (Array.isArray(episode.sources) && episode.sources.length > 0) {
      episode.sources.forEach((s, idx) => {
        if (!s) return;
        const sEmbed = (s.embedUrl || '').trim().toLowerCase();
        const isDuplicateUrl = sEmbed && rawSourcesList.some(
          (existing) => (existing.embedUrl || '').trim().toLowerCase() === sEmbed
        );
        if (!isDuplicateUrl) {
          addSourceDeduplicated(s, `src-${idx + 1}`);
        }
      });
    }

    // 3. If no sources found with URLs, but episode has videoUrl
    if (rawSourcesList.length === 0 && episode.videoUrl && episode.videoUrl.trim()) {
      addSourceDeduplicated({
        id: 'default-source',
        name: 'server 1',
        provider: 'server 1',
        sourceName: 'server 1',
        embedUrl: episode.videoUrl.trim(),
        active: true,
        type: episode.videoUrl.endsWith('.m3u8') ? 'hls' : episode.videoUrl.endsWith('.mp4') ? 'mp4' : 'embed',
        category: episode.defaultCategory || 'sub',
        isDefault: true,
      }, 'default');
    }

    // 4. Fallback streams ONLY if absolutely no valid source was found in the episode at all
    if (rawSourcesList.length === 0) {
      FALLBACK_DIRECT_STREAMS.forEach((url, idx) => {
        addSourceDeduplicated({
          id: `fallback-srv-${idx + 1}`,
          name: `server ${idx + 1}`,
          provider: `server ${idx + 1}`,
          sourceName: `server ${idx + 1}`,
          embedUrl: url,
          active: true,
          type: 'mp4',
          category: idx === 0 ? 'sub' : 'dub',
          isDefault: idx === 0,
        }, `fallback-${idx + 1}`);
      });
    }

    // Separate into Sub and Dub candidate lists
    const subCandidates: VideoSource[] = [];
    const dubCandidates: VideoSource[] = [];
    const neutralCandidates: VideoSource[] = [];

    for (const s of rawSourcesList) {
      if (s.active === false) continue;
      const cat = (s.category || '').toLowerCase();
      const l = (s.language || '').toLowerCase();
      const p = (s.provider || '').toLowerCase();
      const n = (s.name || s.sourceName || '').toLowerCase();

      if (cat === 'dub') {
        dubCandidates.push(s);
      } else if (cat === 'sub') {
        subCandidates.push(s);
      } else {
        const isDub = l.includes('dub') || l === 'hi' || p.includes('dub') || p.includes('hindi') || n.includes('dub');
        const isSub = l.includes('sub') || l === 'ja' || p.includes('sub') || p.includes('multi') || n.includes('sub');

        if (isDub && !isSub) {
          dubCandidates.push(s);
        } else if (isSub && !isDub) {
          subCandidates.push(s);
        } else if (isDub && isSub) {
          dubCandidates.push(s);
          subCandidates.push(s);
        } else {
          neutralCandidates.push(s);
        }
      }
    }

    const finalSub = [...subCandidates];
    const finalDub = [...dubCandidates];

    if (neutralCandidates.length > 0) {
      if (finalSub.length === 0 && finalDub.length > 0) {
        finalDub.push(...neutralCandidates);
      } else {
        finalSub.push(...neutralCandidates);
      }
    }

    // Determine default server selection configured by Admin
    let selectedCat: 'sub' | 'dub' = 'sub';
    let selectedIdx = 0;
    let foundDefault = false;

    const targetId = episode.defaultSourceId;
    const prefCat = episode.defaultCategory;

    // 1. Match by episode.defaultSourceId
    if (targetId) {
      const subMatch = finalSub.findIndex((s) => s.id === targetId);
      if (subMatch !== -1) {
        selectedCat = 'sub';
        selectedIdx = subMatch;
        foundDefault = true;
      } else {
        const dubMatch = finalDub.findIndex((s) => s.id === targetId);
        if (dubMatch !== -1) {
          selectedCat = 'dub';
          selectedIdx = dubMatch;
          foundDefault = true;
        }
      }
    }

    // 2. Match by isDefault property on sources
    if (!foundDefault) {
      const subDefIdx = finalSub.findIndex((s) => s.isDefault);
      const dubDefIdx = finalDub.findIndex((s) => s.isDefault);

      if (prefCat === 'dub' && dubDefIdx !== -1) {
        selectedCat = 'dub';
        selectedIdx = dubDefIdx;
        foundDefault = true;
      } else if (subDefIdx !== -1) {
        selectedCat = 'sub';
        selectedIdx = subDefIdx;
        foundDefault = true;
      } else if (dubDefIdx !== -1) {
        selectedCat = 'dub';
        selectedIdx = dubDefIdx;
        foundDefault = true;
      }
    }

    // 3. If still not matched, respect preferred category or fallback to available
    if (!foundDefault) {
      if (prefCat === 'dub' && finalDub.length > 0) {
        selectedCat = 'dub';
        selectedIdx = 0;
      } else if (finalSub.length > 0) {
        selectedCat = 'sub';
        selectedIdx = 0;
      } else if (finalDub.length > 0) {
        selectedCat = 'dub';
        selectedIdx = 0;
      }
    }

    return {
      subServers: finalSub,
      dubServers: finalDub,
      defaultSelection: { category: selectedCat, index: selectedIdx },
    };
  }, [episode]);

  // Auto-select the admin-configured default server whenever episode is loaded/switched
  React.useEffect(() => {
    if (defaultSelection && episode) {
      setSelectedCategory(defaultSelection.category);
      setSelectedServerIndex(defaultSelection.index);
      setSelectedSourceType('primary');
      setIframeError(false);
      setVideoError(false);
    }
  }, [episode?.id, defaultSelection]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-[#A9B8CC] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#00A8FF]" />
        <p className="text-sm font-medium">Initializing high-definition streaming node...</p>
      </div>
    );
  }

  if (error || !anime || !episode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-[#0A1628] border border-rose-500/30 text-rose-300 p-8 rounded-3xl shadow-2xl space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
          <h2 className="text-xl font-bold text-[#F5F9FF]">{error || 'Episode Not Available'}</h2>
          <button
            type="button"
            onClick={() => navigate(`/anime/${animeSlug}`)}
            className="px-5 py-2.5 bg-[#0D1B2E] hover:bg-[#11243C] text-white text-xs font-bold rounded-xl border border-white/10 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Anime
          </button>
        </div>
      </div>
    );
  }

  const activeServerList = selectedCategory === 'sub' ? subServers : dubServers;
  const currentSource: VideoSource | undefined =
    activeServerList[selectedServerIndex] || activeServerList[0] || (selectedCategory === 'sub' ? dubServers[0] : subServers[0]);

  const rawFrameCode = currentSource?.frameCode || (currentSource as any)?.frameEmbedUrl || '';
  const extractedFrameSrc = extractIframeSrc(rawFrameCode);
  const hasAlternate = Boolean(rawFrameCode && rawFrameCode.trim());

  let rawUrl = '';
  let validationError: string | undefined;

  if (currentSource) {
    if (selectedSourceType === 'alternate') {
      if (extractedFrameSrc) {
        rawUrl = extractedFrameSrc;
      } else if (currentSource.embedUrl) {
        rawUrl = currentSource.embedUrl;
      } else {
        validationError = 'Could not safely extract valid stream URL from Frame Code.';
      }
    } else {
      if (currentSource.embedUrl) {
        rawUrl = currentSource.embedUrl;
      } else if (extractedFrameSrc) {
        rawUrl = extractedFrameSrc;
      }
    }
  }

  // Fallback to episode.videoUrl if rawUrl is still empty
  if (!rawUrl && episode.videoUrl) {
    rawUrl = episode.videoUrl;
  }

  // Transform stream URL (converts YouTube watch links to embed, Google Drive to preview, direct video detection)
  const transformed = transformStreamUrl(rawUrl);
  const currentUrl = transformed.url || rawUrl;
  const isDirectVideo = transformed.isDirect;

  const validation = currentUrl
    ? validateVideoUrl(currentUrl)
    : { isValid: false, hostname: '', error: validationError || 'No video URL provided.' };

  const currentIndex = allEpisodes.findIndex((e) => e.episodeNumber === episode.episodeNumber);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const isUpcomingEpisode = episode.status === 'upcoming' || Boolean(episode.isUpcoming);
  const isAnimeUpcoming =
    anime.status === 'upcoming' ||
    Boolean(anime.isUpcoming) ||
    isUpcomingEpisode ||
    allEpisodes.some((e) => e.status === 'upcoming' || Boolean(e.isUpcoming));


  const handleWatchlistToggle = async () => {
    if (!anime?.id) return;
    if (watchlistStatus) {
      setWatchlistStatusState(null);
      await removeFromWatchlist(user?.uid || null, anime.id);
      onShowMessage?.(`Removed "${anime.title}" from Watchlist.`);
    } else {
      const newStatus: WatchlistStatus = 'watching';
      setWatchlistStatusState(newStatus);
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
    onShowMessage?.(newFav ? `Added "${anime.title}" to favorites.` : `Removed from favorites.`);
  };

  const handleMarkAsWatched = async () => {
    if (anime.id && episode.id) {
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
      setWatchedEpNumbers((prev) => Array.from(new Set([...prev, episode.episodeNumber])));
      onShowMessage?.(`Marked Episode ${episode.episodeNumber} as watched!`);
    }
  };

  const handlePlayNext = () => {
    if (nextEpisode) {
      navigate(`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}`);
    }
  };

  const handleDownloadCurrentEpisode = () => {
    if (!episode) return;
    const slug = anime?.slug || anime?.id;
    if (slug) {
      const epSeason = episode.seasonNumber || episode.season || 1;
      navigate(`/anime/${slug}/download?season=${epSeason}&episode=${episode.episodeNumber}`);
      return;
    }
    const mirrors = getAllEpisodeDownloadMirrors(episode, anime);
    if (mirrors.length > 1) {
      setDownloadMirrors(mirrors);
      setDownloadModalOpen(true);
      return;
    }

    const dlUrl = mirrors.length === 1 ? mirrors[0].url : resolveEpisodeDownloadUrl(episode, anime);
    if (!dlUrl) {
      onShowMessage?.('Download link for this episode has not been added yet.');
      return;
    }

    executeDownloadRedirect(
      dlUrl,
      `${anime?.title || 'Anime'} - Episode ${episode.episodeNumber}`,
      onShowMessage
    );
  };

  const handleOpenEpisodeMirrors = (targetEp?: Episode) => {
    const epToDl = targetEp || episode;
    if (!epToDl) return;
    const slug = anime?.slug || anime?.id;
    if (slug) {
      const epSeason = epToDl.seasonNumber || epToDl.season || 1;
      navigate(`/anime/${slug}/download?season=${epSeason}&episode=${epToDl.episodeNumber}`);
      return;
    }
    const mirrors = getAllEpisodeDownloadMirrors(epToDl, anime);
    setDownloadMirrors(mirrors);
    setDownloadModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* 1. TOP BREADCRUMB */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#A9B8CC] font-medium truncate">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-[#00D9FF] transition-colors"
          >
            Home
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => navigate(`/anime/${anime.slug}`)}
            className="hover:text-[#00D9FF] transition-colors truncate max-w-[150px] sm:max-w-xs"
          >
            {anime.title}
          </button>
          <span>/</span>
          <span className="text-[#00D9FF] font-bold">Ep {episode.episodeNumber}</span>
        </div>

        <button
          id="btn-goto-anime-details"
          type="button"
          onClick={() => navigate(`/anime/${anime.slug}`)}
          className="px-3 py-1.5 bg-[#0A1628] hover:bg-[#0D1B2E] text-[#00D9FF] text-xs font-bold rounded-xl border border-[#00A8FF]/30 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>
      </div>

      {/* 2. MAIN VIDEO PLAYER CONTAINER */}
      <div className="relative bg-[#0A1628] border border-[#00A8FF]/30 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-[#00A8FF]/10">
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {isUpcomingEpisode && (!currentSource || !currentUrl) ? (
            <div className="text-center p-6 sm:p-10 text-[#A9B8CC] max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upcoming Episode Scheduled</span>
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-[#F5F9FF]">
                  Episode {episode.episodeNumber} is Coming Soon!
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {episode.airDate || anime.upcomingAirDate || anime.releaseDay ? (
                    <>
                      Scheduled air: <strong className="text-white">{episode.airDate || anime.upcomingAirDate || anime.releaseDay}</strong>
                      {episode.releaseTime || anime.upcomingReleaseTime || anime.releaseTime ? ` at ${episode.releaseTime || anime.upcomingReleaseTime || anime.releaseTime}` : ''}
                      {episode.timezone ? ` (${episode.timezone})` : ''}
                    </>
                  ) : (
                    'This episode is currently scheduled and will be available as soon as it premieres.'
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate(`/anime/${anime.slug}`)}
                  className="px-4 py-2 bg-[#0A1628] hover:bg-[#11243C] text-white text-xs font-bold rounded-xl border border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Anime</span>
                </button>
              </div>
            </div>
          ) : !currentSource || !currentUrl ? (
            <div className="text-center p-8 text-[#A9B8CC]">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-bold text-[#F5F9FF]">Video source is currently offline.</p>
              <p className="text-xs text-[#A9B8CC] mt-1">
                {validationError || 'No active embed URL configured for this episode.'}
              </p>
            </div>
          ) : !validation.isValid ? (
            <div className="text-center max-w-md p-6 bg-red-950/40 border border-red-500/30 rounded-2xl m-4 text-red-300 space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
              <h3 className="font-bold text-sm">Unable to load this video source</h3>
              <p className="text-xs text-red-300/80">{validation.error}</p>
              {hasAlternate && selectedSourceType === 'primary' && (
                <button
                  type="button"
                  onClick={() => setSelectedSourceType('alternate')}
                  className="px-4 py-2 bg-[#0066FF] text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Try Alternate (Abyss Frame Code)
                </button>
              )}
            </div>
          ) : isDirectVideo ? (
            <div className="relative w-full h-full">
              <video
                key={currentUrl}
                src={currentUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full bg-black object-contain"
              >
                <source src={currentUrl} type="video/mp4" />
                Your browser does not support HTML5 video streaming.
              </video>

              {videoError && (
                <div className="absolute inset-0 bg-[#030712]/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <h3 className="text-base font-bold text-[#F5F9FF]">Stream Playback Notice</h3>
                  <p className="text-xs text-[#A9B8CC] max-w-md">
                    This video stream encountered a playback error in your browser. Switch to an alternate server or open the stream in a new tab.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectStream(selectedCategory, selectedServerIndex === 0 ? 1 : 0);
                      }}
                      className="px-5 py-2.5 bg-[#1683FF] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Switch to Alternate Server</span>
                    </button>
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Stream in New Tab</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <iframe
                ref={iframeRef}
                key={`${currentUrl}-${selectedSourceType}`}
                src={currentUrl}
                title={`${anime.title} - Episode ${episode.episodeNumber}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="origin-when-cross-origin"
                loading="eager"
                onLoad={() => setIframeLoaded(true)}
                onError={() => setIframeError(true)}
              />

              {iframeError && (
                <div className="absolute inset-0 bg-[#030712]/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <h3 className="text-base font-bold text-[#F5F9FF]">Streaming Host Notice</h3>
                  <p className="text-xs text-[#A9B8CC] max-w-md">
                    This video host restricts direct embedding or requires opening in a dedicated stream tab.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectStream(selectedCategory, selectedServerIndex === 0 ? 1 : 0);
                      }}
                      className="px-5 py-2.5 bg-[#1683FF] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Switch to Alternate Server</span>
                    </button>
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Stream in New Tab</span>
                    </a>
                    {hasAlternate && selectedSourceType === 'primary' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSourceType('alternate');
                          setIframeError(false);
                          setVideoError(false);
                        }}
                        className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all shadow-lg"
                      >
                        Try Alternate Source
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Auto Next Countdown Modal */}
          {nextEpisode && (
            <AutoNextModal
              isOpen={autoNextOpen}
              nextEpisodeNumber={nextEpisode.episodeNumber}
              onPlayNext={handlePlayNext}
              onCancel={() => setAutoNextOpen(false)}
            />
          )}
        </div>
      </div>

      {/* 3. EPISODE INFO & NAVIGATION CARD */}
      <div className="bg-[#07111F] border border-white/[0.06] hover:border-[#1683FF]/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {/* Episode Title & Metadata */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-black text-[#00CFFF] tracking-wider uppercase">
                EPISODE {episode.episodeNumber} OF {allEpisodes.length > 0 ? allEpisodes.length : episode.episodeNumber}
              </span>
            </div>

            {/* Episode Title */}
            <h1 className="text-lg sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
              {episode.title || `Episode ${episode.episodeNumber}`}
            </h1>

            {/* Subtitle with year and anime title */}
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs text-[#94A3B8]">
                {cleanAnimeTitle(anime.title)}{anime.year ? ` (${anime.year})` : ''}
              </p>
            </div>


          </div>

          {/* Action Toolbar: [◀ Prev] [Next ▶] | [⬇ Download] [🔖 Watchlist] [♥ Favorite] [🔗 Share] [✓ Watched] [🚩 Report] */}
          <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0">
            {/* Prev & Next Controls */}
            <div className="inline-flex items-center gap-1 bg-[#050A14] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                disabled={!prevEpisode}
                onClick={() =>
                  prevEpisode &&
                  navigate(`/anime/${anime.slug}/episode/${prevEpisode.episodeNumber}`)
                }
                className="px-3 py-1.5 hover:bg-[#081426] disabled:opacity-30 disabled:pointer-events-none text-[#F8FAFC] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                type="button"
                disabled={!nextEpisode}
                onClick={() =>
                  nextEpisode &&
                  navigate(`/anime/${anime.slug}/episode/${nextEpisode.episodeNumber}`)
                }
                className="px-3.5 py-1.5 bg-[#1683FF] hover:bg-[#2196FF] disabled:opacity-30 disabled:pointer-events-none text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 shadow-md shadow-[#1683FF]/20 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download */}
            <button
              type="button"
              onClick={handleDownloadCurrentEpisode}
              className="px-3 py-2 bg-[#050A14] hover:bg-emerald-600/20 text-[#94A3B8] hover:text-emerald-400 rounded-xl border border-white/10 hover:border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download Episode"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            {/* Watchlist */}
            <button
              type="button"
              onClick={handleWatchlistToggle}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                watchlistStatus
                  ? 'bg-[#1683FF] text-white border-[#1683FF] shadow-sm shadow-[#1683FF]/30'
                  : 'bg-[#050A14] hover:bg-[#081426] text-[#94A3B8] hover:text-white border-white/10'
              }`}
              title={watchlistStatus ? 'In Watchlist' : 'Add to Watchlist'}
            >
              {watchlistStatus ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{watchlistStatus ? 'In Watchlist' : 'Watchlist'}</span>
            </button>

            {/* Favorite */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                fav
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/30'
                  : 'bg-[#050A14] hover:bg-[#081426] text-[#94A3B8] hover:text-white border-white/10'
              }`}
              title={fav ? 'Favorited' : 'Add to favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 bg-[#050A14] hover:bg-[#081426] text-[#94A3B8] hover:text-[#00CFFF] rounded-xl border border-white/10 transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Mark Watched */}
            <button
              type="button"
              onClick={handleMarkAsWatched}
              className="p-2.5 bg-[#050A14] hover:bg-[#081426] text-[#94A3B8] hover:text-emerald-400 rounded-xl border border-white/10 transition-colors cursor-pointer"
              title="Mark Watched"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>

            {/* Report */}
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="p-2.5 bg-[#050A14] hover:bg-amber-500/20 text-[#94A3B8] hover:text-amber-400 rounded-xl border border-white/10 transition-colors cursor-pointer"
              title="Report Issue"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. AUTHORIZED STREAMING NODES */}
      <div className="bg-[#07111F] border border-white/[0.06] hover:border-[#1683FF]/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl transition-all">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1683FF]" />
            <span>Authorized Streams</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Sub Row */}
          {subServers.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <span className="text-xs font-bold text-[#A9B8CC] w-12 shrink-0">
                Sub :
              </span>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                {subServers.map((srv, idx) => (
                  <button
                    key={`watch-sub-srv-${srv.id || 'idx'}-${idx}`}
                    type="button"
                    onClick={() => handleSelectStream('sub', idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === 'sub' && selectedServerIndex === idx
                        ? 'bg-[#1683FF] text-white shadow-lg shadow-[#1683FF]/25 ring-1 ring-[#1683FF]'
                        : 'bg-[#050A14] text-[#94A3B8] hover:text-white hover:bg-[#081426] border border-white/10'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{srv.name || srv.sourceName || `server ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dub Row */}
          {dubServers.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <span className="text-xs font-bold text-[#A9B8CC] w-12 shrink-0">
                Dub :
              </span>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                {dubServers.map((srv, idx) => (
                  <button
                    key={`watch-dub-srv-${srv.id || 'idx'}-${idx}`}
                    type="button"
                    onClick={() => handleSelectStream('dub', idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === 'dub' && selectedServerIndex === idx
                        ? 'bg-[#1683FF] text-white shadow-lg shadow-[#1683FF]/25 ring-1 ring-[#1683FF]'
                        : 'bg-[#050A14] text-[#94A3B8] hover:text-white hover:bg-[#081426] border border-white/10'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{srv.name || srv.sourceName || `server ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {subServers.length === 0 && dubServers.length === 0 && (
            <div className="text-xs text-[#94A3B8] italic py-1">
              No active streaming servers configured with embed URLs for this episode.
            </div>
          )}
        </div>
      </div>

      {/* 5. EPISODES LIST */}
      <EpisodeSelector
        episodes={allEpisodes}
        animeTitle={anime.title}
        animePoster={anime.poster}
        animeBanner={anime.banner || (anime as any).bannerUrl || anime.poster}
        seasonsList={anime.seasonsList}
        isAnimeUpcoming={isAnimeUpcoming}
        currentEpisodeNumber={episode.episodeNumber}
        watchedEpisodeNumbers={watchedEpNumbers}
        onSelectEpisode={(epNum) => navigate(`/anime/${anime.slug}/episode/${epNum}`)}
        onNavigateSeasonAnime={(seasonSlug) => navigate(`/anime/${seasonSlug}`)}
        onDownloadEpisode={(ep) => {
          const epSeason = ep.seasonNumber || ep.season || 1;
          const slug = anime.slug || anime.id;
          navigate(`/anime/${slug}/download?season=${epSeason}&episode=${ep.episodeNumber}`);
        }}
      />

      {/* 7. COMMUNITY COMMENTS (Episode Discussion) */}
      <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
        <CommentSection
          targetType="episode"
          animeId={anime.id!}
          animeSlug={anime.slug}
          animeTitle={anime.title}
          episodeId={episode.id}
          episodeNumber={episode.episodeNumber}
          onShowMessage={onShowMessage || (() => {})}
          navigate={navigate}
        />
      </div>

      {/* 8. RELATED SERIES (Directly below Episode Discussion) */}
      {relatedAnimes.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4.5 bg-[#1683FF] rounded-full inline-block" />
              <h3 className="font-bold text-white text-base sm:text-lg tracking-wide">
                Related Series
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-1 transition-colors"
            >
              <span>Explore More</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {relatedAnimes.map((rel, idx) => (
              <AnimeCard
                key={`watch-rel-${rel.id || rel.slug}-${idx}`}
                anime={rel}
                navigate={navigate}
                onShowMessage={onShowMessage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {episode && anime && (
        <ReportEpisodeModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          animeId={anime.id!}
          animeTitle={anime.title}
          episodeId={episode.id!}
          episodeNumber={episode.episodeNumber}
          onSuccessToast={(msg) => onShowMessage?.(msg)}
        />
      )}

      {/* Download Mirrors Modal */}
      {episode && anime && (
        <DownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          title={`${anime.title} - Episode ${episode.episodeNumber}`}
          subtitle="Select download mirror to redirect & download"
          mirrors={downloadMirrors}
          onShowMessage={onShowMessage}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${anime.title} - Episode ${episode.episodeNumber}`}
        url={`/anime/${anime.slug}/episode/${episode.episodeNumber}`}
      />
    </div>
  );
};
