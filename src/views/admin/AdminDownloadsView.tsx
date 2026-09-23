import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import { getAllAnimes, updateAnime } from '../../lib/firestore/anime';
import {
  getAllEpisodesByAnimeId,
  updateEpisode,
  createEpisode,
} from '../../lib/firestore/episodes';
import type { Anime, ZipDownloadPackage } from '../../types/anime';
import type { Episode } from '../../types/episode';
import { detectHostName } from '../../lib/downloads';
import {
  Download,
  FolderArchive,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  CheckCircle2,
  X,
  FileText,
  Loader2,
  Check,
} from 'lucide-react';

interface AdminDownloadsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminDownloadsView: React.FC<AdminDownloadsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { isAdmin } = useAuth();

  // Anime selection
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loadingAnimes, setLoadingAnimes] = useState(true);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  // Season selection
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);

  // Zip downloads state
  const [zipPackages, setZipPackages] = useState<ZipDownloadPackage[]>([]);
  const [savingZips, setSavingZips] = useState(false);

  // Episodes downloads state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [savingEpId, setSavingEpId] = useState<string | null>(null);
  const [savedSuccessEpId, setSavedSuccessEpId] = useState<string | null>(null);
  const [savingAllEpisodes, setSavingAllEpisodes] = useState(false);

  // Local editable episode download links map (720p and 1080p)
  // Key: episodeId -> { '720p': { url, size }, '1080p': { url, size } }
  const [epDownloadsMap, setEpDownloadsMap] = useState<
    Record<
      string,
      Record<'720p' | '1080p', { url: string; size: string }>
    >
  >({});

  // Bulk paste modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTargetQuality, setBulkTargetQuality] = useState<'1080p' | '720p'>('1080p');
  const [bulkLinksText, setBulkLinksText] = useState('');

  // 1. Fetch anime list
  useEffect(() => {
    const fetchAnimes = async () => {
      try {
        setLoadingAnimes(true);
        const list = await getAllAnimes();
        setAnimes(list);
        if (list.length > 0) {
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const p = params?.get('animeId') || params?.get('id') || params?.get('slug');
          const qSeason = params?.get('season');

          const matched = p ? list.find((a) => a.id === p || a.slug === p) : null;
          const initialAnime = matched || list[0];
          setSelectedAnimeId(initialAnime.id || initialAnime.slug);
          setSelectedAnime(initialAnime);

          if (qSeason) {
            setSelectedSeasonNumber(parseInt(qSeason, 10) || 1);
          }
        }
      } catch (err) {
        console.error('Error fetching animes for downloads:', err);
      } finally {
        setLoadingAnimes(false);
      }
    };
    fetchAnimes();
  }, []);

  // 2. When selectedAnimeId or season changes, load anime details, zips, and episodes
  useEffect(() => {
    if (!selectedAnimeId) return;

    const currentAnime = animes.find(
      (a) => a.id === selectedAnimeId || a.slug === selectedAnimeId
    );
    if (currentAnime) {
      setSelectedAnime(currentAnime);

      // Load Zip packages for this season
      const currentSeasonZips = (currentAnime.zipDownloads || []).filter(
        (z) => Number(z.seasonNumber || 1) === Number(selectedSeasonNumber)
      );

      // If empty but anime has legacy downloadBatchUrl or downloadUrl, provide default slot
      if (currentSeasonZips.length === 0 && (currentAnime.downloadBatchUrl || currentAnime.downloadUrl)) {
        setZipPackages([
          {
            id: `zip-default-${Date.now()}`,
            title: `Season ${selectedSeasonNumber} Complete Batch [1080p]`,
            seasonNumber: selectedSeasonNumber,
            url: currentAnime.downloadBatchUrl || currentAnime.downloadUrl || '',
            size: '3.2 GB',
            quality: '1080p Full HD',
            host: 'MegaCloud',
          },
        ]);
      } else {
        setZipPackages(currentSeasonZips);
      }
    }

    // Load episodes
    const loadEpisodes = async () => {
      try {
        setLoadingEpisodes(true);
        const targetId = currentAnime?.id || selectedAnimeId;
        const epList = await getAllEpisodesByAnimeId(targetId);
        epList.sort((a, b) => a.episodeNumber - b.episodeNumber);
        setEpisodes(epList);

        // Populate map for 720p and 1080p
        const newMap: Record<
          string,
          Record<'720p' | '1080p', { url: string; size: string }>
        > = {};

        epList.forEach((ep) => {
          if (!ep.id) return;
          const resObj = {
            '720p': { url: '', size: '~240 MB' },
            '1080p': { url: '', size: '~480 MB' },
          };

          if (ep.downloadLinks && ep.downloadLinks.length > 0) {
            ep.downloadLinks.forEach((l) => {
              const q = (l.quality || '').toLowerCase();
              if (q.includes('720')) {
                resObj['720p'] = { url: l.url || '', size: l.size || '~240 MB' };
              } else if (q.includes('1080')) {
                resObj['1080p'] = { url: l.url || '', size: l.size || '~480 MB' };
              }
            });
          }

          // Fallback to ep.downloadUrl if 1080p or 720p is empty
          if (ep.downloadUrl) {
            const epQ = (ep.downloadQuality || '').toLowerCase();
            if (epQ.includes('720') && !resObj['720p'].url) {
              resObj['720p'] = { url: ep.downloadUrl, size: ep.downloadSize || '~240 MB' };
            } else if (!resObj['1080p'].url) {
              resObj['1080p'] = { url: ep.downloadUrl, size: ep.downloadSize || '~480 MB' };
            }
          }

          newMap[ep.id] = resObj;
        });
        setEpDownloadsMap(newMap);
      } catch (err) {
        console.error('Error fetching episodes:', err);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    loadEpisodes();
  }, [selectedAnimeId, animes, selectedSeasonNumber]);

  // Filtered episodes for selected season
  const seasonEpisodes = useMemo(() => {
    return episodes.filter(
      (e) => Number(e.seasonNumber || e.season || 1) === Number(selectedSeasonNumber)
    );
  }, [episodes, selectedSeasonNumber]);

  // Available seasons for this anime
  const seasonNumbers = useMemo(() => {
    if (selectedAnime?.seasonsList && selectedAnime.seasonsList.length > 0) {
      return selectedAnime.seasonsList.map((s) => Number(s.seasonNumber || 1));
    }
    const detected: number[] = Array.from(
      new Set<number>(episodes.map((e) => Number(e.seasonNumber || e.season || 1)))
    ).sort((a: number, b: number) => a - b);
    return detected.length > 0 ? detected : [1];
  }, [selectedAnime, episodes]);

  // =========================================================================
  // ZIP PACKAGES HANDLERS
  // =========================================================================

  const handleAddZipPackage = () => {
    const nextIndex = zipPackages.length + 1;
    const newPkg: ZipDownloadPackage = {
      id: `zip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `Season ${selectedSeasonNumber} Batch [${nextIndex === 1 ? '1080p' : '720p'}]`,
      seasonNumber: selectedSeasonNumber,
      url: '',
      size: nextIndex === 1 ? '3.2 GB' : '1.8 GB',
      quality: nextIndex === 1 ? '1080p Full HD' : '720p HD',
      host: 'MegaCloud',
    };
    setZipPackages([...zipPackages, newPkg]);
  };

  const handleUpdateZipPackage = (index: number, field: keyof ZipDownloadPackage, value: any) => {
    const updated = [...zipPackages];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'url' && value) {
      updated[index].host = detectHostName(value, updated[index].host || 'Direct Cloud');
    }
    setZipPackages(updated);
  };

  const handleRemoveZipPackage = (index: number) => {
    setZipPackages(zipPackages.filter((_, i) => i !== index));
  };

  const handleSaveZipPackages = async () => {
    if (!selectedAnime?.id) return;
    try {
      setSavingZips(true);
      const validZips = zipPackages.filter((p) => p.url.trim());

      // Retain zips of OTHER seasons
      const otherSeasonsZips = (selectedAnime.zipDownloads || []).filter(
        (z) => Number(z.seasonNumber || 1) !== Number(selectedSeasonNumber)
      );
      const combinedZips = [...otherSeasonsZips, ...validZips];

      await updateAnime(selectedAnime.id, {
        zipDownloads: combinedZips,
        downloadBatchUrl: validZips[0]?.url || selectedAnime.downloadBatchUrl || undefined,
        downloadUrl: validZips[1]?.url || validZips[0]?.url || selectedAnime.downloadUrl || undefined,
      });

      onShowMessage(`Saved ${validZips.length} Zip download links for Season ${selectedSeasonNumber}!`);
    } catch (err: any) {
      console.error('Error saving zips:', err);
      onShowMessage(`Failed to save Zip packages: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingZips(false);
    }
  };

  // =========================================================================
  // EPISODE DOWNLOADS HANDLERS
  // =========================================================================

  const handleEpResChange = (
    epId: string,
    res: '720p' | '1080p',
    value: string
  ) => {
    setEpDownloadsMap((prev) => {
      const currentEp = prev[epId] || {
        '720p': { url: '', size: '~240 MB' },
        '1080p': { url: '', size: '~480 MB' },
      };
      return {
        ...prev,
        [epId]: {
          ...currentEp,
          [res]: {
            ...currentEp[res],
            url: value,
          },
        },
      };
    });
  };

  // Save downloads for a single episode
  const handleSaveSingleEpisode = async (ep: Episode) => {
    if (!ep.id) return;
    try {
      setSavingEpId(ep.id);
      const resData = epDownloadsMap[ep.id];
      if (!resData) return;

      const formattedLinks: { quality: string; size?: string; url: string; host?: string }[] = [];

      if (resData['720p'].url.trim()) {
        formattedLinks.push({
          quality: '720p HD',
          size: '~240 MB',
          url: resData['720p'].url.trim(),
          host: detectHostName(resData['720p'].url.trim()),
        });
      }

      if (resData['1080p'].url.trim()) {
        formattedLinks.push({
          quality: '1080p Full HD',
          size: '~480 MB',
          url: resData['1080p'].url.trim(),
          host: detectHostName(resData['1080p'].url.trim()),
        });
      }

      const primary = resData['1080p'].url.trim() || resData['720p'].url.trim();

      await updateEpisode(ep.id, {
        animeId: ep.animeId || selectedAnime?.id || selectedAnime?.slug,
        episodeNumber: ep.episodeNumber,
        seasonNumber: ep.seasonNumber || ep.season || selectedSeasonNumber || 1,
        title: ep.title || `Episode ${ep.episodeNumber}`,
        published: ep.published ?? true,
        downloadLinks: formattedLinks,
        downloadUrl: primary || undefined,
        downloadQuality: primary ? (resData['1080p'].url ? '1080p Full HD' : '720p HD') : undefined,
      });

      setSavedSuccessEpId(ep.id);
      setTimeout(() => setSavedSuccessEpId(null), 2000);
      onShowMessage(`Saved download links for Episode ${ep.episodeNumber}!`);
    } catch (err: any) {
      console.error('Error saving episode download:', err);
      onShowMessage(`Failed to save Episode ${ep.episodeNumber}: ${err?.message}`);
    } finally {
      setSavingEpId(null);
    }
  };

  // Save downloads for ALL season episodes in one click
  const handleSaveAllSeasonEpisodes = async () => {
    try {
      setSavingAllEpisodes(true);
      let count = 0;

      for (const ep of seasonEpisodes) {
        if (!ep.id) continue;
        const resData = epDownloadsMap[ep.id];
        if (!resData) continue;

        const formattedLinks: { quality: string; size?: string; url: string; host?: string }[] = [];

        if (resData['720p']?.url.trim()) {
          formattedLinks.push({
            quality: '720p HD',
            size: '~240 MB',
            url: resData['720p'].url.trim(),
            host: detectHostName(resData['720p'].url.trim()),
          });
        }

        if (resData['1080p']?.url.trim()) {
          formattedLinks.push({
            quality: '1080p Full HD',
            size: '~480 MB',
            url: resData['1080p'].url.trim(),
            host: detectHostName(resData['1080p'].url.trim()),
          });
        }

        const primary = resData['1080p']?.url.trim() || resData['720p']?.url.trim();

        await updateEpisode(ep.id, {
          animeId: ep.animeId || selectedAnime?.id || selectedAnime?.slug,
          episodeNumber: ep.episodeNumber,
          seasonNumber: ep.seasonNumber || ep.season || selectedSeasonNumber || 1,
          title: ep.title || `Episode ${ep.episodeNumber}`,
          published: ep.published ?? true,
          downloadLinks: formattedLinks,
          downloadUrl: primary || undefined,
          downloadQuality: primary ? '1080p Full HD' : undefined,
        });
        count++;
      }

      onShowMessage(`Saved download links for all ${count} episodes!`);
    } catch (err: any) {
      console.error('Error saving all episodes:', err);
      onShowMessage(`Failed to save all: ${err?.message}`);
    } finally {
      setSavingAllEpisodes(false);
    }
  };

  // Quick Add Next Episode Slot
  const handleAddNextEpisodeSlot = async () => {
    if (!selectedAnime?.id) return;
    try {
      const highestEp = seasonEpisodes.reduce((max, e) => Math.max(max, e.episodeNumber), 0);
      const nextNum = highestEp + 1;

      const newId = await createEpisode({
        animeId: selectedAnime.id,
        episodeNumber: nextNum,
        seasonNumber: selectedSeasonNumber,
        season: selectedSeasonNumber,
        title: `Episode ${nextNum}`,
        published: true,
        downloadLinks: [],
        thumbnail: selectedAnime.banner || selectedAnime.poster || '',
      });

      const newEp: Episode = {
        id: newId,
        animeId: selectedAnime.id,
        episodeNumber: nextNum,
        seasonNumber: selectedSeasonNumber,
        title: `Episode ${nextNum}`,
        published: true,
        downloadLinks: [],
        thumbnail: selectedAnime.banner || selectedAnime.poster || '',
      };

      setEpisodes((prev) => [...prev, newEp].sort((a, b) => a.episodeNumber - b.episodeNumber));
      setEpDownloadsMap((prev) => ({
        ...prev,
        [newId]: {
          '720p': { url: '', size: '~240 MB' },
          '1080p': { url: '', size: '~480 MB' },
        },
      }));

      onShowMessage(`Created Episode ${nextNum} slot!`);
    } catch (err: any) {
      onShowMessage(`Failed to create episode: ${err?.message}`);
    }
  };

  // Bulk Apply URLs line-by-line
  const handleApplyBulkUrls = () => {
    const lines = bulkLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      onShowMessage('Please paste at least one URL.');
      return;
    }

    setEpDownloadsMap((prev) => {
      const updated = { ...prev };
      seasonEpisodes.forEach((ep, idx) => {
        if (!ep.id || idx >= lines.length) return;
        const currentEp = updated[ep.id] || {
          '720p': { url: '', size: '~240 MB' },
          '1080p': { url: '', size: '~480 MB' },
        };

        updated[ep.id] = {
          ...currentEp,
          [bulkTargetQuality]: {
            url: lines[idx],
            size: bulkTargetQuality === '1080p' ? '~480 MB' : '~240 MB',
          },
        };
      });
      return updated;
    });

    onShowMessage(`Applied ${lines.length} ${bulkTargetQuality} links! Click "Save All" to save.`);
    setBulkModalOpen(false);
    setBulkLinksText('');
  };

  return (
    <AdminLayout
      currentTab="downloads"
      navigate={navigate}
      onShowMessage={onShowMessage}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              Downloads
            </h1>
          </div>

          {selectedAnime && (
            <button
              type="button"
              onClick={() =>
                navigate(`/anime/${selectedAnime.slug || selectedAnime.id}/download`)
              }
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View User Download Page</span>
            </button>
          )}
        </div>

        {/* Anime & Season Selector Bar */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Anime Dropdown */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedAnime?.poster && (
              <img
                src={selectedAnime.poster}
                alt={selectedAnime.title}
                className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
              />
            )}
            <div className="space-y-1 flex-1 min-w-0">
              <label className="text-[11px] font-bold text-[#94A3B8]">Select Anime</label>
              <select
                value={selectedAnimeId}
                onChange={(e) => setSelectedAnimeId(e.target.value)}
                className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-semibold"
              >
                {animes.map((a) => (
                  <option key={a.id || a.slug} value={a.id || a.slug}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Season Selector */}
          <div className="space-y-1 shrink-0">
            <label className="text-[11px] font-bold text-[#94A3B8]">Season</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {seasonNumbers.map((sNum) => (
                <button
                  key={sNum}
                  type="button"
                  onClick={() => setSelectedSeasonNumber(sNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSeasonNumber === sNum
                      ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                      : 'bg-[#050A14] hover:bg-white/5 text-[#94A3B8] hover:text-white border border-white/10'
                  }`}
                >
                  Season {sNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const nextS = Math.max(...seasonNumbers, 0) + 1;
                  setSelectedSeasonNumber(nextS);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#050A14] hover:bg-white/5 text-[#94A3B8] hover:text-white border border-white/10 flex items-center gap-1 cursor-pointer"
                title="Add Season"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Season</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: BATCH / ZIP DOWNLOADS (Clean & Simple)
           ========================================================================= */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">
                Season {selectedSeasonNumber} Batch / Zip Downloads
              </h2>
              <span className="text-xs text-[#94A3B8]">({zipPackages.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddZipPackage}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Zip</span>
              </button>

              <button
                type="button"
                onClick={handleSaveZipPackages}
                disabled={savingZips}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingZips ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Zips</span>
              </button>
            </div>
          </div>

          {zipPackages.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#64748B] bg-[#050A14] rounded-xl border border-white/5">
              No zip packages for Season {selectedSeasonNumber}. Click &quot;Add Zip&quot; to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {zipPackages.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  className="bg-[#050A14] border border-white/10 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={pkg.title}
                    onChange={(e) => handleUpdateZipPackage(idx, 'title', e.target.value)}
                    placeholder="Zip Title (e.g. Season 1 Batch [1080p])"
                    className="w-full md:w-56 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none focus:border-amber-500"
                  />

                  <input
                    type="url"
                    value={pkg.url}
                    onChange={(e) => handleUpdateZipPackage(idx, 'url', e.target.value)}
                    placeholder="Zip Download URL (Mega, Drive, etc.)"
                    className="flex-1 min-w-0 bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                  />

                  <input
                    type="text"
                    value={pkg.quality || ''}
                    onChange={(e) => handleUpdateZipPackage(idx, 'quality', e.target.value)}
                    placeholder="Quality (1080p)"
                    className="w-full md:w-24 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />

                  <input
                    type="text"
                    value={pkg.size || ''}
                    onChange={(e) => handleUpdateZipPackage(idx, 'size', e.target.value)}
                    placeholder="Size (3.2 GB)"
                    className="w-full md:w-24 bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveZipPackage(idx)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer self-end md:self-auto shrink-0"
                    title="Delete Zip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: EPISODE DOWNLOADS (720p & 1080p - Clean & Simple)
           ========================================================================= */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                Season {selectedSeasonNumber} Episode Downloads
              </h2>
              <span className="text-xs text-[#94A3B8]">({seasonEpisodes.length} Episodes)</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Multiple Links</span>
              </button>

              <button
                type="button"
                onClick={handleAddNextEpisodeSlot}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Episode</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllSeasonEpisodes}
                disabled={savingAllEpisodes}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingAllEpisodes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save All</span>
              </button>
            </div>
          </div>

          {loadingEpisodes ? (
            <div className="p-8 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading episodes...</span>
            </div>
          ) : seasonEpisodes.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B] bg-[#050A14] rounded-xl border border-white/5 space-y-3">
              <p>No episodes found for Season {selectedSeasonNumber}.</p>
              <button
                type="button"
                onClick={handleAddNextEpisodeSlot}
                className="px-3 py-1.5 bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Create Episode 1
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden md:flex items-center gap-2.5 px-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <span className="w-32">Episode</span>
                <span className="flex-1">720p HD Download URL</span>
                <span className="flex-1">1080p Ultra HD Download URL</span>
                <span className="w-16 text-right">Save</span>
              </div>

              {/* Episode rows */}
              {seasonEpisodes.map((ep) => {
                const mapData = ep.id ? epDownloadsMap[ep.id] : null;
                const isSaving = savingEpId === ep.id;
                const isSaved = savedSuccessEpId === ep.id;

                return (
                  <div
                    key={ep.id}
                    className="bg-[#050A14] border border-white/10 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-2.5"
                  >
                    {/* Ep info */}
                    <div className="w-full md:w-32 shrink-0 flex items-center justify-between md:justify-start gap-2">
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold rounded">
                        EP {ep.episodeNumber}
                      </span>
                      <span className="text-xs text-[#94A3B8] truncate md:max-w-[80px]">
                        {ep.title || `Ep ${ep.episodeNumber}`}
                      </span>
                    </div>

                    {/* 720p URL */}
                    <div className="flex-1 min-w-0 space-y-1 md:space-y-0">
                      <label className="text-[10px] text-[#64748B] md:hidden">720p Link:</label>
                      <input
                        type="url"
                        value={mapData?.['720p']?.url || ''}
                        onChange={(e) => ep.id && handleEpResChange(ep.id, '720p', e.target.value)}
                        placeholder="720p Download URL"
                        className="w-full bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* 1080p URL */}
                    <div className="flex-1 min-w-0 space-y-1 md:space-y-0">
                      <label className="text-[10px] text-[#64748B] md:hidden">1080p Link:</label>
                      <input
                        type="url"
                        value={mapData?.['1080p']?.url || ''}
                        onChange={(e) => ep.id && handleEpResChange(ep.id, '1080p', e.target.value)}
                        placeholder="1080p Download URL"
                        className="w-full bg-[#0B1322] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="w-full md:w-16 flex justify-end shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSaveSingleEpisode(ep)}
                        disabled={isSaving}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 w-full md:w-auto ${
                          isSaved
                            ? 'bg-emerald-500 text-black font-extrabold'
                            : 'bg-white/5 hover:bg-cyan-500 hover:text-black text-[#94A3B8] border border-white/10'
                        }`}
                        title="Save Episode"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isSaved ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span className="md:hidden ml-1">Save</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            BULK PASTE MODAL (Clean & Simple)
           ========================================================================= */}
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#0B1322] border border-white/10 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Paste Multiple Download Links</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="p-1 rounded-lg text-[#94A3B8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Choose Quality */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Target Quality</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkTargetQuality('1080p')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      bulkTargetQuality === '1080p'
                        ? 'bg-cyan-500 text-black font-extrabold'
                        : 'bg-[#050A14] text-[#94A3B8] border border-white/10'
                    }`}
                  >
                    1080p Full HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTargetQuality('720p')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      bulkTargetQuality === '720p'
                        ? 'bg-cyan-500 text-black font-extrabold'
                        : 'bg-[#050A14] text-[#94A3B8] border border-white/10'
                    }`}
                  >
                    720p HD
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">
                  Paste URLs (1 link per line, starting from Episode 1)
                </label>
                <textarea
                  rows={8}
                  value={bulkLinksText}
                  onChange={(e) => setBulkLinksText(e.target.value)}
                  placeholder="https://mega.nz/file/ep1...&#10;https://mega.nz/file/ep2...&#10;https://mega.nz/file/ep3..."
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-white bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkUrls}
                  className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-black bg-cyan-500 hover:bg-cyan-400 cursor-pointer"
                >
                  Apply Links
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
