import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import type { Anime, AnimeSeasonEntry } from '../../types/anime';
import { getAllAnimes, updateAnime } from '../../lib/firestore/anime';
import {
  bulkCreateEpisodes,
  getAllEpisodesByAnimeId,
  deleteEpisodesBySeason,
  type BulkEpisodeItemInput,
} from '../../lib/firestore/episodes';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminSelect,
  AdminStickySaveBar,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
  AdminStatusBadge,
  AdminCopyInput,
} from '../../components/admin';
import {
  Tv,
  Film,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Trash2,
  RefreshCw,
  ExternalLink,
  Plus,
  Check,
  Play,
  Save,
  Clipboard,
  X,
} from 'lucide-react';

interface AdminBulkEpisodeViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export interface SeasonEpisodeRow {
  episodeNumber: number;
  title: string;
  embedUrl: string;
  downloadUrl: string;
  isExistingInDb?: boolean;
  existingId?: string;
}

export const AdminBulkEpisodeView: React.FC<AdminBulkEpisodeViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const qAnimeId = searchParams.get('animeId');
  const qSeason = searchParams.get('season');

  // Anime selection states
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loadingAnimes, setLoadingAnimes] = useState<boolean>(true);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>(qAnimeId || '');
  const [seasonNumber, setSeasonNumber] = useState<number>(qSeason ? parseInt(qSeason, 10) || 1 : 1);
  const [totalEpisodesCount, setTotalEpisodesCount] = useState<number>(12);

  // Default meta for this batch
  const [defaultLanguage, setDefaultLanguage] = useState<string>('Hindi Dub');
  const [defaultQuality, setDefaultQuality] = useState<string>('1080p');
  const [defaultPublished, setDefaultPublished] = useState<boolean>(true);

  // Episode rows list
  const [episodeRows, setEpisodeRows] = useState<SeasonEpisodeRow[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);

  // Quick Multi-Paste helper state
  const [showMultiPaste, setShowMultiPaste] = useState<boolean>(false);
  const [pasteEmbedUrls, setPasteEmbedUrls] = useState<string>('');
  const [pasteDownloadUrls, setPasteDownloadUrls] = useState<string>('');

  // Confirmation dialogs
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteSeasonConfirm, setShowDeleteSeasonConfirm] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [savingRowIdx, setSavingRowIdx] = useState<number | null>(null);

  // Load all animes on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingAnimes(true);
        const list = await getAllAnimes();
        const sorted = [...list].sort((a, b) => a.title.localeCompare(b.title));
        setAnimes(sorted);

        // Auto-select first anime if none selected
        if (!selectedAnimeId && sorted.length > 0) {
          setSelectedAnimeId(sorted[0].id || sorted[0].slug || '');
        }
      } catch (err) {
        console.error('Failed to load anime catalog:', err);
        onShowMessage('Failed to load anime list.');
      } finally {
        setLoadingAnimes(false);
      }
    }
    loadCatalog();
  }, []);

  // Currently selected anime
  const selectedAnime = useMemo(() => {
    if (!selectedAnimeId) return null;
    return (
      animes.find((a) => a.id === selectedAnimeId || a.slug === selectedAnimeId) || null
    );
  }, [animes, selectedAnimeId]);

  // Compute available seasons for selected anime
  const availableSeasons: AnimeSeasonEntry[] = useMemo(() => {
    if (!selectedAnime) return [];
    if (selectedAnime.seasonsList && selectedAnime.seasonsList.length > 0) {
      return [...selectedAnime.seasonsList].sort((a, b) => a.seasonNumber - b.seasonNumber);
    }
    return [
      {
        id: 's1',
        seasonNumber: 1,
        title: 'Season 1',
        totalEpisodes: selectedAnime.totalEpisodes || 12,
        status: selectedAnime.status || 'ongoing',
      },
    ];
  }, [selectedAnime]);

  // When selected anime or seasonNumber changes, figure out total episodes & load existing episodes
  useEffect(() => {
    if (!selectedAnimeId) return;

    let isSubscribed = true;

    async function loadSeasonEpisodes() {
      setLoadingEpisodes(true);

      try {
        const currentSeasonEntry = availableSeasons.find(
          (s) => s.seasonNumber === seasonNumber
        );
        const seasonTargetEpisodes =
          currentSeasonEntry?.totalEpisodes && currentSeasonEntry.totalEpisodes > 0
            ? currentSeasonEntry.totalEpisodes
            : selectedAnime?.totalEpisodes && seasonNumber === 1
            ? selectedAnime.totalEpisodes
            : 12;

        setTotalEpisodesCount(seasonTargetEpisodes);

        const allEps = await getAllEpisodesByAnimeId(selectedAnimeId);

        if (!isSubscribed) return;

        const seasonEps = allEps.filter((ep) => {
          const sNum =
            ep.seasonNumber !== undefined && ep.seasonNumber !== null
              ? Number(ep.seasonNumber)
              : ep.season !== undefined && ep.season !== null
              ? Number(ep.season)
              : 1;
          return sNum === seasonNumber;
        });

        const existingMap = new Map<number, any>();
        seasonEps.forEach((ep) => {
          existingMap.set(Number(ep.episodeNumber), ep);
        });

        const highestExistingEp = seasonEps.reduce(
          (max, ep) => Math.max(max, Number(ep.episodeNumber) || 0),
          0
        );
        const rowCount = Math.max(seasonTargetEpisodes, highestExistingEp, 1);

        const rows: SeasonEpisodeRow[] = [];
        for (let i = 1; i <= rowCount; i++) {
          const existing = existingMap.get(i);
          if (existing) {
            const embed =
              existing.videoUrl ||
              existing.sources?.[0]?.embedUrl ||
              existing.videoSources?.[0]?.embedUrl ||
              '';
            const download =
              existing.downloadUrl ||
              existing.downloadLinks?.[0]?.url ||
              '';

            rows.push({
              episodeNumber: i,
              title: existing.title || `Episode ${i}`,
              embedUrl: embed,
              downloadUrl: download,
              isExistingInDb: true,
              existingId: existing.id,
            });
          } else {
            rows.push({
              episodeNumber: i,
              title: `Episode ${i}`,
              embedUrl: '',
              downloadUrl: '',
              isExistingInDb: false,
            });
          }
        }

        setEpisodeRows(rows);
      } catch (err) {
        console.error('Failed to load season episodes:', err);
        onShowMessage('Failed to load existing episodes for this season.');
      } finally {
        if (isSubscribed) {
          setLoadingEpisodes(false);
        }
      }
    }

    loadSeasonEpisodes();

    return () => {
      isSubscribed = false;
    };
  }, [selectedAnimeId, seasonNumber, availableSeasons]);

  const handleTotalEpisodesChange = (newTotal: number) => {
    const val = Math.max(1, Math.min(200, newTotal));
    setTotalEpisodesCount(val);

    setEpisodeRows((prev) => {
      if (val > prev.length) {
        const newRows: SeasonEpisodeRow[] = [...prev];
        for (let i = prev.length + 1; i <= val; i++) {
          newRows.push({
            episodeNumber: i,
            title: `Episode ${i}`,
            embedUrl: '',
            downloadUrl: '',
            isExistingInDb: false,
          });
        }
        return newRows;
      } else if (val < prev.length) {
        return prev.slice(0, val);
      }
      return prev;
    });
  };

  const updateRowField = (index: number, field: keyof SeasonEpisodeRow, value: any) => {
    setEpisodeRows((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleAddEpisodeSlot = () => {
    setEpisodeRows((prev) => {
      const nextEpNum = prev.length + 1;
      setTotalEpisodesCount(nextEpNum);
      return [
        ...prev,
        {
          episodeNumber: nextEpNum,
          title: `Episode ${nextEpNum}`,
          embedUrl: '',
          downloadUrl: '',
          isExistingInDb: false,
        },
      ];
    });
  };

  const handleRemoveRow = (index: number) => {
    setEpisodeRows((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const reindexed = filtered.map((row, i) => ({
        ...row,
        episodeNumber: i + 1,
      }));
      setTotalEpisodesCount(reindexed.length);
      return reindexed;
    });
  };

  const handleClearUrls = () => {
    setEpisodeRows((prev) =>
      prev.map((row) => ({
        ...row,
        embedUrl: '',
        downloadUrl: '',
      }))
    );
    setShowClearConfirm(false);
    onShowMessage('Cleared all URLs in episode rows.');
  };

  const handleDeleteSeasonFromDb = async () => {
    if (!selectedAnimeId) return;
    try {
      setIsSaving(true);
      await deleteEpisodesBySeason(selectedAnimeId, seasonNumber);
      setEpisodeRows((prev) =>
        prev.map((row) => ({
          ...row,
          embedUrl: '',
          downloadUrl: '',
          isExistingInDb: false,
          existingId: undefined,
        }))
      );
      setShowDeleteSeasonConfirm(false);
      onShowMessage(`Deleted Season ${seasonNumber} episodes from database.`);
    } catch {
      onShowMessage('Failed to delete season from database.');
    } finally {
      setIsSaving(false);
    }
  };

  const detectHost = (url: string): string => {
    const l = url.toLowerCase();
    if (l.includes('drive.google.com')) return 'Google Drive';
    if (l.includes('mega.nz')) return 'Mega';
    if (l.includes('mediafire.com')) return 'Mediafire';
    if (l.includes('t.me') || l.includes('telegram')) return 'Telegram';
    return 'Direct Link';
  };

  const handleApplyMultiPaste = (autoSave = false) => {
    const embedLines = pasteEmbedUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const downloadLines = pasteDownloadUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (embedLines.length === 0 && downloadLines.length === 0) {
      onShowMessage('Paste at least one Embed URL or Download URL.');
      return;
    }

    const neededCount = Math.max(
      episodeRows.length,
      embedLines.length,
      downloadLines.length
    );

    const updatedRows: SeasonEpisodeRow[] = [];
    for (let i = 0; i < neededCount; i++) {
      const epNum = i + 1;
      const existing = episodeRows[i];
      const newEmbed = embedLines[i] || existing?.embedUrl || '';
      const newDownload = downloadLines[i] || existing?.downloadUrl || '';

      updatedRows.push({
        episodeNumber: epNum,
        title: existing?.title || `Episode ${epNum}`,
        embedUrl: newEmbed,
        downloadUrl: newDownload,
        isExistingInDb: existing?.isExistingInDb || false,
        existingId: existing?.existingId,
      });
    }

    setEpisodeRows(updatedRows);
    setTotalEpisodesCount(updatedRows.length);
    setShowMultiPaste(false);
    setPasteEmbedUrls('');
    setPasteDownloadUrls('');

    onShowMessage(`Populated ${updatedRows.length} episode slots.`);

    if (autoSave) {
      handleSaveAllWithRows(updatedRows);
    }
  };

  const handleSaveAllWithRows = async (targetRows: SeasonEpisodeRow[]) => {
    if (!selectedAnimeId || !selectedAnime) {
      onShowMessage('Please select an anime title first.');
      return;
    }

    const validRows = targetRows.filter(
      (r) => r.title.trim() || r.embedUrl.trim() || r.downloadUrl.trim()
    );

    if (validRows.length === 0) {
      onShowMessage('No episodes with links or titles to save.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveProgress('Preparing episodes batch...');

      const payload: BulkEpisodeItemInput[] = targetRows.map((row) => {
        const streamUrl = row.embedUrl.trim();
        const downloadUrl = row.downloadUrl.trim();

        const videoSources = streamUrl
          ? [
              {
                id: 'srv-1',
                serverName: 'Server 1 (Embed)',
                embedUrl: streamUrl,
                quality: defaultQuality,
              },
            ]
          : undefined;

        const sources = streamUrl
          ? [
              {
                id: 'srv-1',
                name: 'Server 1',
                embedUrl: streamUrl,
                quality: defaultQuality,
              },
            ]
          : undefined;

        const downloadLinks = downloadUrl
          ? [
              {
                quality: defaultQuality,
                url: downloadUrl,
                host: detectHost(downloadUrl),
                size: 'HD',
              },
            ]
          : undefined;

        return {
          episodeNumber: row.episodeNumber,
          seasonNumber: seasonNumber,
          season: seasonNumber,
          title: row.title.trim() || `Episode ${row.episodeNumber}`,
          videoUrl: streamUrl || 'https://media.w3.org/2010/05/sintel/trailer.mp4',
          downloadUrl: downloadUrl || undefined,
          videoSources,
          sources,
          downloadLinks,
          language: defaultLanguage,
          quality: defaultQuality,
          published: defaultPublished,
        };
      });

      setSaveProgress(`Writing ${payload.length} episodes to catalog...`);

      const result = await bulkCreateEpisodes(selectedAnimeId, payload, {
        overwriteExisting: true,
        updateAnimeStats: true,
        animeTitle: selectedAnime.title,
        animeSlug: selectedAnime.slug,
        animePoster: selectedAnime.poster || (selectedAnime as any).posterUrl,
        animeBanner: selectedAnime.banner || (selectedAnime as any).bannerUrl,
      });

      // Update Anime's seasonsList with the total episodes if it changed
      try {
        const currentSeasonsList = selectedAnime.seasonsList ? [...selectedAnime.seasonsList] : [];
        const seasonIdx = currentSeasonsList.findIndex((s) => s.seasonNumber === seasonNumber);

        if (seasonIdx >= 0) {
          currentSeasonsList[seasonIdx] = {
            ...currentSeasonsList[seasonIdx],
            totalEpisodes: Math.max(currentSeasonsList[seasonIdx].totalEpisodes || 0, targetRows.length),
          };
        } else {
          currentSeasonsList.push({
            id: `s${seasonNumber}`,
            seasonNumber,
            title: `Season ${seasonNumber}`,
            totalEpisodes: targetRows.length,
            status: 'ongoing',
          });
        }

        const totalCount = currentSeasonsList.reduce((sum, s) => sum + (s.totalEpisodes || 0), 0);

        await updateAnime(selectedAnimeId, {
          seasonsList: currentSeasonsList,
          totalEpisodes: totalCount,
        });
      } catch (err) {
        console.warn('Note: Could not sync seasonsList totalEpisodes:', err);
      }

      if (user?.email) {
        logAdminActivity(
          user.uid || 'admin',
          user.email,
          'BULK_CREATE_EPISODES',
          'episode',
          selectedAnimeId,
          `Saved ${result.added + result.updated} episodes for "${selectedAnime.title}" (Season ${seasonNumber})`
        ).catch(() => {});
      }

      setEpisodeRows((prev) =>
        prev.map((r) => ({
          ...r,
          isExistingInDb: true,
        }))
      );

      onShowMessage(`Successfully saved ${result.added + result.updated} episodes.`);
    } catch (err: any) {
      console.error('Failed to bulk save episodes:', err);
      onShowMessage(err.message || 'Error occurred while saving episodes.');
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  const handleSaveAll = () => {
    handleSaveAllWithRows(episodeRows);
  };

  const handleSaveSingleRow = async (index: number) => {
    if (!selectedAnimeId || !selectedAnime) {
      onShowMessage('Please select an anime title first.');
      return;
    }

    const row = episodeRows[index];
    if (!row) return;

    if (!row.title.trim() && !row.embedUrl.trim() && !row.downloadUrl.trim()) {
      onShowMessage(`Episode ${row.episodeNumber} has no title or links to save.`);
      return;
    }

    try {
      setSavingRowIdx(index);
      const streamUrl = row.embedUrl.trim();
      const downloadUrl = row.downloadUrl.trim();

      const videoSources = streamUrl
        ? [
            {
              id: 'srv-1',
              serverName: 'Server 1 (Embed)',
              embedUrl: streamUrl,
              quality: defaultQuality,
            },
          ]
        : undefined;

      const sources = streamUrl
        ? [
            {
              id: 'srv-1',
              name: 'Server 1',
              embedUrl: streamUrl,
              quality: defaultQuality,
            },
          ]
        : undefined;

      const downloadLinks = downloadUrl
        ? [
            {
              quality: defaultQuality,
              url: downloadUrl,
              host: detectHost(downloadUrl),
              size: 'HD',
            },
          ]
        : undefined;

      const payload: BulkEpisodeItemInput[] = [
        {
          episodeNumber: row.episodeNumber,
          seasonNumber: seasonNumber,
          season: seasonNumber,
          title: row.title.trim() || `Episode ${row.episodeNumber}`,
          videoUrl: streamUrl || 'https://media.w3.org/2010/05/sintel/trailer.mp4',
          downloadUrl: downloadUrl || undefined,
          videoSources,
          sources,
          downloadLinks,
          language: defaultLanguage,
          quality: defaultQuality,
          published: defaultPublished,
        },
      ];

      await bulkCreateEpisodes(selectedAnimeId, payload, {
        overwriteExisting: true,
        updateAnimeStats: true,
        animeTitle: selectedAnime.title,
        animeSlug: selectedAnime.slug,
        animePoster: selectedAnime.poster || (selectedAnime as any).posterUrl,
        animeBanner: selectedAnime.banner || (selectedAnime as any).bannerUrl,
      });

      setEpisodeRows((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], isExistingInDb: true };
        }
        return next;
      });

      onShowMessage(`Saved Episode ${row.episodeNumber}.`);
    } catch {
      onShowMessage(`Failed to save Episode ${row.episodeNumber}.`);
    } finally {
      setSavingRowIdx(null);
    }
  };

  const filledCount = episodeRows.filter(
    (r) => r.embedUrl.trim() || r.downloadUrl.trim()
  ).length;

  return (
    <AdminLayout currentTab="episodes" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-24">
        {/* Page Header (Save is in the Sticky Save Bar) */}
        <AdminPageHeader
          title="Bulk Episode Manager"
          description={selectedAnime ? `${selectedAnime.title} — Season ${seasonNumber} (${episodeRows.length} slots)` : 'Batch import episodes, embed streams, and download mirrors'}
          secondaryActions={[
            {
              label: 'Paste list',
              icon: Sparkles,
              onClick: () => setShowMultiPaste((prev) => !prev),
            },
          ]}
        />

        {/* 1. Target Anime & Season Configuration */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            {/* Anime Selector (7 cols) */}
            <div className="sm:col-span-7">
              <AdminSelect
                label="Target Anime Title"
                value={selectedAnimeId}
                onChange={(val) => {
                  setSelectedAnimeId(String(val));
                  setSeasonNumber(1);
                }}
                options={animes.map((a) => ({
                  value: a.id || a.slug,
                  label: `${a.title} (${a.year || '2026'}) — ${a.totalEpisodes || 0} eps`,
                }))}
                sheetTitle="Choose Anime Title"
              />
            </div>

            {/* Total Episodes (3 cols) */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-white mb-1.5">
                Total Episodes
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={totalEpisodesCount}
                onChange={(e) => handleTotalEpisodesChange(parseInt(e.target.value, 10) || 1)}
                className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-sm text-white font-mono outline-none"
              />
            </div>

            {/* Audio Language (2 cols) */}
            <div className="sm:col-span-2">
              <AdminSelect
                label="Audio"
                value={defaultLanguage}
                onChange={(val) => setDefaultLanguage(String(val))}
                options={[
                  { value: 'Hindi Dub', label: 'Hindi Dub' },
                  { value: 'Japanese Sub', label: 'Japanese Sub' },
                  { value: 'Dual Audio', label: 'Dual Audio' },
                  { value: 'Multi Audio', label: 'Multi Audio' },
                  { value: 'English Dub', label: 'English Dub' },
                ]}
                sheetTitle="Default Audio Language"
              />
            </div>
          </div>

          {/* Season Segmented Tabs */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <AdminSegmentedTabs
                tabs={availableSeasons.map((s) => ({
                  id: String(s.seasonNumber),
                  label: `Season ${s.seasonNumber}`,
                }))}
                activeTab={String(seasonNumber)}
                onChange={(val) => setSeasonNumber(Number(val))}
              />

              <button
                type="button"
                onClick={() => {
                  const nextSeasonNum = Math.max(...availableSeasons.map((s) => s.seasonNumber), seasonNumber) + 1;
                  setSeasonNumber(nextSeasonNum);
                }}
                className="h-9 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Season</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-[#94A3B8] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Clear URLs
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteSeasonConfirm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Delete S{seasonNumber} from DB
              </button>
            </div>
          </div>
        </div>

        {/* 2. Quick Multi-Paste Drawer */}
        {showMultiPaste && (
          <div className="bg-[#0B1324] border border-[#1E88FF]/30 rounded-[12px] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1E88FF]" />
                  <span>Paste link lists</span>
                </h4>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Paste stream and download links line-by-line (one per episode). They will populate Ep 1, Ep 2, Ep 3... sequentially.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMultiPaste(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Embed URLs (1 per line)
                </label>
                <textarea
                  rows={6}
                  value={pasteEmbedUrls}
                  onChange={(e) => setPasteEmbedUrls(e.target.value)}
                  placeholder="https://embed.server.com/ep1&#10;https://embed.server.com/ep2&#10;https://embed.server.com/ep3"
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white">
                  Download URLs (1 per line)
                </label>
                <textarea
                  rows={6}
                  value={pasteDownloadUrls}
                  onChange={(e) => setPasteDownloadUrls(e.target.value)}
                  placeholder="https://mega.nz/file/ep1&#10;https://mega.nz/file/ep2&#10;https://mega.nz/file/ep3"
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowMultiPaste(false)}
                className="h-10 px-4 rounded-[10px] border border-white/10 hover:border-white/20 text-[#CBD5E1] hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyMultiPaste(false)}
                className="h-10 px-4 rounded-[10px] border border-[#1E88FF]/30 hover:border-[#1E88FF] text-[#1E88FF] text-xs font-semibold transition-colors cursor-pointer"
              >
                Apply to rows
              </button>
              <button
                type="button"
                onClick={() => handleApplyMultiPaste(true)}
                className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Apply & save all
              </button>
            </div>
          </div>
        )}

        {/* 3. Episodes Importer Table */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#1E88FF]" />
              <h3 className="text-sm font-semibold text-white">
                Season {seasonNumber} Episodes ({episodeRows.length} slots · {filledCount} with links)
              </h3>
            </div>

            <button
              type="button"
              onClick={handleAddEpisodeSlot}
              className="h-8 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ep {episodeRows.length + 1}</span>
            </button>
          </div>

          {loadingEpisodes ? (
            <div className="p-6 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : episodeRows.length === 0 ? (
            <div className="p-8">
              <AdminEmptyState
                icon={Tv}
                title="No episodes in this season"
                description="Use the button above to add episode slots or paste links."
                actionLabel="Add episode slot"
                onAction={handleAddEpisodeSlot}
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {episodeRows.map((row, idx) => (
                <div
                  key={`ep-row-${row.episodeNumber}`}
                  className="p-3.5 sm:p-4 space-y-2.5 hover:bg-white/[0.01] transition-colors"
                >
                  {/* Row Top Line: Episode badge + title input + actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-14 h-9 rounded-[8px] bg-[#101A30] border border-white/10 text-xs font-bold text-white font-mono flex items-center justify-center shrink-0">
                        EP {row.episodeNumber}
                      </span>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateRowField(idx, 'title', e.target.value)}
                        placeholder={`Episode ${row.episodeNumber}`}
                        className="flex-1 h-9 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs text-white outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <AdminStatusBadge
                        status={row.isExistingInDb ? 'live' : 'draft'}
                        className="shrink-0"
                      />

                      {row.embedUrl && (
                        <a
                          href={row.embedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2 rounded-[6px] bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] hover:text-white flex items-center gap-1 transition-colors"
                          title="Test Stream"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">Stream</span>
                        </a>
                      )}

                      {row.downloadUrl && (
                        <a
                          href={row.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2 rounded-[6px] bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] hover:text-white flex items-center gap-1 transition-colors"
                          title="Test Download"
                        >
                          <Download className="w-3 h-3" />
                          <span className="hidden sm:inline">DL</span>
                        </a>
                      )}

                      <button
                        type="button"
                        disabled={savingRowIdx === idx || isSaving}
                        onClick={() => handleSaveSingleRow(idx)}
                        className="h-8 px-2.5 rounded-[6px] bg-[#1E88FF]/15 hover:bg-[#1E88FF]/25 border border-[#1E88FF]/30 text-[#1E88FF] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                        title={`Save Episode ${row.episodeNumber}`}
                      >
                        {savingRowIdx === idx ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>

                      {episodeRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="w-8 h-8 rounded-[6px] hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remove slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row Bottom: Embed URL and Download URL side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="url"
                        value={row.embedUrl}
                        onChange={(e) => updateRowField(idx, 'embedUrl', e.target.value)}
                        placeholder="Stream Embed URL (https://...)"
                        className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-9 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard?.readText();
                            if (text) updateRowField(idx, 'embedUrl', text);
                          } catch {}
                        }}
                        className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                        title="Paste from clipboard"
                      >
                        <Clipboard className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={row.downloadUrl}
                        onChange={(e) => updateRowField(idx, 'downloadUrl', e.target.value)}
                        placeholder="Download URL (Drive, Mega, etc.)"
                        className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] pl-3 pr-9 text-[13px] font-mono text-white outline-none overflow-x-auto whitespace-nowrap"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard?.readText();
                            if (text) updateRowField(idx, 'downloadUrl', text);
                          } catch {}
                        }}
                        className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-[#1E88FF] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                        title="Paste from clipboard"
                      >
                        <Clipboard className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Save Bar */}
        {episodeRows.length > 0 && (
          <AdminStickySaveBar
            message={`${filledCount} of ${episodeRows.length} episodes ready · Season ${seasonNumber}`}
            saveLabel="Save all episodes"
            saving={isSaving}
            onSave={handleSaveAll}
            showDiscard={false}
          />
        )}

        {/* Clear Confirm Dialog */}
        <AdminConfirmDialog
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          onConfirm={handleClearUrls}
          title="Clear all URLs in form?"
          consequence="This will empty the embed and download inputs in this session. Existing database records are untouched until you save."
          confirmLabel="Clear URLs"
        />

        {/* Delete Season Confirm Dialog */}
        <AdminConfirmDialog
          isOpen={showDeleteSeasonConfirm}
          onClose={() => setShowDeleteSeasonConfirm(false)}
          onConfirm={handleDeleteSeasonFromDb}
          title={`Delete Season ${seasonNumber} from database?`}
          consequence="This will permanently delete all episodes in this season from your database."
          confirmLabel={`Delete Season ${seasonNumber}`}
          isLoading={isSaving}
        />
      </div>
    </AdminLayout>
  );
};
