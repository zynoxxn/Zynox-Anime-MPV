import React, { useState, useEffect, useMemo } from 'react';
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
  AdminAccordion,
  AdminSelect,
  AdminToggle,
  AdminStatusBadge,
  AdminStickySaveBar,
  AdminImageUploader,
  AdminCopyInput,
} from '../../components/admin';
import {
  ArrowLeft,
  Tv,
  Server,
  Download,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Star,
  GripVertical,
  Clipboard,
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

  const searchParams = new URLSearchParams(window.location.search);
  const qAnimeId = searchParams.get('animeId');

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>(qAnimeId || '');
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
  const [timezone] = useState('Asia/Kolkata');
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

  // Multi-server video sources (Sub & Dub)
  const [videoSources, setVideoSources] = useState<VideoSource[]>([
    {
      id: 'srv-sub-1',
      name: 'server 1',
      category: 'sub',
      type: 'embed',
      embedUrl: '',
      quality: '1080p',
      language: 'SUB',
      priority: 1,
      active: true,
      isDefault: true,
    },
    {
      id: 'srv-dub-1',
      name: 'server 1',
      category: 'dub',
      type: 'embed',
      embedUrl: '',
      quality: '1080p',
      language: 'DUB',
      priority: 2,
      active: true,
      isDefault: false,
    },
  ]);

  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
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
            setSelectedAnimeId(epData.animeId || epData.animeSlug || '');
            setEpisodeNumber(epData.episodeNumber || 1);
            setSeasonNumber(epData.seasonNumber || epData.season || 1);
            setTitle(epData.title || '');
            setDescription(epData.description || '');
            setThumbnail(epData.thumbnail || '');
            setDuration(String(epData.duration || '24:00'));
            setPublished(epData.published !== false);
            setIsUpcoming(Boolean(epData.isUpcoming || epData.status === 'upcoming'));
            setAirDate(epData.airDate || epData.releaseDate || '');
            setReleaseTime(epData.releaseTime || '20:00');
            setDownloadUrl(epData.downloadUrl || '');
            setDownloadQuality(epData.downloadQuality || '1080p Ultra HD');
            setDownloadSize(epData.downloadSize || '');

            if (epData.downloadLinks) setDownloadLinks(epData.downloadLinks);
            if (epData.subtitles) setSubtitles(epData.subtitles);
            setIntroStart(epData.introStart);
            setIntroEnd(epData.introEnd);
            setOutroStart(epData.outroStart);
            setOutroEnd(epData.outroEnd);

            const sources = epData.videoSources || epData.sources;
            if (sources && sources.length > 0) {
              setVideoSources(
                sources.map((s, idx) => ({
                  ...s,
                  id: s.id || `srv-${idx + 1}`,
                  name: s.name || s.sourceName || `server ${idx + 1}`,
                  category: s.category || 'sub',
                  type: s.type || s.sourceType || 'embed',
                  embedUrl: s.embedUrl || '',
                  active: s.active ?? true,
                  isDefault: Boolean(s.isDefault),
                }))
              );
            }
          }
        } else if (qAnimeId) {
          const found = animeList.find((a) => a.id === qAnimeId || a.slug === qAnimeId);
          if (found) {
            setSelectedAnimeId(found.id || found.slug);
            setThumbnail(found.banner || found.poster || '');
            const existing = await getAllEpisodesByAnimeId(found.id || found.slug).catch(() => []);
            const maxEp = existing.length > 0 ? Math.max(...existing.map((e) => e.episodeNumber || 0)) : 0;
            setEpisodeNumber(maxEp + 1);
            setTitle(`Episode ${maxEp + 1}`);
          }
        }
      } catch {
        setError('Failed to load episode data.');
      } finally {
        setLoading(false);
        setIsDirty(false);
      }
    };
    initForm();
  }, [isEditMode, episodeId, qAnimeId]);

  const selectedAnime = useMemo(() => {
    return animes.find((a) => a.id === selectedAnimeId || a.slug === selectedAnimeId);
  }, [animes, selectedAnimeId]);

  // Add / Update / Set Default Server
  const handleAddServer = (category: 'sub' | 'dub') => {
    setVideoSources((prev) => {
      const catSources = prev.filter((s) => s.category === category);
      return [
        ...prev,
        {
          id: `srv-${category}-${Date.now()}`,
          name: `server ${catSources.length + 1}`,
          category,
          type: 'embed',
          embedUrl: '',
          quality: '1080p',
          language: category === 'dub' ? 'DUB' : 'SUB',
          priority: prev.length + 1,
          active: true,
          isDefault: prev.length === 0,
        },
      ];
    });
    markDirty();
  };

  const handleSetDefaultServer = (id: string) => {
    setVideoSources((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === id,
      }))
    );
    markDirty();
  };

  const handleUpdateServer = (id: string, field: keyof VideoSource, value: any) => {
    setVideoSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    markDirty();
  };

  const handleRemoveServer = (id: string) => {
    setVideoSources((prev) => prev.filter((s) => s.id !== id));
    markDirty();
  };

  const handleSave = async () => {
    setError(null);
    if (!selectedAnimeId) {
      setError('Please select an anime.');
      return;
    }

    const validSources = videoSources.filter((s) => s.embedUrl?.trim());
    const defaultSource = validSources.find((s) => s.isDefault) || validSources[0];

    const fallbackThumb = selectedAnime?.banner || selectedAnime?.poster || '';
    const finalThumbnail = thumbnail.trim() || fallbackThumb;

    const payload: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'> = {
      animeId: selectedAnime?.id || selectedAnimeId,
      animeSlug: selectedAnime?.slug || selectedAnimeId,
      animeTitle: selectedAnime?.title || 'Anime',
      episodeNumber: Number(episodeNumber) || 1,
      season: Number(seasonNumber) || 1,
      seasonNumber: Number(seasonNumber) || 1,
      title: title.trim() || `Episode ${episodeNumber}`,
      description: description.trim() || undefined,
      thumbnail: finalThumbnail,
      duration: duration.trim() || '24:00',
      status: isUpcoming ? 'upcoming' : 'released',
      isUpcoming,
      airDate: airDate.trim() || undefined,
      releaseDate: airDate.trim() || undefined,
      releaseTime: releaseTime.trim() || undefined,
      timezone: timezone.trim() || 'Asia/Kolkata',
      downloadUrl: downloadUrl.trim() || undefined,
      downloadQuality: downloadQuality.trim() || undefined,
      downloadSize: downloadSize.trim() || undefined,
      downloadLinks: downloadLinks.filter((d) => d.url.trim()),
      videoUrl: defaultSource?.embedUrl || '',
      defaultSourceId: defaultSource?.id,
      defaultCategory: (defaultSource?.category as any) || 'sub',
      sources: validSources,
      videoSources: validSources,
      subtitles: subtitles.filter((s) => s.url.trim()),
      introStart: introStart ? Number(introStart) : undefined,
      introEnd: introEnd ? Number(introEnd) : undefined,
      outroStart: outroStart ? Number(outroStart) : undefined,
      outroEnd: outroEnd ? Number(outroEnd) : undefined,
      published,
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
          `EP ${payload.episodeNumber} - ${payload.title}`
        );
        onShowMessage(`Episode ${payload.episodeNumber} updated.`);
      } else {
        const newEpId = await createEpisode(payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Created Episode',
          'Episode',
          newEpId,
          `EP ${payload.episodeNumber} - ${payload.title}`
        );
        onShowMessage(`Episode ${payload.episodeNumber} created.`);
      }

      if (isUpcoming && syncAnimeUpcoming && selectedAnime?.id) {
        await updateAnime(selectedAnime.id, {
          status: 'upcoming',
          isUpcoming: true,
        }).catch(() => {});
      }

      setIsDirty(false);
      navigate(`/admin/anime/${selectedAnime?.slug || selectedAnimeId}/episodes`);
    } catch {
      setError('Failed to save episode.');
    } finally {
      setSaving(false);
    }
  };

  const subSources = videoSources.filter((s) => (s.category || 'sub') === 'sub');
  const dubSources = videoSources.filter((s) => s.category === 'dub');

  return (
    <AdminLayout currentTab="episodes" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 pb-24 min-w-0">
        {/* Header: Back arrow + Title + StatusBadge */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="w-9 h-9 rounded-[10px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center transition-colors shrink-0"
              title="Back to Episodes"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-[22px] font-bold text-white tracking-tight truncate">
                  {title || (isEditMode ? `Edit Episode ${episodeNumber}` : 'New Episode')}
                </h1>
                <AdminStatusBadge
                  status={published ? 'live' : 'draft'}
                  className="shrink-0"
                />
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                {selectedAnime?.title || 'Episode video & server details'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* ACCORDION SECTIONS: Basics, Status, Servers, Downloads, Skip intro/outro */}
        <div className="space-y-4">
          {/* 1. Basics (Open by default) */}
          <AdminAccordion
            title="Basics"
            subtitle="Anime series, season number, episode number, and title"
            icon={Tv}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <AdminSelect
                  label="Select Anime Series"
                  value={selectedAnimeId}
                  onChange={(val) => {
                    setSelectedAnimeId(String(val));
                    markDirty();
                  }}
                  options={animes.map((a) => ({
                    value: a.id || a.slug,
                    label: a.title,
                  }))}
                  sheetTitle="Select Anime"
                />
              </div>

              <div>
                <AdminSelect
                  label="Season Number"
                  value={seasonNumber}
                  onChange={(val) => {
                    setSeasonNumber(Number(val));
                    markDirty();
                  }}
                  options={[1, 2, 3, 4, 5, 6].map((s) => ({
                    value: s,
                    label: `Season ${s}`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Episode Number <span className="text-[#1E88FF]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={episodeNumber}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    setEpisodeNumber(num);
                    if (!title || title.startsWith('Episode ')) {
                      setTitle(`Episode ${num}`);
                    }
                    markDirty();
                  }}
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Episode Title <span className="text-[#1E88FF]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. Episode 12 - The Awakening"
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Duration (mm:ss)
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    markDirty();
                  }}
                  placeholder="24:00"
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Episode Thumbnail URL (16:9)
                  </label>
                  {selectedAnime?.banner && (
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnail(selectedAnime.banner || '');
                        markDirty();
                      }}
                      className="text-xs text-[#1E88FF] hover:underline"
                    >
                      Use anime banner
                    </button>
                  )}
                </div>
                <AdminCopyInput
                  type="url"
                  value={thumbnail}
                  onChange={(val) => {
                    setThumbnail(val);
                    markDirty();
                  }}
                  placeholder="https://..."
                  showPaste={true}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Episode Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Episode summary or notes..."
                  className="w-full min-h-[72px] bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                />
              </div>
            </div>
          </AdminAccordion>

          {/* 2. Status & Schedule */}
          <AdminAccordion
            title="Status & Broadcast Schedule"
            subtitle="Release status, premiere date, and upcoming marker"
            icon={Clock}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="divide-y divide-white/5">
                <AdminToggle
                  checked={isUpcoming}
                  onChange={(val) => {
                    setIsUpcoming(val);
                    markDirty();
                  }}
                  label="Upcoming Episode (Not Yet Aired)"
                  description="Displays countdown timer on the watch page until air date."
                />

                <AdminToggle
                  checked={published}
                  onChange={(val) => {
                    setPublished(val);
                    markDirty();
                  }}
                  label="Published to Visitors"
                  description="If turned off, this episode remains a draft visible only to admins."
                />
              </div>

              {isUpcoming && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Air Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={airDate}
                      onChange={(e) => {
                        setAirDate(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Air Time (IST)
                    </label>
                    <input
                      type="time"
                      value={releaseTime}
                      onChange={(e) => {
                        setReleaseTime(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </AdminAccordion>

          {/* 3. Video Servers (Sub list and Dub list) */}
          <AdminAccordion
            title="Video Stream Servers"
            subtitle="Configure Subtitle and Hindi Dub iframe/embed stream sources"
            icon={Server}
            defaultOpen={false}
          >
            <div className="space-y-6">
              {/* Sub Servers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Sub Servers ({subSources.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddServer('sub')}
                    className="h-8 px-2.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add server</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {subSources.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 rounded-[10px] bg-[#101A30] border border-white/5 space-y-2.5 md:space-y-0 md:flex md:items-center md:gap-2.5"
                    >
                      {/* Line 1 on mobile (<768px): grid [drag 24px] [label input minmax(0,1fr)] [star 44px] [delete 44px] */}
                      <div className="grid grid-cols-[24px_minmax(0,1fr)_44px_44px] gap-2 items-center md:contents">
                        <div className="flex items-center justify-center w-6 h-6 text-[#64748B] shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={srv.name}
                          onChange={(e) => handleUpdateServer(srv.id!, 'name', e.target.value)}
                          placeholder="server 1"
                          className="w-full md:w-[160px] md:flex-none h-11 bg-[#0B1324] border border-white/10 rounded-[8px] px-3 text-xs text-white min-w-0"
                        />
                        <div className="contents md:hidden">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultServer(srv.id!)}
                            className={`w-11 h-11 rounded-[8px] flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              srv.isDefault
                                ? 'bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30'
                                : 'bg-white/5 text-[#94A3B8] hover:text-white border border-white/5'
                            }`}
                            title={srv.isDefault ? 'Default server' : 'Set as default'}
                          >
                            <Star className={`w-4 h-4 ${srv.isDefault ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveServer(srv.id!)}
                            className="w-11 h-11 rounded-[8px] bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/5 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            title="Remove server"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Line 2 on mobile: full-width URL input (44px high) with paste button */}
                      <div className="relative w-full md:flex-1 md:min-w-0">
                        <input
                          type="url"
                          value={srv.embedUrl || ''}
                          onChange={(e) => handleUpdateServer(srv.id!, 'embedUrl', e.target.value)}
                          placeholder="https://embed.server.com/..."
                          className="w-full h-11 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-10 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard?.readText();
                              if (text) handleUpdateServer(srv.id!, 'embedUrl', text);
                            } catch {}
                          }}
                          className="w-8 h-8 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                          title="Paste from clipboard"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Desktop actions (>=768px): [star 44px] [delete 44px] */}
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultServer(srv.id!)}
                          className={`w-11 h-11 rounded-[8px] flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            srv.isDefault
                              ? 'bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30'
                              : 'bg-white/5 text-[#94A3B8] hover:text-white border border-white/5'
                          }`}
                          title={srv.isDefault ? 'Default server' : 'Set as default'}
                        >
                          <Star className={`w-4 h-4 ${srv.isDefault ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveServer(srv.id!)}
                          className="w-11 h-11 rounded-[8px] hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Remove server"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dub Servers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Hindi Dub Servers ({dubSources.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddServer('dub')}
                    className="h-8 px-2.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add server</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {dubSources.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 rounded-[10px] bg-[#101A30] border border-white/5 space-y-2.5 md:space-y-0 md:flex md:items-center md:gap-2.5"
                    >
                      {/* Line 1 on mobile (<768px): grid [drag 24px] [label input minmax(0,1fr)] [star 44px] [delete 44px] */}
                      <div className="grid grid-cols-[24px_minmax(0,1fr)_44px_44px] gap-2 items-center md:contents">
                        <div className="flex items-center justify-center w-6 h-6 text-[#64748B] shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={srv.name}
                          onChange={(e) => handleUpdateServer(srv.id!, 'name', e.target.value)}
                          placeholder="server 1"
                          className="w-full md:w-[160px] md:flex-none h-11 bg-[#0B1324] border border-white/10 rounded-[8px] px-3 text-xs text-white min-w-0"
                        />
                        <div className="contents md:hidden">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultServer(srv.id!)}
                            className={`w-11 h-11 rounded-[8px] flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              srv.isDefault
                                ? 'bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30'
                                : 'bg-white/5 text-[#94A3B8] hover:text-white border border-white/5'
                            }`}
                            title={srv.isDefault ? 'Default server' : 'Set as default'}
                          >
                            <Star className={`w-4 h-4 ${srv.isDefault ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveServer(srv.id!)}
                            className="w-11 h-11 rounded-[8px] bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/5 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            title="Remove server"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Line 2 on mobile: full-width URL input (44px high) with paste button */}
                      <div className="relative w-full md:flex-1 md:min-w-0">
                        <input
                          type="url"
                          value={srv.embedUrl || ''}
                          onChange={(e) => handleUpdateServer(srv.id!, 'embedUrl', e.target.value)}
                          placeholder="https://embed.server.com/..."
                          className="w-full h-11 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-10 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard?.readText();
                              if (text) handleUpdateServer(srv.id!, 'embedUrl', text);
                            } catch {}
                          }}
                          className="w-8 h-8 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                          title="Paste from clipboard"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Desktop actions (>=768px): [star 44px] [delete 44px] */}
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultServer(srv.id!)}
                          className={`w-11 h-11 rounded-[8px] flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            srv.isDefault
                              ? 'bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30'
                              : 'bg-white/5 text-[#94A3B8] hover:text-white border border-white/5'
                          }`}
                          title={srv.isDefault ? 'Default server' : 'Set as default'}
                        >
                          <Star className={`w-4 h-4 ${srv.isDefault ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveServer(srv.id!)}
                          className="w-11 h-11 rounded-[8px] hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Remove server"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminAccordion>

          {/* 4. Downloads */}
          <AdminAccordion
            title="Download Links"
            subtitle="Episode video file download links (1080p, 720p, 480p)"
            icon={Download}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Quality Mirrors
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadLinks((prev) => [
                      ...prev,
                      { quality: '1080p Ultra HD', size: '350 MB', url: '', host: 'Mega' },
                    ]);
                    markDirty();
                  }}
                  className="h-8 px-2.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add download mirror</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {downloadLinks.map((dl, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-[10px] bg-[#101A30] border border-white/5 space-y-2.5 md:space-y-0 md:flex md:items-center md:gap-2.5"
                  >
                    {/* Line 1 on mobile: grid [quality minmax(0,1fr)] [size 90px] [delete 44px] */}
                    <div className="grid grid-cols-[minmax(0,1fr)_90px_44px] gap-2 items-center md:contents">
                      <input
                        type="text"
                        value={dl.quality}
                        onChange={(e) => {
                          const copy = [...downloadLinks];
                          copy[idx].quality = e.target.value;
                          setDownloadLinks(copy);
                          markDirty();
                        }}
                        placeholder="1080p Ultra HD"
                        className="w-full md:w-[160px] md:flex-none h-11 bg-[#0B1324] border border-white/10 rounded-[8px] px-3 text-xs text-white min-w-0"
                      />
                      <input
                        type="text"
                        value={dl.size || ''}
                        onChange={(e) => {
                          const copy = [...downloadLinks];
                          copy[idx].size = e.target.value;
                          setDownloadLinks(copy);
                          markDirty();
                        }}
                        placeholder="350 MB"
                        className="w-full md:w-[100px] md:flex-none h-11 bg-[#0B1324] border border-white/10 rounded-[8px] px-2.5 text-xs text-white min-w-0"
                      />
                      <div className="contents md:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadLinks((prev) => prev.filter((_, i) => i !== idx));
                            markDirty();
                          }}
                          className="w-11 h-11 rounded-[8px] bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/5 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Remove mirror"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Line 2 on mobile: full-width URL input (44px high) with paste button */}
                    <div className="relative w-full md:flex-1 md:min-w-0">
                      <input
                        type="url"
                        value={dl.url}
                        onChange={(e) => {
                          const copy = [...downloadLinks];
                          copy[idx].url = e.target.value;
                          setDownloadLinks(copy);
                          markDirty();
                        }}
                        placeholder="https://download..."
                        className="w-full h-11 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-10 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard?.readText();
                            if (text) {
                              const copy = [...downloadLinks];
                              copy[idx].url = text;
                              setDownloadLinks(copy);
                              markDirty();
                            }
                          } catch {}
                        }}
                        className="w-8 h-8 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                        title="Paste from clipboard"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Desktop delete (>=768px) */}
                    <div className="hidden md:flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadLinks((prev) => prev.filter((_, i) => i !== idx));
                          markDirty();
                        }}
                        className="w-11 h-11 rounded-[8px] hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Remove mirror"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdminAccordion>

          {/* 5. Skip Intro / Outro */}
          <AdminAccordion
            title="Intro & Outro Skip Markers"
            subtitle="Seconds offset for opening (OP) and ending (ED) skip buttons"
            icon={Sparkles}
            defaultOpen={false}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Intro Start (seconds)
                </label>
                <input
                  type="number"
                  value={introStart ?? ''}
                  onChange={(e) => {
                    setIntroStart(e.target.value ? Number(e.target.value) : undefined);
                    markDirty();
                  }}
                  placeholder="0"
                  className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Intro End (seconds)
                </label>
                <input
                  type="number"
                  value={introEnd ?? ''}
                  onChange={(e) => {
                    setIntroEnd(e.target.value ? Number(e.target.value) : undefined);
                    markDirty();
                  }}
                  placeholder="90"
                  className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Outro Start (seconds)
                </label>
                <input
                  type="number"
                  value={outroStart ?? ''}
                  onChange={(e) => {
                    setOutroStart(e.target.value ? Number(e.target.value) : undefined);
                    markDirty();
                  }}
                  placeholder="1320"
                  className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Outro End (seconds)
                </label>
                <input
                  type="number"
                  value={outroEnd ?? ''}
                  onChange={(e) => {
                    setOutroEnd(e.target.value ? Number(e.target.value) : undefined);
                    markDirty();
                  }}
                  placeholder="1410"
                  className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                />
              </div>
            </div>
          </AdminAccordion>
        </div>

        {/* Sticky Save Bar */}
        <AdminStickySaveBar
          isDirty={isDirty}
          onSave={handleSave}
          onDiscard={() => {
            setIsDirty(false);
            onShowMessage('Changes discarded.');
          }}
          isSaving={saving}
          saveLabel={isEditMode ? 'Save changes' : 'Create episode'}
        />
      </div>
    </AdminLayout>
  );
};
