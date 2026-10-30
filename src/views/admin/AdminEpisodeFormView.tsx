import React, { useState, useEffect } from 'react';
import type { Anime } from '../../types/anime';
import type { Episode, VideoSource, SubtitleTrack } from '../../types/episode';
import { getAllAnimes, updateAnime } from '../../lib/firestore/anime';
import {
  createEpisode,
  getEpisodeById,
  updateEpisode,
  getAllEpisodesByAnimeId,
  normalizeSeasonEpisodeNumbers,
} from '../../lib/firestore/episodes';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Tv,
  Plus,
  Trash2,
  Server,
  Play,
  Clock,
  Calendar,
  Subtitles,
  ShieldCheck,
  CheckCircle2,
  Download,
  Link as LinkIcon,
  Star,
} from 'lucide-react';

interface AdminEpisodeFormViewProps {
  episodeId?: string;
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminEpisodeFormView: React.FC<AdminEpisodeFormViewProps> = ({
  episodeId,
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const isEditMode = Boolean(episodeId);

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [duration, setDuration] = useState('24:00');
  const [published, setPublished] = useState(true);

  // Upcoming & Scheduling states
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [airDate, setAirDate] = useState('');
  const [releaseTime, setReleaseTime] = useState('20:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [syncAnimeUpcoming, setSyncAnimeUpcoming] = useState(true);

  // Download options
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadQuality, setDownloadQuality] = useState('1080p Ultra HD');
  const [downloadSize, setDownloadSize] = useState('');
  const [downloadLinks, setDownloadLinks] = useState<
    { quality: string; size?: string; url: string; host?: string }[]
  >([]);

  // Timestamps
  const [introStart, setIntroStart] = useState<number | undefined>();
  const [introEnd, setIntroEnd] = useState<number | undefined>();
  const [outroStart, setOutroStart] = useState<number | undefined>();
  const [outroEnd, setOutroEnd] = useState<number | undefined>();

  // Multi-server video sources (Sub & Dub with custom server names, embed URLs, and default selector)
  const [videoSources, setVideoSources] = useState<VideoSource[]>([
    {
      id: 'srv-sub-1',
      name: 'server 1',
      category: 'sub',
      type: 'embed',
      embedUrl: '',
      frameCode: '',
      quality: '1080p',
      language: 'SUB',
      priority: 1,
      active: true,
      isDefault: true,
    },
    {
      id: 'srv-sub-2',
      name: 'server 2',
      category: 'sub',
      type: 'embed',
      embedUrl: '',
      frameCode: '',
      quality: '1080p',
      language: 'SUB',
      priority: 2,
      active: true,
      isDefault: false,
    },
    {
      id: 'srv-dub-1',
      name: 'server 1',
      category: 'dub',
      type: 'embed',
      embedUrl: '',
      frameCode: '',
      quality: '1080p',
      language: 'DUB',
      priority: 3,
      active: true,
      isDefault: false,
    },
    {
      id: 'srv-dub-2',
      name: 'server 2',
      category: 'dub',
      type: 'embed',
      embedUrl: '',
      frameCode: '',
      quality: '1080p',
      language: 'DUB',
      priority: 4,
      active: true,
      isDefault: false,
    },
  ]);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEpisodes, setExistingEpisodes] = useState<Episode[]>([]);
  const [seasonNotice, setSeasonNotice] = useState<string | null>(null);

  const detectNextSeasonAndEpisode = (
    targetAnime: Anime | undefined,
    allEps: Episode[],
    requestedSeason?: number
  ): { season: number; epNum: number; notice: string | null } => {
    const normalizedEps = allEps.map(normalizeSeasonEpisodeNumbers);
    if (requestedSeason !== undefined) {
      const sEps = normalizedEps.filter((e) => (e.seasonNumber || e.season || 1) === requestedSeason);
      const maxEp = sEps.length > 0 ? Math.max(...sEps.map((e) => e.episodeNumber)) : 0;
      return { season: requestedSeason, epNum: maxEp + 1, notice: null };
    }

    // 1. If anime has defined seasonsList
    if (targetAnime?.seasonsList && targetAnime.seasonsList.length > 0) {
      const sorted = [...targetAnime.seasonsList].sort((a, b) => a.seasonNumber - b.seasonNumber);
      for (const s of sorted) {
        const sNum = s.seasonNumber || 1;
        const sTotal = Number(s.totalEpisodes) || Number(targetAnime.totalEpisodes) || 12;
        const sEps = normalizedEps.filter((e) => (e.seasonNumber || e.season || 1) === sNum);

        // If season has room for more episodes
        if (sEps.length < sTotal) {
          const maxEp = sEps.length > 0 ? Math.max(...sEps.map((e) => e.episodeNumber)) : 0;
          return { season: sNum, epNum: maxEp + 1, notice: null };
        }
      }

      // If all configured seasons in list are complete (e.g. S1 has 12/12):
      const lastSeason = sorted[sorted.length - 1];
      const lastSeasonNum = lastSeason.seasonNumber || 1;
      const lastSeasonTotal = Number(lastSeason.totalEpisodes) || 12;
      const lastSeasonEps = normalizedEps.filter((e) => (e.seasonNumber || e.season || 1) === lastSeasonNum);

      if (lastSeasonEps.length >= lastSeasonTotal) {
        const nextSeasonNum = lastSeasonNum + 1;
        const nextSeasonEps = normalizedEps.filter((e) => (e.seasonNumber || e.season || 1) === nextSeasonNum);
        const nextEp = nextSeasonEps.length > 0 ? Math.max(...nextSeasonEps.map((e) => e.episodeNumber)) + 1 : 1;
        return {
          season: nextSeasonNum,
          epNum: nextEp,
          notice: `Season ${lastSeasonNum} has reached its total episodes (${lastSeasonTotal}/${lastSeasonTotal}). Automatically selected Season ${nextSeasonNum} Episode ${nextEp}.`,
        };
      }
    }

    // 2. Fallback if no seasonsList
    const total = Number(targetAnime?.totalEpisodes) || 12;
    const s1Eps = normalizedEps.filter((e) => (e.seasonNumber || e.season || 1) === 1);
    if (s1Eps.length >= total) {
      const s2Eps = normalizedEps.filter((e) => (e.seasonNumber || e.season || 1) === 2);
      const nextEp = s2Eps.length > 0 ? Math.max(...s2Eps.map((e) => e.episodeNumber)) + 1 : 1;
      return {
        season: 2,
        epNum: nextEp,
        notice: `Season 1 has reached its total episodes (${total}/${total}). Automatically switched to Season 2 Episode ${nextEp}.`,
      };
    } else {
      const maxEp = s1Eps.length > 0 ? Math.max(...s1Eps.map((e) => e.episodeNumber)) : 0;
      return { season: 1, epNum: maxEp + 1, notice: null };
    }
  };

  useEffect(() => {
    const initForm = async () => {
      try {
        setLoading(true);
        const animeList = await getAllAnimes();
        setAnimes(animeList);

        if (isEditMode && episodeId) {
          const epData = await getEpisodeById(episodeId);
          if (epData) {
            setSelectedAnimeId(epData.animeId || '');
            setEpisodeNumber(epData.episodeNumber ?? 1);
            setSeasonNumber(epData.seasonNumber ?? 1);
            setTitle(epData.title || '');
            setDescription(epData.description || '');
            setThumbnail(epData.thumbnail || '');
            setDuration(epData.duration ? String(epData.duration) : '24:00');
            setIntroStart(epData.introStart);
            setIntroEnd(epData.introEnd);
            setOutroStart(epData.outroStart);
            setOutroEnd(epData.outroEnd);
            setPublished(epData.published ?? true);
            setIsUpcoming(epData.status === 'upcoming' || Boolean(epData.isUpcoming));
            setAirDate(epData.airDate || epData.releaseDate || '');
            setReleaseTime(epData.releaseTime || '20:00');
            setTimezone(epData.timezone || 'Asia/Kolkata');

            if (epData.videoSources && epData.videoSources.length > 0) {
              const seenLoadedIds = new Set<string>();
              const mapped = epData.videoSources.map((s, idx) => {
                const isDub =
                  s.category === 'dub' ||
                  (s.language || '').toLowerCase().includes('dub') ||
                  (s.name || '').toLowerCase().includes('dub') ||
                  (s.provider || '').toLowerCase().includes('dub');
                const rawId = (s.id || '').trim();
                const uniqueId = rawId && !seenLoadedIds.has(rawId)
                  ? rawId
                  : `srv-vsrc-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                seenLoadedIds.add(uniqueId);
                return {
                  ...s,
                  id: uniqueId,
                  name: s.name || s.sourceName || s.provider || `server ${idx + 1}`,
                  category: (s.category as any) || (isDub ? 'dub' : 'sub'),
                  type: s.type || s.sourceType || 'embed',
                  embedUrl: s.embedUrl || '',
                  frameCode: s.frameCode || '',
                  quality: s.quality || '1080p',
                  language: s.language || (isDub ? 'DUB' : 'SUB'),
                  priority: s.priority || idx + 1,
                  active: s.active ?? true,
                  isDefault: Boolean(s.isDefault),
                };
              });

              // Ensure at least 1 sub and 1 dub server template exists if empty
              if (!mapped.some((s) => s.category === 'sub')) {
                mapped.unshift({
                  id: `srv-sub-1-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: 'server 1',
                  category: 'sub',
                  type: 'embed',
                  embedUrl: '',
                  frameCode: '',
                  quality: '1080p',
                  language: 'SUB',
                  priority: 1,
                  active: true,
                  isDefault: false,
                });
              }
              if (!mapped.some((s) => s.category === 'dub')) {
                mapped.push({
                  id: `srv-dub-1-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: 'server 1',
                  category: 'dub',
                  type: 'embed',
                  embedUrl: '',
                  frameCode: '',
                  quality: '1080p',
                  language: 'DUB',
                  priority: 2,
                  active: true,
                  isDefault: false,
                });
              }

              // Ensure exactly one server is flagged as default
              const hasDefault = mapped.some((s) => s.isDefault);
              if (!hasDefault) {
                if (epData.defaultSourceId) {
                  const target = mapped.find((s) => s.id === epData.defaultSourceId);
                  if (target) target.isDefault = true;
                  else if (mapped.length > 0) mapped[0].isDefault = true;
                } else if (mapped.length > 0) {
                  mapped[0].isDefault = true;
                }
              }
              setVideoSources(mapped);
            } else if (epData.sources && epData.sources.length > 0) {
              const seenLoadedIds = new Set<string>();
              const mapped = epData.sources.map((s, idx) => {
                const isDub =
                  s.category === 'dub' ||
                  (s.language || '').toLowerCase().includes('dub') ||
                  (s.name || '').toLowerCase().includes('dub') ||
                  (s.provider || '').toLowerCase().includes('dub');
                const rawId = (s.id || '').trim();
                const uniqueId = rawId && !seenLoadedIds.has(rawId)
                  ? rawId
                  : `srv-src-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                seenLoadedIds.add(uniqueId);
                return {
                  id: uniqueId,
                  name: s.name || s.sourceName || s.provider || `server ${idx + 1}`,
                  category: (s.category as any) || (isDub ? 'dub' : 'sub'),
                  type: s.sourceType || s.type || 'embed',
                  embedUrl: s.embedUrl || '',
                  frameCode: s.frameCode || '',
                  quality: s.quality || '1080p',
                  language: s.language || (isDub ? 'DUB' : 'SUB'),
                  priority: s.priority || idx + 1,
                  active: s.active ?? true,
                  isDefault: Boolean(s.isDefault),
                };
              });
              const hasDefault = mapped.some((s) => s.isDefault);
              if (!hasDefault && mapped.length > 0) {
                mapped[0].isDefault = true;
              }
              setVideoSources(mapped);
            } else if (epData.videoUrl) {
              setVideoSources([
                {
                  id: `srv-sub-1-${Date.now()}`,
                  name: 'server 1',
                  category: 'sub',
                  type: epData.videoUrl.endsWith('.m3u8') ? 'hls' : 'embed',
                  embedUrl: epData.videoUrl,
                  frameCode: '',
                  quality: '1080p',
                  language: 'SUB',
                  priority: 1,
                  active: true,
                  isDefault: true,
                },
                {
                  id: `srv-sub-2-${Date.now()}`,
                  name: 'server 2',
                  category: 'sub',
                  type: 'embed',
                  embedUrl: '',
                  frameCode: '',
                  quality: '1080p',
                  language: 'SUB',
                  priority: 2,
                  active: true,
                  isDefault: false,
                },
                {
                  id: `srv-dub-1-${Date.now()}`,
                  name: 'server 1',
                  category: 'dub',
                  type: 'embed',
                  embedUrl: epData.videoUrl,
                  frameCode: '',
                  quality: '1080p',
                  language: 'DUB',
                  priority: 3,
                  active: true,
                  isDefault: false,
                },
                {
                  id: `srv-dub-2-${Date.now()}`,
                  name: 'server 2',
                  category: 'dub',
                  type: 'embed',
                  embedUrl: '',
                  frameCode: '',
                  quality: '1080p',
                  language: 'DUB',
                  priority: 4,
                  active: true,
                  isDefault: false,
                },
              ]);
            }

            if (epData.downloadUrl) {
              setDownloadUrl(epData.downloadUrl);
            }
            if (epData.downloadQuality) {
              setDownloadQuality(epData.downloadQuality);
            }
            if (epData.downloadSize) {
              setDownloadSize(epData.downloadSize);
            }
            if (epData.downloadLinks && epData.downloadLinks.length > 0) {
              setDownloadLinks(epData.downloadLinks);
            }

            if (epData.subtitles) {
              setSubtitles(epData.subtitles);
            }
          } else {
            setError('Episode not found.');
          }
        } else {
          // New episode defaults
          const params = new URLSearchParams(window.location.search);
          const queryAnimeId = params.get('animeId');
          const querySeason = params.get('season');
          const defaultAnimeId =
            queryAnimeId || (animeList.length > 0 ? (animeList[0].id || animeList[0].slug) : '');
          setSelectedAnimeId(defaultAnimeId);

          const foundAnime = animeList.find((a) => a.id === defaultAnimeId || a.slug === defaultAnimeId);
          if (foundAnime) {
            setThumbnail(foundAnime.banner || (foundAnime as any).bannerUrl || foundAnime.poster || '');
          }

          if (defaultAnimeId) {
            try {
              const existingEps = await getAllEpisodesByAnimeId(defaultAnimeId);
              setExistingEpisodes(existingEps);
              const forcedSeason = querySeason ? parseInt(querySeason, 10) : undefined;
              const next = detectNextSeasonAndEpisode(foundAnime, existingEps, forcedSeason);
              setSeasonNumber(next.season);
              setEpisodeNumber(next.epNum);
              setTitle(`Episode ${next.epNum}`);
              setSeasonNotice(next.notice);
            } catch {
              setEpisodeNumber(1);
              setSeasonNumber(1);
              setTitle('Episode 1');
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to init episode form:', err);
        setError('Failed to load form data.');
      } finally {
        setLoading(false);
      }
    };
    initForm();
  }, [isEditMode, episodeId]);

  const handleAnimeChange = async (newAnimeId: string) => {
    setSelectedAnimeId(newAnimeId);
    const foundAnime = animes.find((a) => a.id === newAnimeId || a.slug === newAnimeId);
    if (!isEditMode && foundAnime) {
      setThumbnail(foundAnime.banner || (foundAnime as any).bannerUrl || foundAnime.poster || '');
    }
    if (!isEditMode && newAnimeId) {
      try {
        const existingEps = await getAllEpisodesByAnimeId(newAnimeId);
        setExistingEpisodes(existingEps);
        const next = detectNextSeasonAndEpisode(foundAnime, existingEps);
        setSeasonNumber(next.season);
        setEpisodeNumber(next.epNum);
        setTitle(`Episode ${next.epNum}`);
        setSeasonNotice(next.notice);
      } catch {
        setEpisodeNumber(1);
        setSeasonNumber(1);
      }
    }
  };

  const handleSeasonChange = (newSeasonNumber: number) => {
    setSeasonNumber(newSeasonNumber);
    if (!isEditMode) {
      const sEps = existingEpisodes
        .map(normalizeSeasonEpisodeNumbers)
        .filter((e) => (e.seasonNumber || e.season || 1) === newSeasonNumber);
      const maxEp = sEps.length > 0 ? Math.max(...sEps.map((e) => e.episodeNumber)) : 0;
      const nextEp = maxEp + 1;
      setEpisodeNumber(nextEp);
      if (!title || title.startsWith('Episode ')) {
        setTitle(`Episode ${nextEp}`);
      }

      const sDef = selectedAnime?.seasonsList?.find((s) => s.seasonNumber === newSeasonNumber);
      const targetTotal = Number(sDef?.totalEpisodes) || Number(selectedAnime?.totalEpisodes) || 12;
      if (sEps.length >= targetTotal) {
        setSeasonNotice(
          `Season ${newSeasonNumber} has all ${sEps.length}/${targetTotal} episodes completed. Adding this will create Episode ${nextEp}.`
        );
      } else {
        setSeasonNotice(null);
      }
    }
  };

  const handleAddServer = (category: 'sub' | 'dub' = 'sub') => {
    setVideoSources((prev) => {
      const categorySources = prev.filter((s) => (s.category || 'sub') === category);
      const nextNum = categorySources.length + 1;
      const isFirstEver = prev.length === 0;
      return [
        ...prev,
        {
          id: `srv-${category}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `server ${nextNum}`,
          category,
          type: 'embed',
          embedUrl: '',
          frameCode: '',
          quality: '1080p',
          language: category === 'dub' ? 'DUB' : 'SUB',
          priority: prev.length + 1,
          active: true,
          isDefault: isFirstEver,
        },
      ];
    });
  };

  const handleSetDefaultServer = (idOrIndex: string | number) => {
    setVideoSources((prev) =>
      prev.map((s, idx) => {
        const isMatch = typeof idOrIndex === 'number' ? idx === idOrIndex : s.id === idOrIndex;
        return {
          ...s,
          isDefault: isMatch,
        };
      })
    );
  };

  const handleUpdateServer = (idOrIndex: string | number, field: keyof VideoSource, value: any) => {
    setVideoSources((prev) =>
      prev.map((s, idx) => {
        if (typeof idOrIndex === 'number' ? idx === idOrIndex : s.id === idOrIndex) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleRemoveServer = (idOrIndex: string | number) => {
    setVideoSources((prev) => {
      if (prev.length <= 1) {
        onShowMessage('At least one video server is required.');
        return prev;
      }
      const isRemovingDefault = prev.some(
        (s, idx) => (typeof idOrIndex === 'number' ? idx === idOrIndex : s.id === idOrIndex) && s.isDefault
      );
      const remaining = prev.filter((s, idx) =>
        typeof idOrIndex === 'number' ? idx !== idOrIndex : s.id !== idOrIndex
      );
      if (isRemovingDefault && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
  };

  const handleAddSubtitle = () => {
    setSubtitles((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        language: 'English',
        label: 'English [CC]',
        url: '',
        isDefault: prev.length === 0,
      },
    ]);
  };

  const handleRemoveSubtitle = (index: number) => {
    setSubtitles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDownloadLink = () => {
    setDownloadLinks((prev) => [
      ...prev,
      {
        quality: '1080p Ultra HD',
        size: '350 MB',
        url: '',
        host: 'Direct Server / Mega',
      },
    ]);
  };

  const handleUpdateDownloadLink = (
    index: number,
    field: 'quality' | 'size' | 'url' | 'host',
    value: string
  ) => {
    setDownloadLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveDownloadLink = (index: number) => {
    setDownloadLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAnimeId) {
      setError('Please select an anime series.');
      return;
    }

    const validSources = videoSources.filter((s) => s.embedUrl?.trim() || s.frameCode?.trim());
    if (!isUpcoming && validSources.length === 0) {
      setError('Please enter at least one valid video embed URL or streaming source (or mark episode as Upcoming / Scheduled).');
      return;
    }

    // Determine the active default server among valid sources
    let defaultSource = validSources.find((s) => s.isDefault === true);
    if (!defaultSource && validSources.length > 0) {
      defaultSource = validSources[0];
    }

    const validDownloadLinks = downloadLinks.filter((d) => d.url.trim());

    const effectiveAnime = animes.find((a) => a.id === selectedAnimeId || a.slug === selectedAnimeId);
    const targetAnimeId = effectiveAnime?.id || selectedAnimeId;
    const targetAnimeSlug = effectiveAnime?.slug || selectedAnimeId;
    const targetAnimeTitle = effectiveAnime?.title || '';
    const animeBanner = effectiveAnime?.banner || (effectiveAnime as any)?.bannerUrl || effectiveAnime?.poster || '';
    const fallbackThumb = animeBanner || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
    const finalThumbnail = thumbnail.trim() || fallbackThumb;
    const formattedAirDate = airDate.trim() || undefined;

    const payload: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'> = {
      animeId: targetAnimeId,
      ...(targetAnimeSlug ? { animeSlug: targetAnimeSlug } : {}),
      ...(targetAnimeTitle ? { animeTitle: targetAnimeTitle } : {}),
      episodeNumber: Number(episodeNumber) || 1,
      season: Number(seasonNumber) || 1,
      seasonNumber: Number(seasonNumber) || 1,
      title: title.trim() || `Episode ${episodeNumber}`,
      description: description.trim() || undefined,
      thumbnail: finalThumbnail,
      duration: duration.trim() || '24:00',
      status: isUpcoming ? 'upcoming' : 'released',
      isUpcoming: isUpcoming,
      airDate: formattedAirDate,
      releaseDate: formattedAirDate,
      releaseTime: releaseTime.trim() || undefined,
      timezone: timezone.trim() || 'Asia/Kolkata',
      downloadUrl: downloadUrl.trim() || (validDownloadLinks[0]?.url ? validDownloadLinks[0].url.trim() : undefined),
      downloadQuality: downloadQuality.trim() || undefined,
      downloadSize: downloadSize.trim() || undefined,
      downloadLinks: validDownloadLinks.length > 0 ? validDownloadLinks : undefined,
      videoUrl: defaultSource ? (defaultSource.embedUrl || validSources[0]?.embedUrl || '') : '',
      defaultSourceId: defaultSource?.id,
      defaultCategory: (defaultSource?.category as any) || 'sub',
      sources: validSources.map((s, idx) => ({
        id: s.id || `src-${idx + 1}`,
        name: s.name?.trim() || `server ${idx + 1}`,
        provider: s.name?.trim() || s.provider || `server ${idx + 1}`,
        sourceName: s.name?.trim() || s.sourceName || `server ${idx + 1}`,
        category: s.category || 'sub',
        sourceType: s.type || s.sourceType || 'embed',
        type: s.type || s.sourceType || 'embed',
        quality: s.quality || '1080p',
        language: s.language || (s.category === 'dub' ? 'DUB' : 'SUB'),
        embedUrl: s.embedUrl?.trim() || '',
        frameCode: s.frameCode?.trim() || '',
        priority: s.priority || idx + 1,
        active: s.active ?? true,
        isDefault: defaultSource ? s.id === defaultSource.id : false,
      })),
      videoSources: validSources.map((s, idx) => ({
        id: s.id || `src-${idx + 1}`,
        name: s.name?.trim() || `server ${idx + 1}`,
        provider: s.name?.trim() || s.provider || `server ${idx + 1}`,
        sourceName: s.name?.trim() || s.sourceName || `server ${idx + 1}`,
        category: s.category || 'sub',
        sourceType: s.type || s.sourceType || 'embed',
        type: s.type || s.sourceType || 'embed',
        quality: s.quality || '1080p',
        language: s.language || (s.category === 'dub' ? 'DUB' : 'SUB'),
        embedUrl: s.embedUrl?.trim() || '',
        frameCode: s.frameCode?.trim() || '',
        priority: s.priority || idx + 1,
        active: s.active ?? true,
        isDefault: defaultSource ? s.id === defaultSource.id : false,
      })),
      subtitles: subtitles.filter((s) => s.url.trim()),
      introStart: introStart ? Number(introStart) : undefined,
      introEnd: introEnd ? Number(introEnd) : undefined,
      outroStart: outroStart ? Number(outroStart) : undefined,
      outroEnd: outroEnd ? Number(outroEnd) : undefined,
      published: published ?? true,
    };

    setSaving(true);
    try {
      if (isEditMode && episodeId) {
        await updateEpisode(episodeId, payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Updated Episode',
          'Episode',
          episodeId,
          `Ep ${payload.episodeNumber} - ${payload.title} ${isUpcoming ? '(Upcoming)' : ''}`
        );
        onShowMessage(`Episode updated successfully ${isUpcoming ? 'as Upcoming' : ''}.`);
      } else {
        const newEpId = await createEpisode(payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Created Episode',
          'Episode',
          newEpId,
          `Ep ${payload.episodeNumber} - ${payload.title} ${isUpcoming ? '(Upcoming)' : ''}`
        );
        onShowMessage(`Episode created successfully ${isUpcoming ? 'as Upcoming' : ''}.`);
      }

      // Automatically sync Anime title & catalog status to Upcoming if selected
      if (isUpcoming && syncAnimeUpcoming && targetAnimeId) {
        await updateAnime(targetAnimeId, {
          status: 'upcoming',
          isUpcoming: true,
          upcomingEpisodeNumber: Number(episodeNumber) || 1,
          upcomingAirDate: formattedAirDate,
          upcomingReleaseTime: releaseTime.trim() || undefined,
        }).catch((err) => console.warn('Failed to sync anime upcoming upon episode save:', err));
      }

      navigate('/admin/episodes');
    } catch (err: any) {
      console.error('Failed to save episode:', err);
      setError(err.message || 'An error occurred while saving the episode.');
    } finally {
      setSaving(false);
    }
  };

  const selectedAnime = animes.find((a) => a.id === selectedAnimeId || a.slug === selectedAnimeId);

  return (
    <AdminLayout currentTab="episodes" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Episode Media Editor
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {isEditMode ? `Edit Episode ${episodeNumber}` : 'Add New Episode to Catalog'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="px-3.5 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 sm:px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEditMode ? 'Save Changes' : 'Publish Episode'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold text-white">General Episode Metadata</h3>

            {seasonNotice && (
              <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center gap-3 text-cyan-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{seasonNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#94A3B8]">Target Anime Series *</label>
                <select
                  value={selectedAnimeId}
                  onChange={(e) => handleAnimeChange(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Select Anime Series --</option>
                  {animes.map((a) => (
                    <option key={a.id || a.slug} value={a.id || a.slug}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Episode #</label>
                  <input
                    type="number"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#94A3B8]">Season #</label>
                    {selectedAnime?.seasonsList && selectedAnime.seasonsList.length > 0 && (
                      <span className="text-[10px] text-cyan-400 font-semibold truncate max-w-[120px]">
                        {selectedAnime.seasonsList.find((s) => s.seasonNumber === seasonNumber)?.title || `Season ${seasonNumber}`}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={seasonNumber}
                    onChange={(e) => handleSeasonChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                  {selectedAnime?.seasonsList && selectedAnime.seasonsList.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                      {selectedAnime.seasonsList.map((s) => {
                        const sEps = existingEpisodes.filter(
                          (e) => (e.seasonNumber || e.season || 1) === s.seasonNumber
                        );
                        const sTotal = Number(s.totalEpisodes) || Number(selectedAnime?.totalEpisodes) || 12;
                        const isComplete = sEps.length >= sTotal;
                        return (
                          <button
                            key={s.seasonNumber}
                            type="button"
                            onClick={() => handleSeasonChange(s.seasonNumber)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                              seasonNumber === s.seasonNumber
                                ? 'bg-cyan-500 text-black shadow-sm'
                                : isComplete
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/5 text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            <span>{s.title || `S${s.seasonNumber}`}</span>
                            <span className="text-[9px] opacity-75">
                              ({sEps.length}/{sTotal})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Episode Title</label>
                  <input
                    type="text"
                    placeholder="e.g. I'm Used to It"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Episode Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 24:00"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Episode Thumbnail with Live Preview & Quick Actions */}
              <div className="p-4 rounded-2xl bg-[#050A14] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Episode Thumbnail Image URL</span>
                    <span className="text-[10px] text-cyan-400 font-normal">
                      ({thumbnail ? 'Custom URL' : 'Auto from Anime'})
                    </span>
                  </label>

                  {/* 1-Click Fill Buttons from Anime */}
                  {selectedAnime && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedAnime.banner && (
                        <button
                          type="button"
                          onClick={() => setThumbnail(selectedAnime.banner || '')}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-cyan-400 font-semibold border border-white/10 cursor-pointer transition-colors"
                        >
                          Use Anime Banner
                        </button>
                      )}
                      {selectedAnime.poster && (
                        <button
                          type="button"
                          onClick={() => setThumbnail(selectedAnime.poster || '')}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-emerald-400 font-semibold border border-white/10 cursor-pointer transition-colors"
                        >
                          Use Anime Poster
                        </button>
                      )}
                      {thumbnail && (
                        <button
                          type="button"
                          onClick={() => setThumbnail('')}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-[#94A3B8] hover:text-white border border-white/10 cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Thumbnail Image Live Preview Box */}
                  <div className="w-36 h-20 rounded-xl overflow-hidden bg-[#0B1322] border border-white/10 shrink-0 relative flex items-center justify-center">
                    {thumbnail || selectedAnime?.banner || selectedAnime?.poster ? (
                      <img
                        src={thumbnail || selectedAnime?.banner || selectedAnime?.poster}
                        alt="Episode Thumbnail Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (selectedAnime?.poster && target.src !== selectedAnime.poster) {
                            target.src = selectedAnime.poster;
                          }
                        }}
                      />
                    ) : (
                      <div className="text-[10px] text-[#64748B] text-center p-2">
                        No Preview
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-1">
                    <input
                      type="url"
                      placeholder={selectedAnime?.banner || selectedAnime?.poster || 'https://... (image url)'}
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                    />
                    <p className="text-[10px] text-[#94A3B8]">
                      If left blank, the anime banner will automatically be used as the episode thumbnail.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Episode Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief recap or summary of this episode..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Episode Release & Upcoming Scheduling Status */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Broadcast Status & Upcoming Schedule</h3>
              </div>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border self-start sm:self-auto ${
                  isUpcoming
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isUpcoming ? 'Upcoming / Scheduled' : 'Available / Released'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setIsUpcoming(false)}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  !isUpcoming
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-[#050A14] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Available / Released</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                  Episode is officially released. Requires streaming video embed link.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsUpcoming(true)}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isUpcoming
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-[#050A14] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-cyan-400">
                  <Clock className="w-4 h-4" />
                  <span>Upcoming / Scheduled Episode</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                  Shows as 'Upcoming' in episode list. Video stream links can be added later upon airing.
                </p>
              </button>
            </div>

            {isUpcoming && (
              <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-3.5 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyan-300">Scheduled Air Date (Date or Day)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-10-18 or Monday"
                      value={airDate}
                      onChange={(e) => setAirDate(e.target.value)}
                      className="w-full bg-[#050A14] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyan-300">Air Time (HH:MM)</label>
                    <input
                      type="text"
                      placeholder="e.g. 20:00"
                      value={releaseTime}
                      onChange={(e) => setReleaseTime(e.target.value)}
                      className="w-full bg-[#050A14] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyan-300">Timezone</label>
                    <input
                      type="text"
                      placeholder="e.g. Asia/Kolkata"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-[#050A14] border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-white pt-1">
                  <input
                    type="checkbox"
                    checked={syncAnimeUpcoming}
                    onChange={(e) => setSyncAnimeUpcoming(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-[#050A14] border-white/20"
                  />
                  <span>Also show Anime Title as Upcoming in Catalog & Details page</span>
                </label>
              </div>
            )}
          </div>

          {/* Video Streaming Servers (Sub & Dub) - Clean & Simple */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Streaming Servers</span>
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Add video embed or stream URLs for Sub and Dub players.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddServer('sub')}
                  className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sub Server</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddServer('dub')}
                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Dub Server</span>
                </button>
              </div>
            </div>

            {/* Sub Servers Group */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-wider">
                    SUB
                  </span>
                  <span className="text-xs font-bold text-white">
                    Sub Servers ({videoSources.filter((s) => (s.category || 'sub') === 'sub').length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddServer('sub')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Server</span>
                </button>
              </div>

              <div className="space-y-2">
                {videoSources
                  .filter((s) => (s.category || 'sub') === 'sub')
                  .map((srv, index) => (
                    <div
                      key={srv.id || `sub-${index}`}
                      className={`bg-[#050A14] border ${
                        srv.isDefault ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-white/10'
                      } rounded-xl p-3 space-y-2 transition-all`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={srv.name || `server ${index + 1}`}
                            onChange={(e) => handleUpdateServer(srv.id || index, 'name', e.target.value)}
                            placeholder={`server ${index + 1}`}
                            className="w-full sm:w-40 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none focus:border-blue-500"
                          />
                          <div className="flex sm:hidden items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleSetDefaultServer(srv.id || index)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                srv.isDefault
                                  ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10'
                              }`}
                              title="Set as default auto-play server"
                            >
                              <Star className={`w-3.5 h-3.5 ${srv.isDefault ? 'fill-black text-black' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveServer(srv.id || index)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer shrink-0"
                              title="Delete Server"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={srv.embedUrl || ''}
                          onChange={(e) => handleUpdateServer(srv.id || index, 'embedUrl', e.target.value)}
                          placeholder="Stream URL (or paste iframe embed)"
                          className="flex-1 min-w-0 bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-blue-500"
                        />

                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultServer(srv.id || index)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              srv.isDefault
                                ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                                : 'bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10'
                            }`}
                            title="Set as default auto-play server"
                          >
                            <Star className={`w-3 h-3 ${srv.isDefault ? 'fill-black text-black' : ''}`} />
                            <span>{srv.isDefault ? 'Default' : 'Set Default'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveServer(srv.id || index)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                            title="Delete Server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Dub Servers Group */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-wider">
                    DUB
                  </span>
                  <span className="text-xs font-bold text-white">
                    Dub Servers ({videoSources.filter((s) => s.category === 'dub').length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddServer('dub')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Server</span>
                </button>
              </div>

              <div className="space-y-2">
                {videoSources
                  .filter((s) => s.category === 'dub')
                  .map((srv, index) => (
                    <div
                      key={srv.id || `dub-${index}`}
                      className={`bg-[#050A14] border ${
                        srv.isDefault ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-white/10'
                      } rounded-xl p-3 space-y-2 transition-all`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={srv.name || `server ${index + 1}`}
                            onChange={(e) => handleUpdateServer(srv.id || index, 'name', e.target.value)}
                            placeholder={`server ${index + 1}`}
                            className="w-full sm:w-40 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none focus:border-amber-500"
                          />
                          <div className="flex sm:hidden items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleSetDefaultServer(srv.id || index)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                srv.isDefault
                                  ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10'
                              }`}
                              title="Set as default auto-play server"
                            >
                              <Star className={`w-3.5 h-3.5 ${srv.isDefault ? 'fill-black text-black' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveServer(srv.id || index)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer shrink-0"
                              title="Delete Server"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={srv.embedUrl || ''}
                          onChange={(e) => handleUpdateServer(srv.id || index, 'embedUrl', e.target.value)}
                          placeholder="Stream URL (or paste iframe embed)"
                          className="flex-1 min-w-0 bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                        />

                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultServer(srv.id || index)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              srv.isDefault
                                ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                                : 'bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10'
                            }`}
                            title="Set as default auto-play server"
                          >
                            <Star className={`w-3 h-3 ${srv.isDefault ? 'fill-black text-black' : ''}`} />
                            <span>{srv.isDefault ? 'Default' : 'Set Default'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveServer(srv.id || index)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                            title="Delete Server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Episode Download Links - Clean & Simple */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Links</span>
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Direct download links for this episode (Mega, Google Drive, etc.).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDownloadLink}
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Mirror</span>
              </button>
            </div>

            {/* Primary Download */}
            <div className="p-3.5 bg-[#050A14] border border-white/10 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Primary Download URL</label>
                  <input
                    type="url"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://mega.nz/... or drive.google.com/..."
                    className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Quality</label>
                  <input
                    type="text"
                    value={downloadQuality}
                    onChange={(e) => setDownloadQuality(e.target.value)}
                    placeholder="1080p Ultra HD"
                    className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">File Size</label>
                  <input
                    type="text"
                    value={downloadSize}
                    onChange={(e) => setDownloadSize(e.target.value)}
                    placeholder="e.g. 350 MB"
                    className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Mirrors */}
            {downloadLinks.length > 0 && (
              <div className="space-y-2 pt-1">
                {downloadLinks.map((dl, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[#050A14] border border-white/5 rounded-xl flex items-center gap-2.5"
                  >
                    <input
                      type="text"
                      value={dl.quality}
                      onChange={(e) => handleUpdateDownloadLink(index, 'quality', e.target.value)}
                      placeholder="Quality (e.g. 720p)"
                      className="w-28 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                    />

                    <input
                      type="text"
                      value={dl.size || ''}
                      onChange={(e) => handleUpdateDownloadLink(index, 'size', e.target.value)}
                      placeholder="Size (e.g. 180 MB)"
                      className="w-24 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                    />

                    <input
                      type="url"
                      value={dl.url}
                      onChange={(e) => handleUpdateDownloadLink(index, 'url', e.target.value)}
                      placeholder="Mirror Download URL (https://...)"
                      className="flex-1 min-w-0 bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveDownloadLink(index)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Remove Mirror"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intro / Outro Timestamps - Simple */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-7 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Intro & Outro Auto-Skip (Seconds)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Intro Start (s)</label>
                <input
                  type="number"
                  placeholder="e.g. 90"
                  value={introStart ?? ''}
                  onChange={(e) =>
                    setIntroStart(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Intro End (s)</label>
                <input
                  type="number"
                  placeholder="e.g. 180"
                  value={introEnd ?? ''}
                  onChange={(e) => setIntroEnd(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Outro Start (s)</label>
                <input
                  type="number"
                  placeholder="e.g. 1320"
                  value={outroStart ?? ''}
                  onChange={(e) =>
                    setOutroStart(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Outro End (s)</label>
                <input
                  type="number"
                  placeholder="e.g. 1410"
                  value={outroEnd ?? ''}
                  onChange={(e) => setOutroEnd(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Bottom Save Action Bar */}
        <div className="bg-[#0B1322] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/episodes')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 sm:px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isEditMode ? 'Save Episode Changes' : 'Publish Episode'}</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
