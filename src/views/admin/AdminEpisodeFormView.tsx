import React, { useState, useEffect } from 'react';
import type { Anime } from '../../types/anime';
import type { Episode, VideoSource, SubtitleTrack } from '../../types/episode';
import { getAllAnimes } from '../../lib/firestore/anime';
import {
  createEpisode,
  getEpisodeById,
  updateEpisode,
  getAllEpisodesByAnimeId,
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
  Subtitles,
  ShieldCheck,
  CheckCircle2,
  Download,
  Link as LinkIcon,
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

  // Multi-server video sources
  const [videoSources, setVideoSources] = useState<VideoSource[]>([
    {
      id: 'srv-1',
      name: 'Server 1 (Abyss HD)',
      type: 'abyss',
      embedUrl: '',
      quality: '1080p',
      language: 'Hindi Dub',
      priority: 1,
      active: true,
    },
  ]);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setDuration(epData.duration || '24:00');
            setIntroStart(epData.introStart);
            setIntroEnd(epData.introEnd);
            setOutroStart(epData.outroStart);
            setOutroEnd(epData.outroEnd);
            setPublished(epData.published ?? true);

            if (epData.videoSources && epData.videoSources.length > 0) {
              setVideoSources(epData.videoSources);
            } else if (epData.sources && epData.sources.length > 0) {
              setVideoSources(
                epData.sources.map((s, idx) => ({
                  id: `srv-${idx + 1}`,
                  name: s.provider || `Server ${idx + 1}`,
                  type: 'abyss',
                  embedUrl: s.embedUrl || '',
                  frameCode: s.frameCode,
                  quality: s.quality || '1080p',
                  language: s.language || 'Hindi Dub',
                  priority: idx + 1,
                  active: s.active ?? true,
                }))
              );
            } else if (epData.videoUrl) {
              setVideoSources([
                {
                  id: 'srv-1',
                  name: 'Primary Stream',
                  type: epData.videoUrl.endsWith('.m3u8') ? 'hls' : 'mp4',
                  embedUrl: epData.videoUrl,
                  quality: '1080p',
                  language: 'Hindi Dub',
                  priority: 1,
                  active: true,
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
          if (querySeason) {
            setSeasonNumber(parseInt(querySeason, 10) || 1);
          }

          if (defaultAnimeId) {
            try {
              const existingEps = await getAllEpisodesByAnimeId(defaultAnimeId);
              setEpisodeNumber(existingEps.length + 1);
            } catch {
              setEpisodeNumber(1);
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
    if (!isEditMode && newAnimeId) {
      try {
        const existingEps = await getAllEpisodesByAnimeId(newAnimeId);
        setEpisodeNumber(existingEps.length + 1);
      } catch {
        // keep current
      }
    }
  };

  const handleAddServer = () => {
    setVideoSources((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        name: `Server ${prev.length + 1} (Streamwish / Abyss)`,
        type: 'embed',
        embedUrl: '',
        quality: '1080p',
        language: 'Hindi Dub',
        priority: prev.length + 1,
        active: true,
      },
    ]);
  };

  const handleUpdateServer = (index: number, field: keyof VideoSource, value: any) => {
    setVideoSources((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveServer = (index: number) => {
    if (videoSources.length === 1) {
      onShowMessage('At least one video server is required.');
      return;
    }
    setVideoSources((prev) => prev.filter((_, i) => i !== index));
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
    if (validSources.length === 0) {
      setError('Please enter at least one valid video embed URL or streaming source.');
      return;
    }

    const validDownloadLinks = downloadLinks.filter((d) => d.url.trim());

    const effectiveAnime = animes.find((a) => a.id === selectedAnimeId || a.slug === selectedAnimeId);
    const targetAnimeId = effectiveAnime?.id || selectedAnimeId;
    const targetAnimeSlug = effectiveAnime?.slug || selectedAnimeId;
    const targetAnimeTitle = effectiveAnime?.title || '';
    const finalThumbnail = thumbnail.trim() || effectiveAnime?.poster || effectiveAnime?.banner || undefined;

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
      downloadUrl: downloadUrl.trim() || (validDownloadLinks[0]?.url ? validDownloadLinks[0].url.trim() : undefined),
      downloadQuality: downloadQuality.trim() || undefined,
      downloadSize: downloadSize.trim() || undefined,
      downloadLinks: validDownloadLinks.length > 0 ? validDownloadLinks : undefined,
      videoUrl: validSources[0].embedUrl || '',
      sources: validSources.map((s, idx) => ({
        id: s.id || `src-${idx + 1}`,
        provider: s.name || s.provider || `Server ${idx + 1}`,
        sourceName: s.name || s.sourceName || `Server ${idx + 1}`,
        sourceType: s.type || s.sourceType || 'embed',
        quality: s.quality || '1080p',
        language: s.language || 'Hindi Dub',
        embedUrl: s.embedUrl || '',
        frameCode: s.frameCode || '',
        priority: s.priority || idx + 1,
        active: s.active ?? true,
      })),
      videoSources: validSources,
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
          `Ep ${payload.episodeNumber} - ${payload.title}`
        );
        onShowMessage('Episode updated successfully.');
      } else {
        const newEpId = await createEpisode(payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Created Episode',
          'Episode',
          newEpId,
          `Ep ${payload.episodeNumber} - ${payload.title}`
        );
        onShowMessage('Episode created successfully.');
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

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 rounded-xl flex items-center gap-2 transition-all"
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
                    onChange={(e) => setSeasonNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                  {selectedAnime?.seasonsList && selectedAnime.seasonsList.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                      {selectedAnime.seasonsList.map((s) => (
                        <button
                          key={s.seasonNumber}
                          type="button"
                          onClick={() => setSeasonNumber(s.seasonNumber)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                            seasonNumber === s.seasonNumber
                              ? 'bg-cyan-500 text-black shadow-sm'
                              : 'bg-white/5 text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          {s.title || `S${s.seasonNumber}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                <label className="text-xs font-bold text-[#94A3B8]">Episode Thumbnail Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                />
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

          {/* Video Streaming Servers */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Video Streaming Servers ({videoSources.length})</span>
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Add multiple backup servers (Abyss, Streamwish, Vidcloud, HLS m3u8, direct MP4).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddServer}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Server</span>
              </button>
            </div>

            <div className="space-y-4">
              {videoSources.map((srv, index) => (
                <div
                  key={srv.id || index}
                  className="bg-[#050A14] border border-white/10 rounded-2xl p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">Server #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveServer(index)}
                      className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                      title="Remove Server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#94A3B8]">Server Display Name</label>
                      <input
                        type="text"
                        value={srv.name}
                        onChange={(e) => handleUpdateServer(index, 'name', e.target.value)}
                        placeholder="e.g. Server 1 (Abyss HD)"
                        className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#94A3B8]">Server Protocol / Type</label>
                      <select
                        value={srv.type}
                        onChange={(e) => handleUpdateServer(index, 'type', e.target.value as any)}
                        className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                      >
                        <option value="abyss">Abyss Stream (Recommended)</option>
                        <option value="embed">Generic Iframe Embed</option>
                        <option value="hls">HLS / M3U8 Stream</option>
                        <option value="mp4">Direct MP4 Video</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#94A3B8]">Audio Language / Dub</label>
                      <input
                        type="text"
                        value={srv.language || 'Hindi Dub'}
                        onChange={(e) => handleUpdateServer(index, 'language', e.target.value)}
                        placeholder="Hindi Dub / Japanese Sub"
                        className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#94A3B8]">Stream / Embed URL</label>
                    <input
                      type="text"
                      value={srv.embedUrl}
                      onChange={(e) => handleUpdateServer(index, 'embedUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Episode Download Links & Direct URLs */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Episode Download Links & Direct URLs</span>
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Provide direct high-speed download links (Mega, Google Drive, Telegram, Direct MP4/MKV server).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDownloadLink}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Quality Mirror</span>
              </button>
            </div>

            {/* Primary Episode Download Link */}
            <div className="p-4 bg-[#050A14] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-emerald-400">Primary Download URL</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Download URL (Mega / Drive / MediaFire / Any Website)</label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="https://mega.nz/... or https://mediafire.com/... or any website"
                      className="w-full bg-[#0B1322] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
            </div>

            {/* Additional Multi-Quality Download Mirrors */}
            {downloadLinks.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-[#94A3B8]">Additional Mirrors & Resolution Options:</div>
                {downloadLinks.map((dl, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-[#050A14] border border-white/5 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#94A3B8]">Mirror #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDownloadLink(index)}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                        title="Remove Mirror"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#94A3B8]">Quality / Resolution</label>
                        <input
                          type="text"
                          value={dl.quality}
                          onChange={(e) => handleUpdateDownloadLink(index, 'quality', e.target.value)}
                          placeholder="e.g. 720p HD / 480p"
                          className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#94A3B8]">Hosting Provider</label>
                        <input
                          type="text"
                          value={dl.host || ''}
                          onChange={(e) => handleUpdateDownloadLink(index, 'host', e.target.value)}
                          placeholder="Mega / Drive / Telegram"
                          className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#94A3B8]">File Size</label>
                        <input
                          type="text"
                          value={dl.size || ''}
                          onChange={(e) => handleUpdateDownloadLink(index, 'size', e.target.value)}
                          placeholder="e.g. 180 MB"
                          className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#94A3B8]">Download URL</label>
                        <input
                          type="url"
                          value={dl.url}
                          onChange={(e) => handleUpdateDownloadLink(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intro / Outro Skip Timestamps */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Intro & Outro Auto-Skip Timestamps (Seconds)</span>
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
      </div>
    </AdminLayout>
  );
};
