import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import { getAllAnimes, updateAnime, getAnimeById } from '../../lib/firestore/anime';
import {
  getAllEpisodesByAnimeId,
  updateEpisode,
  createEpisode,
} from '../../lib/firestore/episodes';
import type { Anime, ZipDownloadPackage } from '../../types/anime';
import type { Episode } from '../../types/episode';
import {
  detectHostName,
  RESOLUTION_ESTIMATES,
  type DownloadResolution,
} from '../../lib/downloads';
import {
  Download,
  FolderArchive,
  Film,
  Plus,
  Trash2,
  Save,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Zap,
  ArrowRight,
  X,
  FileText,
  Check,
  Filter,
  Link as LinkIcon,
  Eye,
  PlusCircle,
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
  const [searchAnimeQuery, setSearchAnimeQuery] = useState('');

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

  // Filter & Search for Episodes
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [epStatusFilter, setEpStatusFilter] = useState<'all' | 'missing' | 'complete'>('all');

  // Local editable episode download links map (focused on 720p and 1080p)
  // Key: episodeId -> { '720p': { url, size }, '1080p': { url, size } }
  const [epDownloadsMap, setEpDownloadsMap] = useState<
    Record<
      string,
      Record<'720p' | '1080p', { url: string; size: string }>
    >
  >({});

  // Quick Add / Update Specific Episode Modal
  const [specificEpModalOpen, setSpecificEpModalOpen] = useState(false);
  const [specificEpTarget, setSpecificEpTarget] = useState<string>('new'); // 'new' or episode id
  const [specificEpNumber, setSpecificEpNumber] = useState<number>(1);
  const [specificEpTitle, setSpecificEpTitle] = useState<string>('');
  const [specific720Url, setSpecific720Url] = useState<string>('');
  const [specific720Size, setSpecific720Size] = useState<string>('~240 MB');
  const [specific1080Url, setSpecific1080Url] = useState<string>('');
  const [specific1080Size, setSpecific1080Size] = useState<string>('~480 MB');
  const [savingSpecificEp, setSavingSpecificEp] = useState(false);

  // Bulk paste modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'1080p' | '720p' | 'dual'>('1080p');
  const [bulk1080Text, setBulk1080Text] = useState('');
  const [bulk720Text, setBulk720Text] = useState('');

  // Batch Create Episodes range modal state
  const [batchCreateModalOpen, setBatchCreateModalOpen] = useState(false);
  const [batchFromEp, setBatchFromEp] = useState(1);
  const [batchToEp, setBatchToEp] = useState(12);
  const [creatingBatchEps, setCreatingBatchEps] = useState(false);

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
          const target = list.find((a) => a.id === p || a.slug === p) || list[0];
          setSelectedAnimeId(target.id || '');

          const seasonParam = params?.get('season');
          if (seasonParam) {
            const parsed = parseInt(seasonParam, 10);
            if (parsed > 0) setSelectedSeasonNumber(parsed);
          }
        }
      } catch (err) {
        console.error('Error fetching animes:', err);
      } finally {
        setLoadingAnimes(false);
      }
    };
    fetchAnimes();
  }, []);

  // 2. When selectedAnimeId or selectedSeasonNumber changes, load anime doc and episodes
  useEffect(() => {
    if (!selectedAnimeId) return;

    const loadAnimeDetails = async () => {
      const anime = animes.find((a) => a.id === selectedAnimeId) || (await getAnimeById(selectedAnimeId));
      if (!anime) return;

      setSelectedAnime(anime);

      // Load Zip packages
      const existingZips: ZipDownloadPackage[] = anime.zipDownloads ? [...anime.zipDownloads] : [];
      if (existingZips.length === 0) {
        if (anime.downloadBatchUrl) {
          existingZips.push({
            id: 'zip-1',
            title: `Zip 1: Season ${selectedSeasonNumber} Batch Archive`,
            seasonNumber: selectedSeasonNumber,
            url: anime.downloadBatchUrl,
            size: '2.8 GB',
            quality: '1080p Full HD',
            host: detectHostName(anime.downloadBatchUrl),
            episodesRange: 'All Episodes Included',
          });
        }
        if (anime.downloadUrl && anime.downloadUrl !== anime.downloadBatchUrl) {
          existingZips.push({
            id: 'zip-2',
            title: `Zip 2: Season ${selectedSeasonNumber} Fast Mirror`,
            seasonNumber: selectedSeasonNumber,
            url: anime.downloadUrl,
            size: '1.9 GB',
            quality: '720p HD',
            host: detectHostName(anime.downloadUrl),
            episodesRange: 'All Episodes Included',
          });
        }
      }
      setZipPackages(existingZips);

      // Load episodes
      try {
        setLoadingEpisodes(true);
        const epList = await getAllEpisodesByAnimeId(selectedAnimeId);
        epList.sort((a, b) => a.episodeNumber - b.episodeNumber);
        setEpisodes(epList);

        // Build epDownloadsMap focusing cleanly on 720p and 1080p
        const newMap: Record<string, Record<'720p' | '1080p', { url: string; size: string }>> = {};
        epList.forEach((ep) => {
          if (!ep.id) return;
          const resObj: Record<'720p' | '1080p', { url: string; size: string }> = {
            '720p': { url: '', size: '~240 MB' },
            '1080p': { url: '', size: '~480 MB' },
          };

          if (ep.downloadLinks && ep.downloadLinks.length > 0) {
            ep.downloadLinks.forEach((dl) => {
              const q = (dl.quality || '').toLowerCase();
              if (q.includes('720')) resObj['720p'] = { url: dl.url || '', size: dl.size || '~240 MB' };
              if (q.includes('1080')) resObj['1080p'] = { url: dl.url || '', size: dl.size || '~480 MB' };
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

    loadAnimeDetails();
  }, [selectedAnimeId, animes, selectedSeasonNumber]);

  // Filtered anime list for search dropdown
  const filteredAnimes = useMemo(() => {
    if (!searchAnimeQuery.trim()) return animes;
    const q = searchAnimeQuery.trim().toLowerCase();
    return animes.filter(
      (a) => a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
    );
  }, [animes, searchAnimeQuery]);

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

  // Displayed episodes with search and status filter
  const displayedSeasonEpisodes = useMemo(() => {
    let list = seasonEpisodes;

    if (epSearchQuery.trim()) {
      const q = epSearchQuery.trim().toLowerCase();
      list = list.filter(
        (e) => e.episodeNumber.toString() === q || e.title.toLowerCase().includes(q)
      );
    }

    if (epStatusFilter === 'missing') {
      list = list.filter((e) => {
        const d = e.id ? epDownloadsMap[e.id] : null;
        return !d?.['720p']?.url || !d?.['1080p']?.url;
      });
    } else if (epStatusFilter === 'complete') {
      list = list.filter((e) => {
        const d = e.id ? epDownloadsMap[e.id] : null;
        return Boolean(d?.['720p']?.url && d?.['1080p']?.url);
      });
    }

    return list;
  }, [seasonEpisodes, epSearchQuery, epStatusFilter, epDownloadsMap]);

  // Counts
  const completedEpisodeCount = useMemo(() => {
    return seasonEpisodes.filter((e) => {
      const d = e.id ? epDownloadsMap[e.id] : null;
      return Boolean(d?.['720p']?.url && d?.['1080p']?.url);
    }).length;
  }, [seasonEpisodes, epDownloadsMap]);

  // =========================================================================
  // ZIP PACKAGES HANDLERS (MULTIPLE ZIP SUPPORT)
  // =========================================================================

  // Add a single custom zip package
  const handleAddZipPackage = () => {
    const nextIndex = zipPackages.length + 1;
    const newPkg: ZipDownloadPackage = {
      id: `zip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `Zip ${nextIndex}: Season ${selectedSeasonNumber} Batch Archive`,
      seasonNumber: selectedSeasonNumber,
      url: '',
      size: '2.8 GB',
      quality: '1080p Full HD',
      host: 'MegaCloud',
      episodesRange: 'All Episodes',
    };
    setZipPackages([...zipPackages, newPkg]);
  };

  // Preset: Add Multi-Part Zips (e.g. Part 1 and Part 2)
  const handleAddMultiPartZips = () => {
    const p1: ZipDownloadPackage = {
      id: `zip-${Date.now()}-p1`,
      title: `Zip ${zipPackages.length + 1}: Part 1 (Episodes 01 - 12)`,
      seasonNumber: selectedSeasonNumber,
      url: '',
      size: '2.4 GB',
      quality: '1080p Full HD',
      host: 'MegaCloud',
      episodesRange: 'Episodes 01 - 12',
    };
    const p2: ZipDownloadPackage = {
      id: `zip-${Date.now()}-p2`,
      title: `Zip ${zipPackages.length + 2}: Part 2 (Episodes 13 - 24)`,
      seasonNumber: selectedSeasonNumber,
      url: '',
      size: '2.4 GB',
      quality: '1080p Full HD',
      host: 'Google Drive',
      episodesRange: 'Episodes 13 - 24',
    };
    setZipPackages([...zipPackages, p1, p2]);
    onShowMessage('Added 2 Multi-Part Zip slots (Part 1 & Part 2). Fill in the URLs and click Save.');
  };

  // Preset: Add 1080p & 720p Zip Pair
  const handleAddQualityPairZips = () => {
    const zip1080: ZipDownloadPackage = {
      id: `zip-${Date.now()}-1080`,
      title: `Zip ${zipPackages.length + 1}: Full Season [1080p Ultra HD]`,
      seasonNumber: selectedSeasonNumber,
      url: '',
      size: '3.2 GB',
      quality: '1080p Full HD',
      host: 'MegaCloud',
      episodesRange: 'Full Season',
    };
    const zip720: ZipDownloadPackage = {
      id: `zip-${Date.now()}-720`,
      title: `Zip ${zipPackages.length + 2}: Full Season [720p HD Compact]`,
      seasonNumber: selectedSeasonNumber,
      url: '',
      size: '1.8 GB',
      quality: '720p HD',
      host: 'Google Drive',
      episodesRange: 'Full Season',
    };
    setZipPackages([...zipPackages, zip1080, zip720]);
    onShowMessage('Added 1080p and 720p Zip pair slots. Enter URLs and click Save.');
  };

  const handleUpdateZipPackage = (index: number, field: keyof ZipDownloadPackage, value: any) => {
    const updated = [...zipPackages];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'url' && value) {
      updated[index].host = detectHostName(value, updated[index].host || 'Direct Cloud');
    }
    setZipPackages(updated);
  };

  const handleDuplicateZipPackage = (index: number) => {
    const target = zipPackages[index];
    if (!target) return;
    const duplicated: ZipDownloadPackage = {
      ...target,
      id: `zip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${target.title} (Mirror)`,
      host: target.host ? `${target.host} Mirror` : 'Alternative Host',
    };
    const nextList = [...zipPackages];
    nextList.splice(index + 1, 0, duplicated);
    setZipPackages(nextList);
    onShowMessage(`Duplicated "${target.title}"!`);
  };

  const handleRemoveZipPackage = (index: number) => {
    setZipPackages(zipPackages.filter((_, i) => i !== index));
  };

  // Save Zip packages to Anime doc in Firestore
  const handleSaveZipPackages = async () => {
    if (!selectedAnime?.id) return;
    try {
      setSavingZips(true);
      const validZips = zipPackages.filter((p) => p.url.trim());

      await updateAnime(selectedAnime.id, {
        zipDownloads: validZips,
        downloadBatchUrl: validZips[0]?.url || selectedAnime.downloadBatchUrl || undefined,
        downloadUrl: validZips[1]?.url || validZips[0]?.url || selectedAnime.downloadUrl || undefined,
      });

      onShowMessage(`Saved ${validZips.length} Zip download packages for "${selectedAnime.title}"!`);
    } catch (err: any) {
      console.error('Error saving zips:', err);
      onShowMessage(`Failed to save Zip packages: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingZips(false);
    }
  };

  // =========================================================================
  // EPISODE DOWNLOADS HANDLERS (STREAMLINED 720p & 1080p)
  // =========================================================================

  const handleEpResChange = (
    epId: string,
    res: '720p' | '1080p',
    field: 'url' | 'size',
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
            [field]: value,
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

      // Preserve any existing non-720/1080 links if present
      if (ep.downloadLinks && ep.downloadLinks.length > 0) {
        ep.downloadLinks.forEach((l) => {
          const q = (l.quality || '').toLowerCase();
          if (!q.includes('720') && !q.includes('1080')) {
            formattedLinks.push(l);
          }
        });
      }

      if (resData['720p'].url.trim()) {
        formattedLinks.push({
          quality: '720p HD',
          size: resData['720p'].size.trim() || '~240 MB',
          url: resData['720p'].url.trim(),
          host: detectHostName(resData['720p'].url.trim()),
        });
      }

      if (resData['1080p'].url.trim()) {
        formattedLinks.push({
          quality: '1080p Full HD',
          size: resData['1080p'].size.trim() || '~480 MB',
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

      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === ep.id
            ? {
                ...e,
                downloadLinks: formattedLinks,
                downloadUrl: primary || undefined,
                downloadQuality: primary ? '1080p Full HD' : undefined,
              }
            : e
        )
      );

      setSavedSuccessEpId(ep.id);
      setTimeout(() => setSavedSuccessEpId(null), 2500);
      onShowMessage(`Saved 720p & 1080p downloads for Episode ${ep.episodeNumber}!`);
    } catch (err: any) {
      console.error('Error saving episode download:', err);
      onShowMessage(`Failed to save Episode ${ep.episodeNumber}: ${err?.message}`);
    } finally {
      setSavingEpId(null);
    }
  };

  // Save downloads for ALL season episodes in parallel
  const handleSaveAllSeasonEpisodes = async () => {
    try {
      setSavingAllEpisodes(true);
      let count = 0;

      for (const ep of seasonEpisodes) {
        if (!ep.id) continue;
        const resData = epDownloadsMap[ep.id];
        if (!resData) continue;

        const formattedLinks: { quality: string; size?: string; url: string; host?: string }[] = [];

        if (ep.downloadLinks && ep.downloadLinks.length > 0) {
          ep.downloadLinks.forEach((l) => {
            const q = (l.quality || '').toLowerCase();
            if (!q.includes('720') && !q.includes('1080')) {
              formattedLinks.push(l);
            }
          });
        }

        if (resData['720p']?.url.trim()) {
          formattedLinks.push({
            quality: '720p HD',
            size: resData['720p'].size.trim() || '~240 MB',
            url: resData['720p'].url.trim(),
            host: detectHostName(resData['720p'].url.trim()),
          });
        }

        if (resData['1080p']?.url.trim()) {
          formattedLinks.push({
            quality: '1080p Full HD',
            size: resData['1080p'].size.trim() || '~480 MB',
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

      onShowMessage(`Successfully saved download links for all ${count} episodes!`);
    } catch (err: any) {
      console.error('Error saving all episodes:', err);
      onShowMessage(`Failed to save all: ${err?.message}`);
    } finally {
      setSavingAllEpisodes(false);
    }
  };

  // Open the modal for a specific existing episode or a new one
  const handleOpenSpecificEpModal = (targetId: string = 'new') => {
    setSpecificEpTarget(targetId);

    if (targetId === 'new') {
      const highestEp = seasonEpisodes.reduce((max, e) => Math.max(max, e.episodeNumber), 0);
      setSpecificEpNumber(highestEp + 1);
      setSpecificEpTitle(`Episode ${highestEp + 1}`);
      setSpecific720Url('');
      setSpecific720Size('~240 MB');
      setSpecific1080Url('');
      setSpecific1080Size('~480 MB');
    } else {
      const match = seasonEpisodes.find((e) => e.id === targetId);
      if (match) {
        setSpecificEpNumber(match.episodeNumber);
        setSpecificEpTitle(match.title || `Episode ${match.episodeNumber}`);
        const mapData = epDownloadsMap[targetId];
        setSpecific720Url(mapData?.['720p']?.url || '');
        setSpecific720Size(mapData?.['720p']?.size || '~240 MB');
        setSpecific1080Url(mapData?.['1080p']?.url || '');
        setSpecific1080Size(mapData?.['1080p']?.size || '~480 MB');
      }
    }
    setSpecificEpModalOpen(true);
  };

  // Save specific episode from modal
  const handleSaveSpecificEpisodeFromModal = async () => {
    if (!selectedAnime?.id) return;
    try {
      setSavingSpecificEp(true);

      const formattedLinks: { quality: string; size?: string; url: string; host?: string }[] = [];

      if (specific720Url.trim()) {
        formattedLinks.push({
          quality: '720p HD',
          size: specific720Size.trim() || '~240 MB',
          url: specific720Url.trim(),
          host: detectHostName(specific720Url.trim()),
        });
      }

      if (specific1080Url.trim()) {
        formattedLinks.push({
          quality: '1080p Full HD',
          size: specific1080Size.trim() || '~480 MB',
          url: specific1080Url.trim(),
          host: detectHostName(specific1080Url.trim()),
        });
      }

      const primary = specific1080Url.trim() || specific720Url.trim();

      if (specificEpTarget === 'new') {
        // Create new episode
        const newId = await createEpisode({
          animeId: selectedAnime.id,
          episodeNumber: Number(specificEpNumber),
          seasonNumber: selectedSeasonNumber,
          season: selectedSeasonNumber,
          title: specificEpTitle.trim() || `Episode ${specificEpNumber}`,
          published: true,
          downloadLinks: formattedLinks,
          downloadUrl: primary || undefined,
          downloadQuality: primary ? (specific1080Url ? '1080p Full HD' : '720p HD') : undefined,
          downloadSize: specific1080Url ? specific1080Size : specific720Size,
        });

        // Add to local state
        const newEp: Episode = {
          id: newId,
          animeId: selectedAnime.id,
          episodeNumber: Number(specificEpNumber),
          seasonNumber: selectedSeasonNumber,
          title: specificEpTitle.trim() || `Episode ${specificEpNumber}`,
          published: true,
          downloadLinks: formattedLinks,
          downloadUrl: primary || undefined,
        };

        setEpisodes((prev) => [...prev, newEp].sort((a, b) => a.episodeNumber - b.episodeNumber));
        setEpDownloadsMap((prev) => ({
          ...prev,
          [newId]: {
            '720p': { url: specific720Url.trim(), size: specific720Size },
            '1080p': { url: specific1080Url.trim(), size: specific1080Size },
          },
        }));

        onShowMessage(`Created Episode ${specificEpNumber} with download links!`);
      } else {
        // Update existing episode
        await updateEpisode(specificEpTarget, {
          episodeNumber: Number(specificEpNumber),
          title: specificEpTitle.trim() || `Episode ${specificEpNumber}`,
          downloadLinks: formattedLinks,
          downloadUrl: primary || undefined,
          downloadQuality: primary ? (specific1080Url ? '1080p Full HD' : '720p HD') : undefined,
        });

        setEpisodes((prev) =>
          prev.map((e) =>
            e.id === specificEpTarget
              ? {
                  ...e,
                  episodeNumber: Number(specificEpNumber),
                  title: specificEpTitle.trim() || `Episode ${specificEpNumber}`,
                  downloadLinks: formattedLinks,
                  downloadUrl: primary || undefined,
                }
              : e
          )
        );

        setEpDownloadsMap((prev) => ({
          ...prev,
          [specificEpTarget]: {
            '720p': { url: specific720Url.trim(), size: specific720Size },
            '1080p': { url: specific1080Url.trim(), size: specific1080Size },
          },
        }));

        onShowMessage(`Updated Episode ${specificEpNumber} download links!`);
      }

      setSpecificEpModalOpen(false);
    } catch (err: any) {
      console.error('Error in specific episode save:', err);
      onShowMessage(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingSpecificEp(false);
    }
  };

  // Bulk Apply URLs line-by-line
  const handleApplyBulkUrls = () => {
    const lines1080 = bulk1080Text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const lines720 = bulk720Text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines1080.length === 0 && lines720.length === 0) {
      onShowMessage('Please paste at least one URL.');
      return;
    }

    setEpDownloadsMap((prev) => {
      const updated = { ...prev };
      seasonEpisodes.forEach((ep, idx) => {
        if (!ep.id) return;
        const currentEp = updated[ep.id] || {
          '720p': { url: '', size: '~240 MB' },
          '1080p': { url: '', size: '~480 MB' },
        };

        let new720 = currentEp['720p'];
        let new1080 = currentEp['1080p'];

        if ((bulkMode === '720p' || bulkMode === 'dual') && idx < lines720.length) {
          new720 = { url: lines720[idx], size: currentEp['720p'].size || '~240 MB' };
        }
        if ((bulkMode === '1080p' || bulkMode === 'dual') && idx < lines1080.length) {
          new1080 = { url: lines1080[idx], size: currentEp['1080p'].size || '~480 MB' };
        }

        updated[ep.id] = {
          '720p': new720,
          '1080p': new1080,
        };
      });
      return updated;
    });

    onShowMessage(`Applied bulk URLs to ${seasonEpisodes.length} episodes! Click "Save All Episodes" to commit.`);
    setBulkModalOpen(false);
    setBulk1080Text('');
    setBulk720Text('');
  };

  // Batch create episode slots (e.g. Ep 1 to 12)
  const handleBatchCreateEpisodes = async () => {
    if (!selectedAnime?.id) return;
    try {
      setCreatingBatchEps(true);
      const from = Math.max(1, batchFromEp);
      const to = Math.max(from, batchToEp);
      let createdCount = 0;

      const existingNumbers = new Set(seasonEpisodes.map((e) => e.episodeNumber));

      for (let num = from; num <= to; num++) {
        if (!existingNumbers.has(num)) {
          const newId = await createEpisode({
            animeId: selectedAnime.id,
            episodeNumber: num,
            seasonNumber: selectedSeasonNumber,
            season: selectedSeasonNumber,
            title: `Episode ${num}`,
            published: true,
            downloadLinks: [],
          });

          existingNumbers.add(num);
          createdCount++;
        }
      }

      // Reload episodes
      const epList = await getAllEpisodesByAnimeId(selectedAnime.id);
      epList.sort((a, b) => a.episodeNumber - b.episodeNumber);
      setEpisodes(epList);

      onShowMessage(`Created ${createdCount} new episode slots (Ep ${from} to ${to})!`);
      setBatchCreateModalOpen(false);
    } catch (err: any) {
      console.error('Error batch creating episodes:', err);
      onShowMessage(`Failed to batch create: ${err?.message}`);
    } finally {
      setCreatingBatchEps(false);
    }
  };

  return (
    <AdminLayout
      currentTab="downloads"
      navigate={navigate}
      onShowMessage={onShowMessage}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Download className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Downloads Manager
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Add multiple Zip batch packages & manage streamlined 720p HD and 1080p Full HD download links for each episode.
            </p>
          </div>

          {selectedAnime && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate(`/anime/${selectedAnime.slug || selectedAnime.id}/download`)
                }
                className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="View Live Download Page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Live Download Page</span>
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            STEP 1: SELECT ANIME SERIES
           ========================================================================= */}
        <section className="p-5 rounded-2xl bg-[#0B1322] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-[#1683FF]" />
              <span>Step 1: Select Anime Series</span>
            </h2>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAnimeQuery}
                onChange={(e) => setSearchAnimeQuery(e.target.value)}
                placeholder="Search anime title..."
                className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#1683FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
            {filteredAnimes.map((a) => {
              const isSelected = a.id === selectedAnimeId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => a.id && setSelectedAnimeId(a.id)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1683FF]/15 border-[#1683FF] shadow-md shadow-[#1683FF]/20 text-white'
                      : 'bg-[#050A14] hover:bg-[#081220] border-white/5 text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <div className="w-10 h-14 rounded-lg bg-[#0B1322] overflow-hidden border border-white/10 shrink-0">
                    {a.poster ? (
                      <img
                        src={a.poster}
                        alt={a.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-4 h-4 text-[#64748B]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-white truncate">{a.title}</h3>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      {a.type || 'TV'} • {a.status || 'Ongoing'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {selectedAnime && (
          <>
            {/* =========================================================================
                STEP 2: SELECT SEASON
               ========================================================================= */}
            <section className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0B1322] border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#94A3B8] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Active Season:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {seasonNumbers.map((sNum) => {
                    const isActive = sNum === selectedSeasonNumber;
                    return (
                      <button
                        key={sNum}
                        type="button"
                        onClick={() => setSelectedSeasonNumber(sNum)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                            : 'bg-[#050A14] hover:bg-[#0E182A] text-[#94A3B8] hover:text-white border border-white/5'
                        }`}
                      >
                        Season {sNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-[#94A3B8] flex items-center gap-2">
                <span>
                  <strong>{seasonEpisodes.length}</strong> episode{seasonEpisodes.length === 1 ? '' : 's'} in Season {selectedSeasonNumber}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {completedEpisodeCount} with both 720p & 1080p
                </span>
              </div>
            </section>

            {/* =========================================================================
                STEP 3: MULTIPLE ZIP FILES SECTION (Zip 1, Zip 2, Part 1, Part 2...)
               ========================================================================= */}
            <section className="p-5 sm:p-6 rounded-2xl bg-[#0B1322] border border-amber-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-amber-400" />
                      <span>Multiple Zip Files Management</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-black text-[10px] border border-amber-500/20">
                      {zipPackages.length} Zip{zipPackages.length === 1 ? '' : 's'} Configured
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Add single batch zips, multi-part packages (Part 1, Part 2), or quality pairs (1080p & 720p).
                  </p>
                </div>

                {/* Multiple Zip Creation Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddZipPackage}
                    className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Zip</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddMultiPartZips}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#00CFFF] border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Quickly adds Part 1 (Ep 1-12) and Part 2 (Ep 13-24) zips"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ Multi-Part Zips</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddQualityPairZips}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Adds 1080p and 720p full batch pair"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ 1080p & 720p Pair</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveZipPackages}
                    disabled={savingZips}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingZips ? 'Saving...' : 'Save All Zips'}</span>
                  </button>
                </div>
              </div>

              {zipPackages.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#050A14] border border-white/5 text-center text-xs text-[#94A3B8] space-y-3">
                  <FolderArchive className="w-8 h-8 text-amber-400/40 mx-auto" />
                  <p>No Zip packages configured for this anime yet.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddZipPackage}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold hover:bg-amber-500 hover:text-black transition-all"
                    >
                      + Add First Zip Package
                    </button>
                    <button
                      type="button"
                      onClick={handleAddMultiPartZips}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-[#00CFFF] border border-white/10 font-bold hover:bg-white/10 transition-all"
                    >
                      + Add Multi-Part Zips (Part 1 & 2)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {zipPackages.map((pkg, index) => (
                    <div
                      key={pkg.id || index}
                      className="p-4 rounded-xl bg-[#050A14] border border-white/10 space-y-3 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                            Zip Package #{index + 1}
                          </span>
                          {pkg.host && (
                            <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-[#94A3B8]">
                              {pkg.host}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {pkg.url && (
                            <a
                              href={pkg.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#00CFFF] transition-colors"
                              title="Test URL in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDuplicateZipPackage(index)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
                            title="Duplicate this Zip to create a mirror"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveZipPackage(index)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                            title="Remove Package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Title */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#94A3B8]">Package Label / Title</label>
                          <input
                            type="text"
                            value={pkg.title}
                            onChange={(e) => handleUpdateZipPackage(index, 'title', e.target.value)}
                            placeholder="e.g. Zip 1: Complete Season 1 Batch"
                            className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* URL */}
                        <div className="space-y-1 lg:col-span-2">
                          <label className="text-[10px] font-bold text-[#94A3B8]">
                            Zip Download URL (Mega, Drive, Direct...)
                          </label>
                          <input
                            type="url"
                            value={pkg.url}
                            onChange={(e) => handleUpdateZipPackage(index, 'url', e.target.value)}
                            placeholder="https://mega.nz/... or https://drive.google.com/..."
                            className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* File Size */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#94A3B8]">File Size</label>
                          <input
                            type="text"
                            value={pkg.size || ''}
                            onChange={(e) => handleUpdateZipPackage(index, 'size', e.target.value)}
                            placeholder="e.g. 2.8 GB"
                            className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Episodes Range */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#94A3B8]">Episodes Range / Tag</label>
                          <input
                            type="text"
                            value={pkg.episodesRange || ''}
                            onChange={(e) => handleUpdateZipPackage(index, 'episodesRange', e.target.value)}
                            placeholder="e.g. Episodes 01 - 12 (Part 1)"
                            className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Quality */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#94A3B8]">Quality</label>
                          <input
                            type="text"
                            value={pkg.quality || ''}
                            onChange={(e) => handleUpdateZipPackage(index, 'quality', e.target.value)}
                            placeholder="1080p Full HD / 720p HD"
                            className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Host */}
                        <div className="space-y-1 lg:col-span-2">
                          <label className="text-[10px] font-bold text-[#94A3B8]">Host Service</label>
                          <input
                            type="text"
                            value={pkg.host || ''}
                            onChange={(e) => handleUpdateZipPackage(index, 'host', e.target.value)}
                            placeholder="MegaCloud / Google Drive / Direct Server"
                            className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* =========================================================================
                STEP 4: STREAMLINED EPISODE DOWNLOADS (CLEAR 720p & 1080p FORM INPUTS)
               ========================================================================= */}
            <section className="p-5 sm:p-6 rounded-2xl bg-[#0B1322] border border-white/10 space-y-4">
              {/* Header with primary actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-[#1683FF]" />
                      <span>Episode Download Links (720p HD & 1080p Full HD)</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-black text-[10px] border border-emerald-500/20">
                      720p & 1080p Streamlined
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Clear dedicated inputs for 720p and 1080p links linked directly to existing episodes.
                  </p>
                </div>

                {/* Streamlined Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSpecificEpModal('new')}
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Episode Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchCreateModalOpen(true)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#00CFFF] border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Create multiple episode slots at once"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Batch Add Episodes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(true)}
                    className="px-3 py-1.5 bg-[#1683FF]/15 hover:bg-[#1683FF] text-[#00CFFF] hover:text-white border border-[#1683FF]/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Bulk Paste Links</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllSeasonEpisodes}
                    disabled={savingAllEpisodes || seasonEpisodes.length === 0}
                    className="px-4 py-1.5 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#1683FF]/30 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingAllEpisodes ? 'Saving All...' : 'Save All Episodes'}</span>
                  </button>
                </div>
              </div>

              {/* Filtering and Search Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#050A14] border border-white/5">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-[#64748B]" />
                  <div className="flex items-center gap-1 bg-[#0B1322] p-0.5 rounded-lg border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEpStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        epStatusFilter === 'all'
                          ? 'bg-[#1683FF] text-white'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      All ({seasonEpisodes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEpStatusFilter('missing')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        epStatusFilter === 'missing'
                          ? 'bg-amber-500 text-black'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      Needs Links ({seasonEpisodes.length - completedEpisodeCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEpStatusFilter('complete')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        epStatusFilter === 'complete'
                          ? 'bg-emerald-600 text-white'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      Complete ({completedEpisodeCount})
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3 h-3 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={epSearchQuery}
                    onChange={(e) => setEpSearchQuery(e.target.value)}
                    placeholder="Find episode number/title..."
                    className="w-full bg-[#0B1322] border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-[#64748B] outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              {/* Episodes List */}
              {loadingEpisodes ? (
                <div className="p-12 text-center text-xs text-[#94A3B8] space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#1683FF]" />
                  <p>Loading season episodes...</p>
                </div>
              ) : seasonEpisodes.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#94A3B8] rounded-xl bg-[#050A14] border border-white/5 space-y-3">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p>No episodes found for Season {selectedSeasonNumber}.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSpecificEpModal('new')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all text-xs"
                    >
                      + Add Episode 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchCreateModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-white/5 text-[#00CFFF] font-bold hover:bg-white/10 border border-white/10 transition-all text-xs"
                    >
                      + Batch Create Ep 1 to 12
                    </button>
                  </div>
                </div>
              ) : displayedSeasonEpisodes.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#94A3B8] rounded-xl bg-[#050A14] border border-white/5">
                  No episodes match the selected filter or search query.
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedSeasonEpisodes.map((ep) => {
                    const epId = ep.id || '';
                    const epLinks = epDownloadsMap[epId] || {
                      '720p': { url: '', size: '~240 MB' },
                      '1080p': { url: '', size: '~480 MB' },
                    };
                    const isSaving = savingEpId === epId;
                    const isJustSaved = savedSuccessEpId === epId;

                    const has720 = Boolean(epLinks['720p']?.url.trim());
                    const has1080 = Boolean(epLinks['1080p']?.url.trim());
                    const isComplete = has720 && has1080;

                    return (
                      <div
                        key={epId}
                        className={`p-4 rounded-xl bg-[#050A14] border transition-all space-y-3 ${
                          isComplete
                            ? 'border-emerald-500/20 hover:border-emerald-500/40'
                            : has720 || has1080
                            ? 'border-amber-500/20 hover:border-amber-500/40'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Top info line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2.5 py-1 rounded-lg bg-[#1683FF]/15 text-[#00CFFF] border border-[#1683FF]/30 text-xs font-black shrink-0">
                              EP {ep.episodeNumber}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {ep.title || `Episode ${ep.episodeNumber}`}
                            </span>

                            {/* Status Pill */}
                            {isComplete ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Both 720p & 1080p Ready</span>
                              </span>
                            ) : has1080 ? (
                              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                                1080p Only (720p Missing)
                              </span>
                            ) : has720 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                720p Only (1080p Missing)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[#64748B] text-[10px] font-semibold">
                                No links added yet
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenSpecificEpModal(epId)}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 text-[11px] font-semibold rounded-lg transition-colors"
                              title="Edit in full modal"
                            >
                              Edit Details
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSaveSingleEpisode(ep)}
                              disabled={isSaving}
                              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                isJustSaved
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-[#1683FF] hover:bg-[#2196FF] text-white shadow-sm'
                              }`}
                            >
                              {isJustSaved ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Saved!</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3" />
                                  <span>{isSaving ? 'Saving...' : 'Save Ep'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Streamlined Form Inputs: 720p HD & 1080p Full HD */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* 720p HD Card */}
                          <div className="p-3 rounded-xl bg-[#0B1322] border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                                  720p HD Link
                                </span>
                                {epLinks['720p']?.url && (
                                  <span className="text-[10px] font-semibold text-[#94A3B8]">
                                    ({detectHostName(epLinks['720p'].url)})
                                  </span>
                                )}
                              </div>

                              {epLinks['720p']?.url && (
                                <a
                                  href={epLinks['720p'].url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Test Link</span>
                                </a>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#94A3B8]">
                                720p Download URL (Mega, Drive, Direct MP4...)
                              </label>
                              <input
                                type="url"
                                value={epLinks['720p']?.url || ''}
                                onChange={(e) => handleEpResChange(epId, '720p', 'url', e.target.value)}
                                placeholder="https://mega.nz/file/... (720p HD)"
                                className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-500 transition-colors"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 space-y-0.5">
                                <label className="text-[9px] font-bold text-[#64748B]">File Size</label>
                                <input
                                  type="text"
                                  value={epLinks['720p']?.size || ''}
                                  onChange={(e) => handleEpResChange(epId, '720p', 'size', e.target.value)}
                                  placeholder="e.g. ~240 MB"
                                  className="w-full bg-[#050A14] border border-white/5 rounded-md px-2 py-1 text-[11px] text-[#94A3B8] outline-none focus:border-white/20"
                                />
                              </div>

                              {/* Quick copy 1080p URL to 720p if empty */}
                              {!epLinks['720p']?.url && epLinks['1080p']?.url && (
                                <button
                                  type="button"
                                  onClick={() => handleEpResChange(epId, '720p', 'url', epLinks['1080p'].url)}
                                  className="mt-3 px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-[#94A3B8] rounded border border-white/5 transition-colors"
                                  title="Copy 1080p link to 720p"
                                >
                                  Copy from 1080p
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 1080p Full HD Card */}
                          <div className="p-3 rounded-xl bg-[#0B1322] border border-[#1683FF]/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-[#1683FF]/20 text-[#00CFFF] border border-[#1683FF]/30 text-[10px] font-black uppercase tracking-wider">
                                  1080p Full HD Link
                                </span>
                                {epLinks['1080p']?.url && (
                                  <span className="text-[10px] font-semibold text-[#94A3B8]">
                                    ({detectHostName(epLinks['1080p'].url)})
                                  </span>
                                )}
                              </div>

                              {epLinks['1080p']?.url && (
                                <a
                                  href={epLinks['1080p'].url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[#00CFFF] hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Test Link</span>
                                </a>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#94A3B8]">
                                1080p Download URL (Mega, Drive, Direct MP4...)
                              </label>
                              <input
                                type="url"
                                value={epLinks['1080p']?.url || ''}
                                onChange={(e) => handleEpResChange(epId, '1080p', 'url', e.target.value)}
                                placeholder="https://mega.nz/file/... (1080p FHD)"
                                className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-[#1683FF] transition-colors"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 space-y-0.5">
                                <label className="text-[9px] font-bold text-[#64748B]">File Size</label>
                                <input
                                  type="text"
                                  value={epLinks['1080p']?.size || ''}
                                  onChange={(e) => handleEpResChange(epId, '1080p', 'size', e.target.value)}
                                  placeholder="e.g. ~480 MB"
                                  className="w-full bg-[#050A14] border border-white/5 rounded-md px-2 py-1 text-[11px] text-[#94A3B8] outline-none focus:border-white/20"
                                />
                              </div>

                              {/* Quick copy 720p URL to 1080p if empty */}
                              {!epLinks['1080p']?.url && epLinks['720p']?.url && (
                                <button
                                  type="button"
                                  onClick={() => handleEpResChange(epId, '1080p', 'url', epLinks['720p'].url)}
                                  className="mt-3 px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-[#94A3B8] rounded border border-white/5 transition-colors"
                                  title="Copy 720p link to 1080p"
                                >
                                  Copy from 720p
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom save all button */}
              {displayedSeasonEpisodes.length > 0 && (
                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <div className="text-xs text-[#94A3B8]">
                    Showing {displayedSeasonEpisodes.length} of {seasonEpisodes.length} season episodes
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAllSeasonEpisodes}
                    disabled={savingAllEpisodes}
                    className="px-5 py-2 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-[#1683FF]/30 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingAllEpisodes ? 'Saving All...' : 'Save All Season Episodes'}</span>
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* =========================================================================
            MODAL: QUICK ADD / UPDATE SPECIFIC EPISODE
           ========================================================================= */}
        {specificEpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0B1322] border border-white/10 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {specificEpTarget === 'new'
                        ? 'Add Episode Download Link'
                        : `Edit Downloads for Episode ${specificEpNumber}`}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">
                      {selectedAnime?.title} • Season {selectedSeasonNumber}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSpecificEpModalOpen(false)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Episode Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Episode Number</label>
                  <input
                    type="number"
                    min="1"
                    value={specificEpNumber}
                    onChange={(e) => setSpecificEpNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Episode Title</label>
                  <input
                    type="text"
                    value={specificEpTitle}
                    onChange={(e) => setSpecificEpTitle(e.target.value)}
                    placeholder="e.g. The Beginning"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              {/* 720p HD Link Input */}
              <div className="p-3.5 rounded-xl bg-[#050A14] border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    720p HD Download
                  </span>
                  {specific720Url && (
                    <span className="text-[10px] text-[#94A3B8]">
                      {detectHostName(specific720Url)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8]">720p Download URL</label>
                  <input
                    type="url"
                    value={specific720Url}
                    onChange={(e) => setSpecific720Url(e.target.value)}
                    placeholder="https://mega.nz/... (720p link)"
                    className="w-full bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8]">Estimated Size</label>
                  <input
                    type="text"
                    value={specific720Size}
                    onChange={(e) => setSpecific720Size(e.target.value)}
                    placeholder="e.g. ~240 MB"
                    className="w-full bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 1080p Full HD Link Input */}
              <div className="p-3.5 rounded-xl bg-[#050A14] border border-[#1683FF]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#00CFFF] uppercase tracking-wider">
                    1080p Full HD Download
                  </span>
                  {specific1080Url && (
                    <span className="text-[10px] text-[#94A3B8]">
                      {detectHostName(specific1080Url)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8]">1080p Download URL</label>
                  <input
                    type="url"
                    value={specific1080Url}
                    onChange={(e) => setSpecific1080Url(e.target.value)}
                    placeholder="https://mega.nz/... (1080p link)"
                    className="w-full bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8]">Estimated Size</label>
                  <input
                    type="text"
                    value={specific1080Size}
                    onChange={(e) => setSpecific1080Size(e.target.value)}
                    placeholder="e.g. ~480 MB"
                    className="w-full bg-[#0B1322] border border-white/10 rounded-lg px-3 py-1 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSpecificEpModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpecificEpisodeFromModal}
                  disabled={savingSpecificEp}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSpecificEp ? 'Saving...' : 'Save Episode Download'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: BATCH CREATE EPISODE SLOTS
           ========================================================================= */}
        {batchCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1322] border border-white/10 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#00CFFF]" />
                  <span>Batch Create Episode Slots</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setBatchCreateModalOpen(false)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#94A3B8]">
                Generate multiple episode slots for Season {selectedSeasonNumber} so you can easily drop 720p & 1080p download links.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">From Episode</label>
                  <input
                    type="number"
                    min="1"
                    value={batchFromEp}
                    onChange={(e) => setBatchFromEp(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">To Episode</label>
                  <input
                    type="number"
                    min="1"
                    value={batchToEp}
                    onChange={(e) => setBatchToEp(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setBatchCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBatchCreateEpisodes}
                  disabled={creatingBatchEps}
                  className="px-5 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>{creatingBatchEps ? 'Creating...' : `Create Ep ${batchFromEp} to ${batchToEp}`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: BULK PASTE URLS (DUAL 720p & 1080p SUPPORT)
           ========================================================================= */}
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl p-6 rounded-2xl bg-[#0B1322] border border-white/10 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Bulk Paste Episode Download URLs</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Choose Input Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkMode('1080p')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bulkMode === '1080p'
                        ? 'bg-[#1683FF] text-white'
                        : 'bg-white/5 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    Paste 1080p FHD Links
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('720p')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bulkMode === '720p'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/5 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    Paste 720p HD Links
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('dual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bulkMode === 'dual'
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/5 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    Dual Paste (720p & 1080p)
                  </button>
                </div>
              </div>

              {bulkMode === 'dual' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-400">
                      720p HD URLs (1 per line for Ep 1, 2, 3...)
                    </label>
                    <textarea
                      rows={8}
                      value={bulk720Text}
                      onChange={(e) => setBulk720Text(e.target.value)}
                      placeholder={`https://mega.nz/720p/ep1.mp4\nhttps://mega.nz/720p/ep2.mp4`}
                      className="w-full bg-[#050A14] border border-emerald-500/30 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#00CFFF]">
                      1080p FHD URLs (1 per line for Ep 1, 2, 3...)
                    </label>
                    <textarea
                      rows={8}
                      value={bulk1080Text}
                      onChange={(e) => setBulk1080Text(e.target.value)}
                      placeholder={`https://mega.nz/1080p/ep1.mp4\nhttps://mega.nz/1080p/ep2.mp4`}
                      className="w-full bg-[#050A14] border border-[#1683FF]/40 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-[#1683FF]"
                    />
                  </div>
                </div>
              ) : bulkMode === '720p' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Paste 720p URLs (1 URL per episode, in order Ep 1, Ep 2...)
                  </label>
                  <textarea
                    rows={8}
                    value={bulk720Text}
                    onChange={(e) => setBulk720Text(e.target.value)}
                    placeholder={`https://mega.nz/720p/ep1.mp4\nhttps://mega.nz/720p/ep2.mp4\nhttps://mega.nz/720p/ep3.mp4`}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-[#1683FF]"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Paste 1080p URLs (1 URL per episode, in order Ep 1, Ep 2...)
                  </label>
                  <textarea
                    rows={8}
                    value={bulk1080Text}
                    onChange={(e) => setBulk1080Text(e.target.value)}
                    placeholder={`https://mega.nz/1080p/ep1.mp4\nhttps://mega.nz/1080p/ep2.mp4\nhttps://mega.nz/1080p/ep3.mp4`}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-[#1683FF]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkUrls}
                  className="px-5 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs text-white font-bold"
                >
                  Apply URLs to Episodes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
