import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import type { Anime } from '../../types/anime';
import { getAllAnimes } from '../../lib/firestore/anime';
import { bulkCreateEpisodes, getAllEpisodesByAnimeId, type BulkEpisodeItemInput } from '../../lib/firestore/episodes';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import {
  ListPlus,
  Tv,
  Film,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Trash2,
  RefreshCw,
  ExternalLink,
  Plus,
  FileSpreadsheet,
  Code2,
  Check,
  Eye,
  Info,
} from 'lucide-react';

interface AdminBulkEpisodeViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

interface StagedEpisode {
  episodeNumber: number;
  title: string;
  seasonNumber: number;
  videoUrl: string;
  download720p: string;
  download1080p: string;
  language: string;
  quality: string;
  published: boolean;
}

export const AdminBulkEpisodeView: React.FC<AdminBulkEpisodeViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const qAnimeId = searchParams.get('animeId');
  const qSeason = searchParams.get('season');

  // Anime selection
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loadingAnimes, setLoadingAnimes] = useState(true);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>(qAnimeId || '');
  const [seasonNumber, setSeasonNumber] = useState<number>(qSeason ? parseInt(qSeason, 10) || 1 : 1);
  const [existingEpCount, setExistingEpCount] = useState<number>(0);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(false);

  // Active generation tab
  const [activeTab, setActiveTab] = useState<'range' | 'text' | 'urls' | 'json'>('range');

  // Mode 1: Range Generator states
  const [startEp, setStartEp] = useState<number>(1);
  const [endEp, setEndEp] = useState<number>(12);
  const [titlePattern, setTitlePattern] = useState<string>('Episode {ep}');
  const [defaultLang, setDefaultLang] = useState<string>('DUB');
  const [defaultQuality, setDefaultQuality] = useState<string>('1080p');
  const [defaultPublished, setDefaultPublished] = useState<boolean>(true);
  const [rawStreamUrls, setRawStreamUrls] = useState<string>('');
  const [raw720pUrls, setRaw720pUrls] = useState<string>('');
  const [raw1080pUrls, setRaw1080pUrls] = useState<string>('');

  // Mode 2: Multi-line Delimited Text states
  const [delimitedText, setDelimitedText] = useState<string>('');

  // Mode 3: Quick URLs states
  const [urlSplitterStartEp, setUrlSplitterStartEp] = useState<number>(1);
  const [urlSplitterType, setUrlSplitterType] = useState<'stream' | '720p' | '1080p'>('stream');
  const [urlSplitterText, setUrlSplitterText] = useState<string>('');

  // Mode 4: JSON states
  const [jsonText, setJsonText] = useState<string>('');

  // Staged Episodes (Editable preview table before saving)
  const [stagedEpisodes, setStagedEpisodes] = useState<StagedEpisode[]>([]);

  // Execution options
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [updateAnimeStats, setUpdateAnimeStats] = useState<boolean>(true);

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveSuccessResult, setSaveSuccessResult] = useState<{
    added: number;
    updated: number;
    failed: number;
  } | null>(null);

  // Load animes
  useEffect(() => {
    getAllAnimes()
      .then((list) => {
        setAnimes(list);
        if (!selectedAnimeId && list.length > 0) {
          setSelectedAnimeId(list[0].id);
        }
      })
      .catch((err) => console.error('Failed to load anime list:', err))
      .finally(() => setLoadingAnimes(false));
  }, []);

  // Fetch existing count when anime changes
  useEffect(() => {
    if (!selectedAnimeId) return;
    setLoadingExisting(true);
    getAllEpisodesByAnimeId(selectedAnimeId)
      .then((eps) => {
        const matchingSeason = eps.filter(
          (e) => (e.seasonNumber || e.season || 1) === seasonNumber
        );
        setExistingEpCount(matchingSeason.length);
        if (matchingSeason.length > 0 && stagedEpisodes.length === 0) {
          const maxNum = matchingSeason.reduce((max, e) => Math.max(max, e.episodeNumber), 0);
          setStartEp(maxNum + 1);
          setEndEp(maxNum + 12);
        }
      })
      .catch(() => setExistingEpCount(0))
      .finally(() => setLoadingExisting(false));
  }, [selectedAnimeId, seasonNumber]);

  const selectedAnime = useMemo(() => {
    return animes.find((a) => a.id === selectedAnimeId);
  }, [animes, selectedAnimeId]);

  // Handler: Generate from Range Tab
  const handleGenerateRange = () => {
    if (endEp < startEp) {
      onShowMessage('End Episode must be greater than or equal to Start Episode.');
      return;
    }

    const streamLines = rawStreamUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const p720Lines = raw720pUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const p1080Lines = raw1080pUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const generated: StagedEpisode[] = [];
    let idx = 0;
    for (let ep = startEp; ep <= endEp; ep++) {
      generated.push({
        episodeNumber: ep,
        title: titlePattern.replace('{ep}', ep.toString()),
        seasonNumber,
        videoUrl: streamLines[idx] || '',
        download720p: p720Lines[idx] || '',
        download1080p: p1080Lines[idx] || '',
        language: defaultLang,
        quality: defaultQuality,
        published: defaultPublished,
      });
      idx++;
    }

    setStagedEpisodes(generated);
    setSaveSuccessResult(null);
    onShowMessage(`Generated ${generated.length} episodes into preview table!`);
  };

  // Handler: Parse Delimited Text
  const handleParseDelimitedText = () => {
    const lines = delimitedText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      onShowMessage('Please paste at least one line of episode data.');
      return;
    }

    const parsed: StagedEpisode[] = [];
    lines.forEach((line, index) => {
      // Split by pipe (|), tab, or comma if pipe isn't present
      const parts = line.includes('|')
        ? line.split('|').map((p) => p.trim())
        : line.includes('\t')
        ? line.split('\t').map((p) => p.trim())
        : line.split(',').map((p) => p.trim());

      let epNum = parseInt(parts[0], 10);
      if (isNaN(epNum)) {
        epNum = index + 1;
      }

      let epTitle = `Episode ${epNum}`;
      let streamUrl = '';
      let p720 = '';
      let p1080 = '';

      if (parts.length === 2) {
        // e.g. "1 | https://embed..."
        streamUrl = parts[1];
      } else if (parts.length === 3) {
        // e.g. "1 | Title | https://embed..."
        epTitle = parts[1] || epTitle;
        streamUrl = parts[2];
      } else if (parts.length === 4) {
        // e.g. "1 | Title | Stream | 720p"
        epTitle = parts[1] || epTitle;
        streamUrl = parts[2];
        p720 = parts[3];
      } else if (parts.length >= 5) {
        // e.g. "1 | Title | Stream | 720p | 1080p"
        epTitle = parts[1] || epTitle;
        streamUrl = parts[2];
        p720 = parts[3];
        p1080 = parts[4];
      }

      parsed.push({
        episodeNumber: epNum,
        title: epTitle,
        seasonNumber,
        videoUrl: streamUrl,
        download720p: p720,
        download1080p: p1080,
        language: defaultLang,
        quality: defaultQuality,
        published: true,
      });
    });

    setStagedEpisodes(parsed);
    setSaveSuccessResult(null);
    onShowMessage(`Successfully parsed ${parsed.length} episodes!`);
  };

  // Handler: Parse Quick URLs Splitter
  const handleParseQuickUrls = () => {
    const urls = urlSplitterText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      onShowMessage('Please paste at least one URL.');
      return;
    }

    const items: StagedEpisode[] = urls.map((url, i) => {
      const epNum = urlSplitterStartEp + i;
      return {
        episodeNumber: epNum,
        title: `Episode ${epNum}`,
        seasonNumber,
        videoUrl: urlSplitterType === 'stream' ? url : '',
        download720p: urlSplitterType === '720p' ? url : '',
        download1080p: urlSplitterType === '1080p' ? url : '',
        language: defaultLang,
        quality: defaultQuality,
        published: true,
      };
    });

    setStagedEpisodes(items);
    setSaveSuccessResult(null);
    onShowMessage(`Generated ${items.length} episode slots from URLs!`);
  };

  // Handler: Parse JSON
  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        onShowMessage('JSON must be an array of episode objects.');
        return;
      }

      const items: StagedEpisode[] = parsed.map((item: any, i: number) => {
        const epNum = parseInt(item.episodeNumber || item.ep || i + 1, 10);
        return {
          episodeNumber: epNum,
          title: item.title || `Episode ${epNum}`,
          seasonNumber: parseInt(item.seasonNumber || item.season || seasonNumber, 10),
          videoUrl: item.videoUrl || item.embedUrl || item.streamUrl || '',
          download720p: item.download720p || item.downloadUrl || '',
          download1080p: item.download1080p || '',
          language: item.language || defaultLang,
          quality: item.quality || defaultQuality,
          published: item.published !== false,
        };
      });

      setStagedEpisodes(items);
      setSaveSuccessResult(null);
      onShowMessage(`Loaded ${items.length} episodes from JSON!`);
    } catch (err: any) {
      onShowMessage(`Invalid JSON: ${err.message}`);
    }
  };

  // Inline editing helper
  const handleUpdateStagedField = (index: number, field: keyof StagedEpisode, value: any) => {
    setStagedEpisodes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Delete row from preview table
  const handleDeleteRow = (index: number) => {
    setStagedEpisodes((prev) => prev.filter((_, i) => i !== index));
  };

  // Add blank row to preview table
  const handleAddBlankRow = () => {
    const nextEp = stagedEpisodes.length > 0
      ? Math.max(...stagedEpisodes.map((e) => e.episodeNumber)) + 1
      : 1;
    setStagedEpisodes((prev) => [
      ...prev,
      {
        episodeNumber: nextEp,
        title: `Episode ${nextEp}`,
        seasonNumber,
        videoUrl: '',
        download720p: '',
        download1080p: '',
        language: defaultLang,
        quality: defaultQuality,
        published: true,
      },
    ]);
  };

  // Execute Bulk Save to Firestore
  const handleSaveBulkEpisodes = async () => {
    if (!selectedAnimeId) {
      onShowMessage('Please select an Anime first.');
      return;
    }
    if (stagedEpisodes.length === 0) {
      onShowMessage('No episodes in preview table to save.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveProgress(`Preparing ${stagedEpisodes.length} episodes for batch upload...`);

      // Prepare payload for Firestore
      const episodeInputs: BulkEpisodeItemInput[] = stagedEpisodes.map((st) => {
        const downloadLinks: { quality: string; url: string; size?: string; host?: string }[] = [];
        if (st.download720p) {
          downloadLinks.push({ quality: '720p', url: st.download720p, host: 'Direct' });
        }
        if (st.download1080p) {
          downloadLinks.push({ quality: '1080p', url: st.download1080p, host: 'Direct' });
        }

        const sources: any[] = [];
        if (st.videoUrl) {
          sources.push({
            id: `srv-${Date.now()}-${st.episodeNumber}`,
            name: 'Server 1',
            provider: 'Server 1',
            sourceName: 'Server 1',
            type: 'embed',
            embedUrl: st.videoUrl,
            category: 'dub',
            quality: st.quality || '1080p',
            priority: 1,
            active: true,
            isDefault: true,
          });
        }

        return {
          episodeNumber: st.episodeNumber,
          title: st.title || `Episode ${st.episodeNumber}`,
          seasonNumber: st.seasonNumber || seasonNumber,
          season: st.seasonNumber || seasonNumber,
          language: st.language || defaultLang,
          quality: st.quality || defaultQuality,
          published: st.published,
          videoUrl: st.videoUrl || undefined,
          sources: sources.length > 0 ? sources : undefined,
          videoSources: sources.length > 0 ? sources : undefined,
          downloadUrl: st.download1080p || st.download720p || undefined,
          downloadQuality: st.download1080p ? '1080p' : st.download720p ? '720p' : '1080p',
          downloadLinks: downloadLinks.length > 0 ? downloadLinks : undefined,
        };
      });

      setSaveProgress(`Writing batch records to database...`);

      const result = await bulkCreateEpisodes(selectedAnimeId, episodeInputs, {
        overwriteExisting,
        updateAnimeStats,
        animeTitle: selectedAnime?.title || '',
        animeSlug: selectedAnime?.slug || selectedAnime?.id || '',
        animePoster: selectedAnime?.poster || '',
        animeBanner: selectedAnime?.banner || (selectedAnime as any)?.bannerUrl || selectedAnime?.poster || '',
      });

      // Log admin audit activity
      await logAdminActivity(
        user?.uid || 'admin',
        user?.email || 'admin',
        `Bulk Added ${result.added} and Updated ${result.updated} Episodes for ${selectedAnime?.title || selectedAnimeId}`,
        'Episodes',
        selectedAnimeId,
        JSON.stringify({
          season: seasonNumber,
          count: stagedEpisodes.length,
          result,
        })
      );

      setSaveSuccessResult(result);
      onShowMessage(`Successfully saved ${result.added + result.updated} episodes to database!`);
    } catch (err: any) {
      console.error('Failed to bulk save episodes:', err);
      onShowMessage(`Bulk save failed: ${err?.message || 'Database error'}`);
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  return (
    <AdminLayout
      currentTab="episodes"
      navigate={navigate}
      onShowMessage={onShowMessage}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#081225] via-[#0A1835] to-[#081225] border border-cyan-500/20 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 shrink-0">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Bulk Add Episodes
              </h1>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="px-3.5 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>Episodes List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = selectedAnimeId ? `/admin/downloads?animeId=${selectedAnimeId}&season=${seasonNumber}` : '/admin/downloads';
                navigate(url);
              }}
              className="px-3.5 sm:px-4 py-2 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Downloads</span>
            </button>
          </div>
        </div>

        {/* STEP 1: Select Anime & Season */}
        <div className="bg-[#0B1322] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Film className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Step 1: Choose Target Anime & Season
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Anime Dropdown */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8]">Select Anime Series:</label>
              {loadingAnimes ? (
                <div className="h-10 bg-[#050A14] border border-white/10 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedAnimeId}
                  onChange={(e) => setSelectedAnimeId(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer font-medium"
                >
                  {animes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.type || 'TV'} • {a.status || 'Ongoing'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Season Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8]">Season Number:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={seasonNumber}
                  onChange={(e) => setSeasonNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-[#94A3B8] shrink-0">
                  {loadingExisting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    `Current: ${existingEpCount} eps`
                  )}
                </span>
              </div>
            </div>
          </div>

          {selectedAnime && (
            <div className="flex items-center gap-3 pt-2 text-xs text-[#94A3B8] bg-[#050A14]/60 p-3 rounded-xl border border-white/5">
              <div className="w-8 h-10 rounded bg-slate-800 shrink-0 overflow-hidden">
                {selectedAnime.poster ? (
                  <img
                    src={selectedAnime.poster}
                    alt={selectedAnime.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px]">No Pic</div>
                )}
              </div>
              <div className="truncate">
                <span className="font-bold text-white">{selectedAnime.title}</span>
                <div className="flex items-center gap-2 text-[11px] mt-0.5">
                  <span className="text-cyan-400">{selectedAnime.genres?.slice(0, 3).join(', ')}</span>
                  <span>•</span>
                  <span>Released: {(selectedAnime as any).releasedEpisodes || (selectedAnime as any).episodesCount || 0} / Total: {selectedAnime.totalEpisodes || '?'} eps</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Choose Method & Input Data */}
        <div className="bg-[#0B1322] border border-white/10 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Step 2: Generate Episodes
              </h2>
            </div>

            {/* Mode selection tabs */}
            <div className="flex items-center gap-1 bg-[#050A14] p-1 rounded-xl border border-white/5">
              {[
                { id: 'range', label: 'Range & Paste', icon: Layers },
                { id: 'text', label: 'Line-by-Line CSV', icon: FileSpreadsheet },
                { id: 'urls', label: 'Quick URLs', icon: ExternalLink },
                { id: 'json', label: 'Raw JSON', icon: Code2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/20'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: Range Generator (Most Popular) */}
          {activeTab === 'range' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#050A14]/70 p-4 rounded-xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Start Episode:</label>
                  <input
                    type="number"
                    min={1}
                    value={startEp}
                    onChange={(e) => setStartEp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#081225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">End Episode:</label>
                  <input
                    type="number"
                    min={1}
                    value={endEp}
                    onChange={(e) => setEndEp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#081225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Title Template:</label>
                  <input
                    type="text"
                    value={titlePattern}
                    onChange={(e) => setTitlePattern(e.target.value)}
                    placeholder="Episode {ep}"
                    className="w-full bg-[#081225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Audio Language:</label>
                  <select
                    value={defaultLang}
                    onChange={(e) => setDefaultLang(e.target.value)}
                    className="w-full bg-[#081225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="DUB">Hindi Dub (DUB)</option>
                    <option value="SUB">Japanese Sub (SUB)</option>
                    <option value="MULTI">Dual Audio (MULTI)</option>
                    <option value="RAW">Raw</option>
                  </select>
                </div>
              </div>

              {/* Paste Textareas (Stream, 720p, 1080p) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stream Embed URLs */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5" />
                      <span>Stream / Embed URLs</span>
                    </label>
                    <span className="text-[10px] text-[#94A3B8]">1 link per line</span>
                  </div>
                  <textarea
                    rows={8}
                    value={rawStreamUrls}
                    onChange={(e) => setRawStreamUrls(e.target.value)}
                    placeholder="https://embed.streamtape.com/e/...
https://embed.streamtape.com/e/...
https://embed.streamtape.com/e/..."
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                  <p className="text-[11px] text-[#94A3B8]">
                    Line 1 = Ep {startEp}, Line 2 = Ep {startEp + 1}...
                  </p>
                </div>

                {/* 720p Download Links */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>720p Download Links</span>
                    </label>
                    <span className="text-[10px] text-[#94A3B8]">1 link per line</span>
                  </div>
                  <textarea
                    rows={8}
                    value={raw720pUrls}
                    onChange={(e) => setRaw720pUrls(e.target.value)}
                    placeholder="https://mega.nz/file/ep1-720p...
https://mega.nz/file/ep2-720p...
https://mega.nz/file/ep3-720p..."
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-amber-500 resize-none leading-relaxed"
                  />
                  <p className="text-[11px] text-[#94A3B8]">
                    Line 1 = Ep {startEp}, Line 2 = Ep {startEp + 1}...
                  </p>
                </div>

                {/* 1080p Download Links */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>1080p Download Links</span>
                    </label>
                    <span className="text-[10px] text-[#94A3B8]">1 link per line</span>
                  </div>
                  <textarea
                    rows={8}
                    value={raw1080pUrls}
                    onChange={(e) => setRaw1080pUrls(e.target.value)}
                    placeholder="https://drive.google.com/uc?id=ep1-1080p...
https://drive.google.com/uc?id=ep2-1080p...
https://drive.google.com/uc?id=ep3-1080p..."
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                  <p className="text-[11px] text-[#94A3B8]">
                    Line 1 = Ep {startEp}, Line 2 = Ep {startEp + 1}...
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateRange}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Preview Table ({Math.max(0, endEp - startEp + 1)} Episodes)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-line Delimited Text */}
          {activeTab === 'text' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-[#94A3B8] bg-[#050A14]/60 p-3 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <p className="font-bold text-white">Format Options (Pipe | or Tab separated):</p>
                  <p className="text-[11px] text-[#94A3B8]">
                    <code className="text-cyan-400">EpisodeNumber | Title | StreamURL | 720pDownload | 1080pDownload</code>
                    <br />
                    Or simply: <code className="text-amber-400">1 | https://stream-embed.com/video1</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDelimitedText(
                      `1 | Episode 1 | https://media.w3.org/2010/05/bunny/trailer.mp4 | https://mega.nz/720p-ep1 | https://mega.nz/1080p-ep1\n` +
                      `2 | Episode 2 | https://media.w3.org/2010/05/sintel/trailer.mp4 | https://mega.nz/720p-ep2 | https://mega.nz/1080p-ep2\n` +
                      `3 | Episode 3 | https://vjs.zencdn.net/v/oceans.mp4 | https://mega.nz/720p-ep3 | https://mega.nz/1080p-ep3`
                    );
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] font-semibold rounded-lg shrink-0"
                >
                  Insert Sample Data
                </button>
              </div>

              <textarea
                rows={9}
                value={delimitedText}
                onChange={(e) => setDelimitedText(e.target.value)}
                placeholder="1 | Episode 1 | https://embed... | https://720p... | https://1080p...
2 | Episode 2 | https://embed... | https://720p... | https://1080p..."
                className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-cyan-500 resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseDelimitedText}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Parse to Preview Table</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Quick URLs */}
          {activeTab === 'urls' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center gap-4 bg-[#050A14]/70 p-4 rounded-xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Start From Episode #:</label>
                  <input
                    type="number"
                    min={1}
                    value={urlSplitterStartEp}
                    onChange={(e) => setUrlSplitterStartEp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-28 bg-[#081225] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Assign URLs As:</label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'stream', label: 'Video Stream Embeds' },
                      { id: '720p', label: '720p Download Links' },
                      { id: '1080p', label: '1080p Download Links' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setUrlSplitterType(t.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          urlSplitterType === t.id
                            ? 'bg-cyan-500 text-white font-bold'
                            : 'bg-[#081225] text-[#94A3B8] border border-white/5'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <textarea
                rows={8}
                value={urlSplitterText}
                onChange={(e) => setUrlSplitterText(e.target.value)}
                placeholder="Paste list of URLs (one per line)..."
                className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-cyan-500 resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseQuickUrls}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Generate Episode Rows</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Raw JSON */}
          {activeTab === 'json' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-[#94A3B8] bg-[#050A14]/60 p-3 rounded-xl border border-white/5">
                <span>Paste a JSON array containing episode objects.</span>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(
                      JSON.stringify(
                        [
                          { episodeNumber: 1, title: 'Episode 1', videoUrl: 'https://...', download720p: 'https://...', download1080p: 'https://...' },
                          { episodeNumber: 2, title: 'Episode 2', videoUrl: 'https://...', download720p: 'https://...', download1080p: 'https://...' },
                        ],
                        null,
                        2
                      )
                    );
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] font-semibold rounded-lg"
                >
                  Insert Sample JSON
                </button>
              </div>

              <textarea
                rows={9}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="[ { &quot;episodeNumber&quot;: 1, &quot;title&quot;: &quot;Episode 1&quot;, ... } ]"
                className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-white/20 outline-none focus:border-cyan-500 resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseJson}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Load JSON to Preview</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: Interactive Preview & Edit Table */}
        <div className="bg-[#0B1322] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Step 3: Staged Episodes Preview ({stagedEpisodes.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add Row</span>
              </button>
              {stagedEpisodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStagedEpisodes([])}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {stagedEpisodes.length === 0 ? (
            <div className="py-12 text-center text-[#94A3B8] border border-dashed border-white/10 rounded-xl space-y-2">
              <Info className="w-8 h-8 text-cyan-400 mx-auto opacity-60" />
              <p className="text-xs font-semibold text-white">No episodes in preview table yet.</p>
              <p className="text-[11px] text-[#94A3B8] max-w-md mx-auto">
                Use Step 2 above to generate a range (e.g. Ep 1 to 12) or paste your links to populate this preview table.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Stats summary */}
              <div className="flex flex-wrap items-center gap-3 text-xs bg-[#050A14]/70 p-3 rounded-xl border border-white/5">
                <span className="text-white font-bold">{stagedEpisodes.length} Episodes</span>
                <span>•</span>
                <span className="text-cyan-400">
                  {stagedEpisodes.filter((e) => e.videoUrl).length} Stream Links
                </span>
                <span>•</span>
                <span className="text-amber-400">
                  {stagedEpisodes.filter((e) => e.download720p).length} 720p Links
                </span>
                <span>•</span>
                <span className="text-emerald-400">
                  {stagedEpisodes.filter((e) => e.download1080p).length} 1080p Links
                </span>
              </div>

              {/* Editable Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10 max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs text-white border-collapse">
                  <thead className="bg-[#050A14] text-[#94A3B8] uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-white/10">
                    <tr>
                      <th className="p-3 w-16 text-center">EP #</th>
                      <th className="p-3 w-40">Title</th>
                      <th className="p-3 min-w-[200px]">Stream / Embed URL</th>
                      <th className="p-3 min-w-[170px]">720p Download</th>
                      <th className="p-3 min-w-[170px]">1080p Download</th>
                      <th className="p-3 w-20 text-center">Published</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-[#081225]">
                    {stagedEpisodes.map((ep, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        {/* EP Number */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={ep.episodeNumber}
                            onChange={(e) =>
                              handleUpdateStagedField(
                                idx,
                                'episodeNumber',
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-12 text-center bg-[#050A14] border border-white/10 rounded-lg py-1 text-xs font-bold text-cyan-400 outline-none focus:border-cyan-500"
                          />
                        </td>

                        {/* Title */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={ep.title}
                            onChange={(e) => handleUpdateStagedField(idx, 'title', e.target.value)}
                            className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                          />
                        </td>

                        {/* Stream / Embed */}
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={ep.videoUrl}
                              placeholder="https://..."
                              onChange={(e) =>
                                handleUpdateStagedField(idx, 'videoUrl', e.target.value)
                              }
                              className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
                            />
                            {ep.videoUrl && (
                              <a
                                href={ep.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-[#94A3B8] hover:text-cyan-400 shrink-0"
                                title="Test Stream Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* 720p Download */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={ep.download720p}
                            placeholder="720p link..."
                            onChange={(e) =>
                              handleUpdateStagedField(idx, 'download720p', e.target.value)
                            }
                            className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-amber-300 outline-none focus:border-amber-500"
                          />
                        </td>

                        {/* 1080p Download */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={ep.download1080p}
                            placeholder="1080p link..."
                            onChange={(e) =>
                              handleUpdateStagedField(idx, 'download1080p', e.target.value)
                            }
                            className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Published Toggle */}
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={ep.published}
                            onChange={(e) =>
                              handleUpdateStagedField(idx, 'published', e.target.checked)
                            }
                            className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete this row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Settings & Save Action Bar */}
              <div className="bg-[#050A14] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[#CBD5E1]">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="rounded accent-cyan-500 w-4 h-4"
                    />
                    <span>Overwrite if episode number already exists in DB</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[#CBD5E1]">
                    <input
                      type="checkbox"
                      checked={updateAnimeStats}
                      onChange={(e) => setUpdateAnimeStats(e.target.checked)}
                      className="rounded accent-cyan-500 w-4 h-4"
                    />
                    <span>Auto-update Anime's released episodes count</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSaveBulkEpisodes}
                    disabled={isSaving || stagedEpisodes.length === 0}
                    className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{saveProgress || 'Saving to Database...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save All {stagedEpisodes.length} Episodes to Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Banner */}
        {saveSuccessResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-emerald-300 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Bulk Episode Upload Completed Successfully!
              </h3>
            </div>
            <p className="text-xs text-emerald-200/90">
              Added: <strong>{saveSuccessResult.added}</strong> new episodes • Updated: <strong>{saveSuccessResult.updated}</strong> existing episodes • Failed: {saveSuccessResult.failed}.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/admin/episodes?animeId=${selectedAnimeId}&season=${seasonNumber}`)}
                className="px-4 py-2 bg-emerald-500 text-black font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-1.5"
              >
                <span>View in Episodes List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/admin/downloads?animeId=${selectedAnimeId}&season=${seasonNumber}`)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition-all"
              >
                Downloads Manager
              </button>
              {selectedAnime?.slug && (
                <button
                  type="button"
                  onClick={() => navigate(`/watch/${selectedAnime.slug}?ep=1`)}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs rounded-xl transition-all"
                >
                  Watch Page
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
