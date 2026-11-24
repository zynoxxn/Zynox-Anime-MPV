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
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminSelect,
  AdminStickySaveBar,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
  AdminConfirmDialog,
  AdminCopyInput,
} from '../../components/admin';
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
  Check,
  RefreshCw,
  Sparkles,
  Clipboard,
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
  const [epDownloadsMap, setEpDownloadsMap] = useState<
    Record<
      string,
      Record<'720p' | '1080p', { url: string; size: string }>
    >
  >({});

  // Bulk paste drawer state
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

      const currentSeasonZips = (currentAnime.zipDownloads || []).filter(
        (z) => Number(z.seasonNumber || 1) === Number(selectedSeasonNumber)
      );

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

    const loadEpisodes = async () => {
      try {
        setLoadingEpisodes(true);
        const targetId = currentAnime?.id || selectedAnimeId;
        const epList = await getAllEpisodesByAnimeId(targetId);
        setEpisodes(epList);

        // Prepopulate epDownloadsMap
        const newMap: Record<
          string,
          Record<'720p' | '1080p', { url: string; size: string }>
        > = {};

        epList.forEach((ep) => {
          if (!ep.id) return;
          const links = ep.downloadLinks || [];

          let link720 = links.find(
            (l) => l.quality && l.quality.toLowerCase().includes('720')
          );
          let link1080 = links.find(
            (l) => l.quality && l.quality.toLowerCase().includes('1080')
          );

          if (ep.downloadUrl) {
            if (ep.downloadQuality && ep.downloadQuality.includes('720')) {
              if (!link720) {
                link720 = { quality: '720p HD', url: ep.downloadUrl, size: '~240 MB' };
              }
            } else if (!link1080) {
              link1080 = { quality: '1080p Full HD', url: ep.downloadUrl, size: '~480 MB' };
            }
          }

          newMap[ep.id] = {
            '720p': {
              url: link720?.url || '',
              size: link720?.size || '~240 MB',
            },
            '1080p': {
              url: link1080?.url || '',
              size: link1080?.size || '~480 MB',
            },
          };
        });

        setEpDownloadsMap(newMap);
      } catch (err) {
        console.error('Error fetching episodes for downloads:', err);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    loadEpisodes();
  }, [selectedAnimeId, selectedSeasonNumber, animes]);

  // Compute available seasons
  const seasonNumbers = useMemo(() => {
    if (!selectedAnime) return [1];
    const seasons = new Set<number>();
    if (selectedAnime.seasonsList && selectedAnime.seasonsList.length > 0) {
      selectedAnime.seasonsList.forEach((s) => seasons.add(Number(s.seasonNumber) || 1));
    }
    episodes.forEach((ep) => {
      const sNum = ep.seasonNumber || ep.season || 1;
      seasons.add(Number(sNum));
    });
    seasons.add(selectedSeasonNumber);
    return Array.from(seasons).sort((a, b) => a - b);
  }, [selectedAnime, episodes, selectedSeasonNumber]);

  // Episodes belonging to current selected season
  const seasonEpisodes = useMemo(() => {
    return episodes
      .filter((ep) => {
        const s = ep.seasonNumber || ep.season || 1;
        return Number(s) === Number(selectedSeasonNumber);
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [episodes, selectedSeasonNumber]);

  // Zip package handlers
  const handleAddZipPackage = () => {
    setZipPackages((prev) => [
      ...prev,
      {
        id: `zip-${Date.now()}`,
        title: `Season ${selectedSeasonNumber} Batch [1080p]`,
        seasonNumber: selectedSeasonNumber,
        url: '',
        size: '3.5 GB',
        quality: '1080p Full HD',
        host: 'MegaCloud',
      },
    ]);
  };

  const handleUpdateZipPackage = (
    index: number,
    field: keyof ZipDownloadPackage,
    value: any
  ) => {
    setZipPackages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'url' && value) {
        copy[index].host = detectHostName(value);
      }
      return copy;
    });
  };

  const handleRemoveZipPackage = (index: number) => {
    setZipPackages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveZipPackages = async () => {
    if (!selectedAnime?.id) return;
    try {
      setSavingZips(true);
      const otherSeasonsZips = (selectedAnime.zipDownloads || []).filter(
        (z) => Number(z.seasonNumber || 1) !== Number(selectedSeasonNumber)
      );
      const updatedAllZips = [...otherSeasonsZips, ...zipPackages];

      await updateAnime(selectedAnime.id, {
        zipDownloads: updatedAllZips,
        downloadBatchUrl: zipPackages[0]?.url || selectedAnime.downloadBatchUrl || undefined,
      });

      setSelectedAnime((prev) =>
        prev ? { ...prev, zipDownloads: updatedAllZips } : prev
      );

      onShowMessage(`Saved Season ${selectedSeasonNumber} zip downloads!`);
    } catch (err: any) {
      console.error('Error saving zip packages:', err);
      onShowMessage(`Failed to save zips: ${err?.message}`);
    } finally {
      setSavingZips(false);
    }
  };

  // Episode link editing handler
  const handleUpdateEpDownload = (
    epId: string,
    quality: '720p' | '1080p',
    value: string
  ) => {
    setEpDownloadsMap((prev) => {
      const current = prev[epId] || {
        '720p': { url: '', size: '~240 MB' },
        '1080p': { url: '', size: '~480 MB' },
      };
      return {
        ...prev,
        [epId]: {
          ...current,
          [quality]: {
            ...current[quality],
            url: value,
          },
        },
      };
    });
  };

  // Save single episode
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

  // Save all season episodes
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
          downloadQuality: primary ? (resData['1080p']?.url.trim() ? '1080p Full HD' : '720p HD') : undefined,
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

  // Add next episode slot
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

  // Bulk Apply URLs
  const handleApplyBulkUrls = (andSaveNow: boolean = false) => {
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

    if (andSaveNow) {
      onShowMessage(`Applied ${lines.length} ${bulkTargetQuality} links. Saving now...`);
      setBulkModalOpen(false);
      setBulkLinksText('');
      setTimeout(() => {
        handleSaveAllSeasonEpisodes();
      }, 100);
    } else {
      onShowMessage(`Applied ${lines.length} ${bulkTargetQuality} links.`);
      setBulkModalOpen(false);
      setBulkLinksText('');
    }
  };

  return (
    <AdminLayout
      currentTab="downloads"
      navigate={navigate}
      onShowMessage={onShowMessage}
    >
      <div className="space-y-6 min-w-0 pb-24">
        {/* Header (Save is in the Sticky Save Bar) */}
        <AdminPageHeader
          title="Downloads & Packages"
          description={selectedAnime ? `${selectedAnime.title} — Season ${selectedSeasonNumber}` : 'Configure zip batches and episode download mirrors'}
          secondaryActions={[
            ...(selectedAnime
              ? [
                  {
                    label: 'View download page',
                    icon: ExternalLink,
                    onClick: () =>
                      navigate(`/anime/${selectedAnime.slug || selectedAnime.id}/download`),
                  },
                ]
              : []),
            {
              label: 'Paste links',
              icon: Sparkles,
              onClick: () => setBulkModalOpen(true),
            },
          ]}
        />

        {/* Anime & Season Selector Box */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-8">
              <AdminSelect
                label="Target Anime"
                value={selectedAnimeId}
                onChange={(val) => setSelectedAnimeId(String(val))}
                options={animes.map((a) => ({
                  value: a.id || a.slug,
                  label: `${a.title} (${a.year || '2026'})`,
                }))}
                sheetTitle="Choose Anime Title"
              />
            </div>

            <div className="sm:col-span-4 flex items-center justify-end">
              <button
                type="button"
                onClick={handleAddNextEpisodeSlot}
                className="h-11 px-3.5 w-full rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#1E88FF]" />
                <span>Add Episode Slot</span>
              </button>
            </div>
          </div>

          {/* Season Segmented Tabs */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <AdminSegmentedTabs
                tabs={seasonNumbers.map((sNum) => ({
                  id: String(sNum),
                  label: `Season ${sNum}`,
                }))}
                activeTab={String(selectedSeasonNumber)}
                onChange={(val) => setSelectedSeasonNumber(Number(val))}
              />

              <button
                type="button"
                onClick={() => {
                  const nextS = Math.max(...seasonNumbers, 0) + 1;
                  setSelectedSeasonNumber(nextS);
                }}
                className="h-9 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Season</span>
              </button>
            </div>

            <span className="text-xs text-[#94A3B8]">
              {seasonEpisodes.length} episodes loaded in Season {selectedSeasonNumber}
            </span>
          </div>
        </div>

        {/* Section 1: Batch / Zip Downloads */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-[#1E88FF]" />
              <h2 className="text-sm font-semibold text-white">
                Season {selectedSeasonNumber} Complete Batch Archives ({zipPackages.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddZipPackage}
                className="h-8 px-2.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add batch zip</span>
              </button>

              <button
                type="button"
                onClick={handleSaveZipPackages}
                disabled={savingZips}
                className="h-8 px-3 rounded-[8px] bg-[#1E88FF]/15 hover:bg-[#1E88FF]/25 border border-[#1E88FF]/30 text-[#1E88FF] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
              >
                {savingZips ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>Save zips</span>
              </button>
            </div>
          </div>

          {zipPackages.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#101A30] rounded-[10px] border border-white/5">
              No complete batch zip added for Season {selectedSeasonNumber}. Click &quot;Add batch zip&quot; to provide one.
            </div>
          ) : (
            <div className="space-y-2.5">
              {zipPackages.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  className="bg-[#101A30] border border-white/5 rounded-[10px] p-3 flex flex-col md:flex-row md:items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={pkg.title}
                    onChange={(e) => handleUpdateZipPackage(idx, 'title', e.target.value)}
                    placeholder="Zip Title (e.g. Season 1 Batch [1080p])"
                    className="w-full md:w-56 h-10 bg-[#0B1324] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                  />

                  <div className="relative flex-1 min-w-0">
                    <input
                      type="url"
                      value={pkg.url}
                      onChange={(e) => handleUpdateZipPackage(idx, 'url', e.target.value)}
                      placeholder="Zip Download URL (Mega, Drive, etc.)"
                      className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-9 text-[13px] font-mono text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard?.readText();
                          if (text) handleUpdateZipPackage(idx, 'url', text);
                        } catch {}
                      }}
                      className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                      title="Paste URL"
                    >
                      <Clipboard className="w-3 h-3" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={pkg.size || ''}
                    onChange={(e) => handleUpdateZipPackage(idx, 'size', e.target.value)}
                    placeholder="Size (3.5 GB)"
                    className="w-24 h-10 bg-[#0B1324] border border-white/10 rounded-[8px] px-2.5 text-xs text-white outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveZipPackage(idx)}
                    className="w-10 h-10 rounded-[8px] hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Remove zip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Episode Download Mirrors Table */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#1E88FF]" />
              <h2 className="text-sm font-semibold text-white">
                Season {selectedSeasonNumber} Episode Downloads ({seasonEpisodes.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="h-8 px-2.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1E88FF]" />
              <span>Bulk paste</span>
            </button>
          </div>

          {loadingEpisodes ? (
            <div className="p-6 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : seasonEpisodes.length === 0 ? (
            <div className="p-8">
              <AdminEmptyState
                icon={Download}
                title="No episodes in this season"
                description="Add episode slots using the button above to begin uploading download mirrors."
                actionLabel="Add episode slot"
                onAction={handleAddNextEpisodeSlot}
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {seasonEpisodes.map((ep) => {
                if (!ep.id) return null;
                const epData = epDownloadsMap[ep.id] || {
                  '720p': { url: '', size: '~240 MB' },
                  '1080p': { url: '', size: '~480 MB' },
                };
                const isSavingThis = savingEpId === ep.id;
                const isSuccessThis = savedSuccessEpId === ep.id;

                return (
                  <div
                    key={ep.id}
                    className="p-3.5 sm:p-4 space-y-2 hover:bg-white/[0.01] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-14 h-8 rounded-[6px] bg-[#101A30] border border-white/10 text-xs font-bold text-white font-mono flex items-center justify-center shrink-0">
                          EP {ep.episodeNumber}
                        </span>
                        <span className="text-xs font-medium text-white truncate">
                          {ep.title || `Episode ${ep.episodeNumber}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSuccessThis && (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Saved
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSaveSingleEpisode(ep)}
                          className="h-8 px-2.5 rounded-[6px] bg-[#1E88FF]/15 hover:bg-[#1E88FF]/25 border border-[#1E88FF]/30 text-[#1E88FF] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {isSavingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>

                    {/* 1080p & 720p URL Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="url"
                          value={epData['1080p'].url}
                          onChange={(e) => handleUpdateEpDownload(ep.id!, '1080p', e.target.value)}
                          placeholder="1080p Download URL (Mega, Drive, etc.)"
                          className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-9 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard?.readText();
                              if (text) handleUpdateEpDownload(ep.id!, '1080p', text);
                            } catch {}
                          }}
                          className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                          title="Paste URL"
                        >
                          <Clipboard className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="url"
                          value={epData['720p'].url}
                          onChange={(e) => handleUpdateEpDownload(ep.id!, '720p', e.target.value)}
                          placeholder="720p Download URL (Mega, Drive, etc.)"
                          className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-9 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard?.readText();
                              if (text) handleUpdateEpDownload(ep.id!, '720p', text);
                            } catch {}
                          }}
                          className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                          title="Paste URL"
                        >
                          <Clipboard className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Save Bar */}
        {seasonEpisodes.length > 0 && (
          <AdminStickySaveBar
            message={`Season ${selectedSeasonNumber} · ${seasonEpisodes.length} episodes configured`}
            saveLabel="Save all episodes"
            saving={savingAllEpisodes}
            onSave={handleSaveAllSeasonEpisodes}
            showDiscard={false}
          />
        )}

        {/* Bulk Paste Modal */}
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0B1324] border border-white/15 rounded-[12px] p-5 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1E88FF]" />
                  <h3 className="text-sm font-semibold text-white">
                    Bulk Paste Download Links
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#CBD5E1]">Target Quality:</label>
                <div className="flex items-center gap-1.5">
                  {(['1080p', '720p'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setBulkTargetQuality(q)}
                      className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
                        bulkTargetQuality === q
                          ? 'bg-[#1E88FF] text-white'
                          : 'bg-white/5 text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={7}
                value={bulkLinksText}
                onChange={(e) => setBulkLinksText(e.target.value)}
                placeholder="Paste links line by line:&#10;https://drive.google.com/file/d/ep1...&#10;https://drive.google.com/file/d/ep2...&#10;https://drive.google.com/file/d/ep3..."
                className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-xs font-mono text-white outline-none"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="h-10 px-4 rounded-[10px] border border-white/10 text-[#CBD5E1] text-xs font-medium hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkUrls(false)}
                  className="h-10 px-4 rounded-[10px] border border-[#1E88FF]/30 text-[#1E88FF] text-xs font-semibold hover:bg-[#1E88FF]/10 transition-colors cursor-pointer"
                >
                  Apply to rows
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkUrls(true)}
                  className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Apply & save now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
