import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import type { Anime, AnimeSeasonEntry } from '../../types/anime';
import { getAllAnimes, updateAnime } from '../../lib/firestore/anime';
import { bulkCreateEpisodes, getAllEpisodesByAnimeId, deleteEpisodesBySeason, type BulkEpisodeItemInput } from '../../lib/firestore/episodes';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import {
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
  Check,
  Play,
  Save,
  HelpCircle,
  Copy,
  Sliders,
  ChevronDown,
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
  const [pasteTitles, setPasteTitles] = useState<string>('');
  const [pasteEmbedUrls, setPasteEmbedUrls] = useState<string>('');
  const [pasteDownloadUrls, setPasteDownloadUrls] = useState<string>('');

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<{
    added: number;
    updated: number;
    total: number;
  } | null>(null);

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
        onShowMessage('Failed to load animes list');
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
      setSaveSuccess(null);

      try {
        // Find season config
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

        // Fetch all existing episodes of this anime from Firestore
        const allEps = await getAllEpisodesByAnimeId(selectedAnimeId);

        if (!isSubscribed) return;

        // Filter for this season (support seasonNumber or default season 1)
        const seasonEps = allEps.filter((ep) => {
          const sNum =
            ep.seasonNumber !== undefined && ep.seasonNumber !== null
              ? Number(ep.seasonNumber)
              : ep.season !== undefined && ep.season !== null
              ? Number(ep.season)
              : 1;
          return sNum === seasonNumber;
        });

        // Map existing episodes by episode number
        const existingMap = new Map<number, any>();
        seasonEps.forEach((ep) => {
          existingMap.set(Number(ep.episodeNumber), ep);
        });

        // Determine how many rows to generate: max of (targetEpisodes, highest existing ep)
        const highestExistingEp = seasonEps.reduce(
          (max, ep) => Math.max(max, Number(ep.episodeNumber) || 0),
          0
        );
        const rowCount = Math.max(seasonTargetEpisodes, highestExistingEp, 1);

        // Construct rows for Ep 1 .. rowCount
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
        onShowMessage('Failed to load existing episodes for this season');
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

  // Adjust total episodes count and update row count dynamically
  const handleTotalEpisodesChange = (newTotal: number) => {
    const val = Math.max(1, Math.min(200, newTotal));
    setTotalEpisodesCount(val);

    setEpisodeRows((prev) => {
      if (val > prev.length) {
        // Add more rows
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
        // Truncate only if user agrees or if extra rows are completely blank
        return prev.slice(0, val);
      }
      return prev;
    });
  };

  // Update a single episode row field
  const updateRowField = (index: number, field: keyof SeasonEpisodeRow, value: any) => {
    setEpisodeRows((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // Add a single extra episode slot at the end
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

  // Remove a row
  const handleRemoveRow = (index: number) => {
    setEpisodeRows((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-index episode numbers sequentially
      const reindexed = filtered.map((row, i) => ({
        ...row,
        episodeNumber: i + 1,
      }));
      setTotalEpisodesCount(reindexed.length);
      return reindexed;
    });
  };

  // Clear all URLs in current season
  const handleClearUrls = () => {
    if (!window.confirm('Are you sure you want to clear all Embed and Download URLs in this form?')) {
      return;
    }
    setEpisodeRows((prev) =>
      prev.map((row) => ({
        ...row,
        embedUrl: '',
        downloadUrl: '',
      }))
    );
  };

  // Delete all episodes for this season from database (e.g. to remove old 13..18)
  const handleDeleteSeasonFromDb = async () => {
    if (!selectedAnimeId || !selectedAnime) return;
    if (
      !window.confirm(
        `Are you sure you want to delete all Season ${seasonNumber} episodes for "${selectedAnime.title}" from the database? This allows you to add fresh clean episodes starting from Ep 1.`
      )
    ) {
      return;
    }
    try {
      setIsSaving(true);
      setSaveProgress(`Deleting Season ${seasonNumber} episodes from database...`);
      const count = await deleteEpisodesBySeason(selectedAnimeId, seasonNumber);
      onShowMessage(`Deleted ${count} episodes for Season ${seasonNumber}.`);
      // Reset rows to blank Ep 1 .. totalEpisodesCount
      const blankRows: SeasonEpisodeRow[] = [];
      for (let i = 1; i <= totalEpisodesCount; i++) {
        blankRows.push({
          episodeNumber: i,
          title: `Episode ${i}`,
          embedUrl: '',
          downloadUrl: '',
          isExistingInDb: false,
        });
      }
      setEpisodeRows(blankRows);
    } catch (err: any) {
      console.error('Failed to delete season episodes:', err);
      onShowMessage(err.message || 'Failed to delete season episodes');
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  // Quick Multi-Paste applicator
  const handleApplyMultiPaste = () => {
    const embedLines = pasteEmbedUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const downloadLines = pasteDownloadUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const titleLines = pasteTitles
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (embedLines.length === 0 && downloadLines.length === 0 && titleLines.length === 0) {
      onShowMessage('Please paste at least one Embed URL, Download URL, or Title list');
      return;
    }

    setEpisodeRows((prev) => {
      const maxCount = Math.max(
        prev.length,
        embedLines.length,
        downloadLines.length,
        titleLines.length
      );

      const nextRows: SeasonEpisodeRow[] = [];
      for (let i = 0; i < maxCount; i++) {
        const epNum = i + 1;
        const existing = prev[i];

        const title =
          titleLines[i] ||
          existing?.title ||
          `Episode ${epNum}`;

        const embedUrl =
          embedLines[i] !== undefined
            ? embedLines[i]
            : existing?.embedUrl || '';

        const downloadUrl =
          downloadLines[i] !== undefined
            ? downloadLines[i]
            : existing?.downloadUrl || '';

        nextRows.push({
          episodeNumber: epNum,
          title,
          embedUrl,
          downloadUrl,
          isExistingInDb: existing?.isExistingInDb || false,
          existingId: existing?.existingId,
        });
      }

      setTotalEpisodesCount(nextRows.length);
      return nextRows;
    });

    setShowMultiPaste(false);
    onShowMessage(`Applied pasted links to ${Math.max(embedLines.length, downloadLines.length, titleLines.length)} episodes!`);
  };

  // Helper to detect download host
  const detectHost = (url: string): string => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes('drive.google.com')) return 'Google Drive';
      if (host.includes('mega.nz')) return 'Mega';
      if (host.includes('t.me') || host.includes('telegram')) return 'Telegram';
      if (host.includes('mediafire.com')) return 'Mediafire';
      if (host.includes('streamtape')) return 'Streamtape';
      if (host.includes('dood')) return 'DoodStream';
      return 'Direct Cloud';
    } catch {
      return 'Direct Server';
    }
  };

  // Save all episodes to Firestore
  const handleSaveAll = async () => {
    if (!selectedAnimeId || !selectedAnime) {
      onShowMessage('Please select an anime title first');
      return;
    }

    if (episodeRows.length === 0) {
      onShowMessage('No episodes to save');
      return;
    }

    // Filter rows that have at least title, embedUrl or downloadUrl
    const validRows = episodeRows.filter((r) => r.title || r.embedUrl || r.downloadUrl);
    if (validRows.length === 0) {
      onShowMessage('Please enter at least one episode with Title or URL');
      return;
    }

    try {
      setIsSaving(true);
      setSaveProgress(`Preparing to save ${validRows.length} episodes for Season ${seasonNumber}...`);

      const payload: BulkEpisodeItemInput[] = validRows.map((row) => {
        const streamUrl = row.embedUrl.trim();
        const downloadUrl = row.downloadUrl.trim();

        const videoSources = streamUrl
          ? [
              {
                id: 's1',
                serverName: 'Server 1 (Embed)',
                embedUrl: streamUrl,
                quality: defaultQuality,
              },
            ]
          : undefined;

        const sources = streamUrl
          ? [
              {
                id: 's1',
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

      setSaveProgress(`Writing ${payload.length} episodes to Firestore...`);

      const result = await bulkCreateEpisodes(selectedAnimeId, payload, {
        overwriteExisting: true,
        updateAnimeStats: true,
        animeTitle: selectedAnime.title,
        animeSlug: selectedAnime.slug,
        animePoster: selectedAnime.poster || selectedAnime.posterUrl,
        animeBanner: selectedAnime.banner || selectedAnime.bannerUrl,
      });

      // Update Anime's seasonsList with the total episodes if it changed
      try {
        const currentSeasonsList = selectedAnime.seasonsList ? [...selectedAnime.seasonsList] : [];
        const seasonIdx = currentSeasonsList.findIndex((s) => s.seasonNumber === seasonNumber);

        if (seasonIdx >= 0) {
          currentSeasonsList[seasonIdx] = {
            ...currentSeasonsList[seasonIdx],
            totalEpisodes: Math.max(currentSeasonsList[seasonIdx].totalEpisodes || 0, episodeRows.length),
          };
        } else {
          currentSeasonsList.push({
            id: `s${seasonNumber}`,
            seasonNumber,
            title: `Season ${seasonNumber}`,
            totalEpisodes: episodeRows.length,
            status: 'ongoing',
          });
        }

        // Calculate global totalEpisodes
        const totalCount = currentSeasonsList.reduce((sum, s) => sum + (s.totalEpisodes || 0), 0);

        await updateAnime(selectedAnimeId, {
          seasonsList: currentSeasonsList,
          totalEpisodes: totalCount,
        });
      } catch (err) {
        console.warn('Note: Could not sync seasonsList totalEpisodes:', err);
      }

      // Log admin activity
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

      setSaveSuccess({
        added: result.added,
        updated: result.updated,
        total: result.added + result.updated,
      });

      // Update isExistingInDb status in state
      setEpisodeRows((prev) =>
        prev.map((r) => ({
          ...r,
          isExistingInDb: true,
        }))
      );

      onShowMessage(`Successfully saved ${result.added + result.updated} episodes!`);
    } catch (err: any) {
      console.error('Failed to bulk save episodes:', err);
      onShowMessage(err.message || 'Error occurred while saving episodes');
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  // Filled count statistics
  const filledCount = useMemo(() => {
    return episodeRows.filter((r) => r.embedUrl.trim() || r.downloadUrl.trim()).length;
  }, [episodeRows]);

  return (
    <AdminLayout
      currentTab="episodes"
      onShowMessage={onShowMessage}
      navigate={navigate}
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-28">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-wide">
                  Bulk Episode Manager
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Season Mode
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Select an anime title and season. Fill in the <strong className="text-white">Title</strong>, <strong className="text-white">Embed url</strong>, and <strong className="text-white">Download url</strong> for all episodes of that season on one clean screen.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/episodes')}
                className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Back to Episodes
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/episodes/new')}
                className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-blue-400" /> Single Form
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccess && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-300">
                  Season Episodes Published Successfully!
                </h4>
                <p className="text-sm text-emerald-200/80">
                  Added <strong className="text-white">{saveSuccess.added}</strong> new episodes and updated <strong className="text-white">{saveSuccess.updated}</strong> existing episodes for Season {seasonNumber}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedAnime && (
                <button
                  type="button"
                  onClick={() => navigate(`/watch/${selectedAnime.slug || selectedAnime.id}?ep=1&season=${seasonNumber}`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5" /> Watch Ep 1
                </button>
              )}
              <button
                type="button"
                onClick={() => setSeasonNumber((prev) => prev + 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                Next Season (S{seasonNumber + 1}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Control Box: Anime & Season Selection */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Anime Title Selector (7 cols) */}
            <div className="md:col-span-7 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-blue-400" /> Select Anime Title
              </label>

              {loadingAnimes ? (
                <div className="h-12 bg-slate-800 animate-pulse rounded-xl" />
              ) : (
                <div className="relative">
                  <select
                    value={selectedAnimeId}
                    onChange={(e) => {
                      setSelectedAnimeId(e.target.value);
                      setSeasonNumber(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 hover:border-blue-500 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-base font-semibold focus:outline-none appearance-none pr-10 cursor-pointer transition shadow-inner"
                  >
                    <option value="" disabled>
                      -- Select an Anime from Catalog --
                    </option>
                    {animes.map((a) => (
                      <option key={a.id || a.slug} value={a.id || a.slug}>
                        {a.title} {a.year ? `(${a.year})` : ''} — {a.totalEpisodes || 0} eps
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              )}

              {selectedAnime && (
                <div className="flex items-center gap-3 pt-2">
                  <img
                    src={selectedAnime.poster || selectedAnime.posterUrl || '/placeholder-anime.jpg'}
                    alt={selectedAnime.title}
                    className="w-12 h-16 object-cover rounded-lg border border-slate-700 shadow"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-white text-sm">{selectedAnime.title}</p>
                    <p className="text-slate-400">
                      Status: <span className="capitalize text-blue-400">{selectedAnime.status || 'Ongoing'}</span> • Total Seasons: {availableSeasons.length}
                    </p>
                    <p className="text-slate-400">
                      Audio: <span className="text-emerald-400 font-medium">{selectedAnime.audioLanguage || 'Hindi Dub'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Season Selector & Total Episodes in Season (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              {/* Season Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Season</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSeasonNum = Math.max(...availableSeasons.map((s) => s.seasonNumber), seasonNumber) + 1;
                      setSeasonNumber(nextSeasonNum);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Season
                  </button>
                </label>

                <div className="flex flex-wrap gap-2">
                  {availableSeasons.map((season) => {
                    const isActive = season.seasonNumber === seasonNumber;
                    return (
                      <button
                        key={season.id || season.seasonNumber}
                        type="button"
                        onClick={() => setSeasonNumber(season.seasonNumber)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        Season {season.seasonNumber}
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {season.totalEpisodes || 12} eps
                        </span>
                      </button>
                    );
                  })}

                  {!availableSeasons.some((s) => s.seasonNumber === seasonNumber) && (
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-lg border border-blue-400"
                    >
                      Season {seasonNumber} (Custom)
                    </button>
                  )}
                </div>
              </div>

              {/* Total Episodes Input & Config */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Total Episodes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={totalEpisodesCount}
                    onChange={(e) => handleTotalEpisodesChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Audio / Dub
                  </label>
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-2.5 py-2 text-white font-bold text-sm focus:outline-none"
                  >
                    <option value="Hindi Dub">Hindi Dub</option>
                    <option value="Japanese Sub">Japanese Sub</option>
                    <option value="Dual Audio">Dual Audio</option>
                    <option value="Multi Audio">Multi Audio</option>
                    <option value="English Dub">English Dub</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Helper Tools Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMultiPaste(!showMultiPaste)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  showMultiPaste
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {showMultiPaste ? 'Close Quick Paste' : '⚡ Quick Multi-Paste (All URLs)'}
              </button>

              <button
                type="button"
                onClick={handleClearUrls}
                className="px-3 py-2 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                title="Clear all URLs in cards"
              >
                Clear URLs
              </button>

              <button
                type="button"
                onClick={handleDeleteSeasonFromDb}
                className="px-3 py-2 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                title={`Delete Season ${seasonNumber} episodes from database to start fresh`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Delete S{seasonNumber} From DB
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                {filledCount} of {episodeRows.length} Episodes with Links
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 font-medium">
                Season {seasonNumber}
              </span>
            </div>
          </div>

          {/* Collapsible Quick Multi-Paste Drawer */}
          {showMultiPaste && (
            <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Quick Multi-Paste Tool
                  </h4>
                  <p className="text-xs text-slate-400">
                    Paste links line-by-line (one per episode). They will auto-populate Ep 1, Ep 2, Ep 3... instantly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Embed URLs Paste */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Embed URLs (1 per line for Ep 1, Ep 2, ...)
                  </label>
                  <textarea
                    rows={6}
                    value={pasteEmbedUrls}
                    onChange={(e) => setPasteEmbedUrls(e.target.value)}
                    placeholder="https://streamtape.com/e/xxxx&#10;https://streamtape.com/e/yyyy&#10;https://streamtape.com/e/zzzz"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>

                {/* Download URLs Paste */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Download URLs (1 per line for Ep 1, Ep 2, ...)
                  </label>
                  <textarea
                    rows={6}
                    value={pasteDownloadUrls}
                    onChange={(e) => setPasteDownloadUrls(e.target.value)}
                    placeholder="https://drive.google.com/file/d/xxxx/view&#10;https://drive.google.com/file/d/yyyy/view&#10;https://drive.google.com/file/d/zzzz/view"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMultiPaste(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyMultiPaste}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Apply to All Episode Cards
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Spinner for Episode Rows */}
        {loadingEpisodes && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Loading existing episodes for Season {seasonNumber}...
            </p>
          </div>
        )}

        {/* The Exact Episode Cards Format Requested by User */}
        {!loadingEpisodes && episodeRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-blue-400" />
                Episodes List (Season {seasonNumber}) — {episodeRows.length} Episodes
              </h3>
              <button
                type="button"
                onClick={handleAddEpisodeSlot}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Ep {episodeRows.length + 1} Slot
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {episodeRows.map((row, idx) => (
                <div
                  key={`ep-row-${row.episodeNumber}`}
                  className="bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition space-y-3 relative group"
                >
                  {/* Card Header: Ep number & DB Status */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-sm rounded-lg shadow-sm">
                        Ep {row.episodeNumber}
                      </span>
                      {row.isExistingInDb ? (
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Existing in DB
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-xs font-medium">
                          New Slot
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        Season {seasonNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {row.embedUrl && (
                        <a
                          href={row.embedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                          title="Open Stream Embed in new tab"
                        >
                          <ExternalLink className="w-3 h-3" /> Test Stream
                        </a>
                      )}
                      {row.downloadUrl && (
                        <a
                          href={row.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                          title="Test Download link in new tab"
                        >
                          <Download className="w-3 h-3" /> Test Download
                        </a>
                      )}
                      {episodeRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Remove this slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fields: Title, Embed url, Download url */}
                  <div className="space-y-3 pt-1">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Title :
                      </label>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateRowField(idx, 'title', e.target.value)}
                        placeholder={`Episode ${row.episodeNumber}`}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                      />
                    </div>

                    {/* Embed URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Embed url :</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (StreamTape, Direct MP4, Mega, HLS stream or embed)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={row.embedUrl}
                          onChange={(e) => updateRowField(idx, 'embedUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-blue-200 focus:outline-none transition pr-10"
                        />
                        {row.embedUrl && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Download URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Download url :</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (Google Drive, Mega, Telegram, Mediafire link)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={row.downloadUrl}
                          onChange={(e) => updateRowField(idx, 'downloadUrl', e.target.value)}
                          placeholder="https://drive.google.com/... or download URL"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-emerald-200 focus:outline-none transition pr-10"
                        />
                        {row.downloadUrl && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Episode Button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleAddEpisodeSlot}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Episode {episodeRows.length + 1} Slot
              </button>
            </div>
          </div>
        )}

        {/* Empty Catalog State */}
        {!loadingEpisodes && episodeRows.length === 0 && !loadingAnimes && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Anime Selected</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Please choose an anime title above to start filling out Season episodes.
            </p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Action Bar */}
      {episodeRows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 py-3.5 px-4 shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {selectedAnime && (
                <div className="text-left">
                  <p className="text-xs text-slate-400">
                    Target:{' '}
                    <strong className="text-white">{selectedAnime.title}</strong>{' '}
                    (Season {seasonNumber})
                  </p>
                  <p className="text-xs text-slate-300">
                    <span className="text-blue-400 font-bold">{filledCount}</span> of{' '}
                    <span className="font-bold">{episodeRows.length}</span> episodes ready to publish
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAll}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Season Episodes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save All Episodes ({episodeRows.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time saving progress message */}
          {saveProgress && (
            <div className="max-w-6xl mx-auto pt-2 text-center text-xs text-blue-400 font-medium animate-pulse">
              {saveProgress}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};
