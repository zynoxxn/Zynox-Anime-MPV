import React, { useState, useEffect } from 'react';
import type { Anime, AnimeSeasonEntry, ZipDownloadPackage } from '../../types/anime';
import { createAnime, getAnimeById, updateAnime, getAllAnimes } from '../../lib/firestore/anime';
import { getCmsGenres, getCmsStatuses, getCmsYears, getCmsTypes, getCmsLanguages, getCmsStudios, logAdminActivity } from '../../lib/firestore/cms';
import { generateAnimeSeoMetadata, generateAnimeGoogleTags } from '../../lib/seo';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import { AdminImageUploader } from '../../components/admin/AdminImageUploader';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Sparkles,
  Film,
  Calendar,
  Layers,
  Globe,
  Tag,
  CheckCircle2,
  Tv,
  Download,
  Plus,
  Trash2,
  Link as LinkIcon,
  PlusCircle,
  Edit2,
  Play,
  Hash,
  ExternalLink,
} from 'lucide-react';

interface AdminAnimeFormViewProps {
  animeId?: string;
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminAnimeFormView: React.FC<AdminAnimeFormViewProps> = ({
  animeId,
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin } = useAuth();
  const isEditMode = Boolean(animeId);
  const isSuperAdmin = Boolean(
    isAdmin || (user?.email && user.email.toLowerCase() === 'zairoxmax2.0@gmail.com')
  );

  // Form States
  const [title, setTitle] = useState('');
  const [japaneseTitle, setJapaneseTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [poster, setPoster] = useState('');
  const [banner, setBanner] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadBatchUrl, setDownloadBatchUrl] = useState('');
  const [downloadLinks, setDownloadLinks] = useState<
    { quality: string; size: string; url: string; host: string }[]
  >([]);
  const [zipDownloads, setZipDownloads] = useState<ZipDownloadPackage[]>([]);
  const [genresInput, setGenresInput] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [type, setType] = useState('TV');
  const [status, setStatus] = useState<'ongoing' | 'completed' | 'upcoming'>('ongoing');
  const [year, setYear] = useState<number>(2026);
  const [season, setSeason] = useState('Winter 2026');
  const [audioLanguage, setAudioLanguage] = useState('Hindi Dub & Japanese Sub');
  const [studio, setStudio] = useState('');
  const [totalEpisodes, setTotalEpisodes] = useState<number>(12);
  const [duration, setDuration] = useState('24m');
  const [rating, setRating] = useState<number>(8.5);
  const [ageRating, setAgeRating] = useState('PG-13');
  const [releaseDay, setReleaseDay] = useState('');
  const [releaseTime, setReleaseTime] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [isTrending, setIsTrending] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [published, setPublished] = useState(true);

  // SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');

  // Taxonomies for quick select
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [allCatalogAnimes, setAllCatalogAnimes] = useState<Anime[]>([]);

  // Multi-Season Management (Season 1, Season 2, Shippuden, etc.)
  const [seasonsList, setSeasonsList] = useState<AnimeSeasonEntry[]>([]);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeasonIndex, setEditingSeasonIndex] = useState<number | null>(null);
  const [seasonModalData, setSeasonModalData] = useState<Partial<AnimeSeasonEntry>>({
    seasonNumber: 1,
    title: 'Season 1',
    totalEpisodes: 12,
    year: 2026,
    status: 'ongoing',
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'seasons' | 'media' | 'schedule' | 'seo'>('basic');
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load taxonomies and existing animes for season relations
    const loadTaxonomies = async () => {
      try {
        const [gList, tList, lList, animesList] = await Promise.all([
          getCmsGenres().catch(() => []),
          getCmsTypes().catch(() => []),
          getCmsLanguages().catch(() => []),
          getAllAnimes().catch(() => []),
        ]);
        setAvailableGenres(gList.map((g) => g.name));
        setAvailableTypes(tList.map((t) => t.name));
        setAvailableLanguages(lList.map((l) => l.name));
        setAllCatalogAnimes(animesList);
      } catch (err) {
        console.error('Failed to fetch taxonomies:', err);
      }
    };
    loadTaxonomies();

    if (isEditMode && animeId) {
      const loadAnime = async () => {
        try {
          setLoading(true);
          const data = await getAnimeById(animeId);
          if (data) {
            setTitle(data.title || '');
            setJapaneseTitle(data.japaneseTitle || '');
            setSlug(data.slug || '');
            setDescription(data.description || '');
            setPoster(data.poster || '');
            setBanner(data.banner || '');
            setTrailerUrl(data.trailerUrl || '');
            setSelectedGenres(data.genres || []);
            setGenresInput(data.genres ? data.genres.join(', ') : '');
            setType(data.type || 'TV');
            setStatus((data.status as any) || 'ongoing');
            setYear(data.year || 2026);
            setSeason(data.season || 'Winter 2026');
            setAudioLanguage(data.audioLanguage || 'Hindi Dub');
            setStudio(data.studio || '');
            setTotalEpisodes(data.totalEpisodes || 12);
            setDuration(data.duration || '24m');
            setRating(data.rating || 8.5);
            setAgeRating(data.ageRating || 'PG-13');
            setReleaseDay(data.releaseDay || '');
            setReleaseTime(data.releaseTime || '');
            setTimezone(data.timezone || 'Asia/Kolkata');
            setIsTrending(data.trending || data.isTrending || false);
            setIsPopular(data.popular || data.isPopular || false);
            setIsFeatured(data.featured || data.isFeatured || false);
            setPublished(data.published ?? true);

            // Populate seasons list if present
            if (data.seasonsList && data.seasonsList.length > 0) {
              setSeasonsList(data.seasonsList);
            }

            setDownloadUrl(data.downloadUrl || '');
            setDownloadBatchUrl(data.downloadBatchUrl || '');
            if (data.downloadLinks && data.downloadLinks.length > 0) {
              setDownloadLinks(data.downloadLinks);
            }
            if (data.zipDownloads && data.zipDownloads.length > 0) {
              setZipDownloads(data.zipDownloads);
            }

            setMetaTitle(data.seoTitle || data.metaTitle || '');
            setMetaDescription(data.seoDescription || data.metaDescription || '');
            setMetaKeywords(data.seoKeywords || (data.keywords ? data.keywords.join(', ') : ''));
          } else {
            setError('Anime entry not found.');
          }
        } catch (err: any) {
          console.error('Failed to load anime details:', err);
          setError('Failed to fetch anime details.');
        } finally {
          setLoading(false);
        }
      };
      loadAnime();
    }
  }, [isEditMode, animeId]);

  const handleAutoSlug = () => {
    if (!title.trim()) return;
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
  };

  const toggleGenre = (genreName: string) => {
    let updated: string[];
    if (selectedGenres.includes(genreName)) {
      updated = selectedGenres.filter((g) => g !== genreName);
    } else {
      updated = [...selectedGenres, genreName];
    }
    setSelectedGenres(updated);
    setGenresInput(updated.join(', '));
  };

  const handleAddDownloadLink = () => {
    setDownloadLinks((prev) => [
      ...prev,
      {
        quality: '1080p Batch Complete',
        size: '2.4 GB',
        url: '',
        host: 'Mega / Google Drive',
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

  const handleAddZipDownload = () => {
    const nextIdx = zipDownloads.length + 1;
    setZipDownloads((prev) => [
      ...prev,
      {
        id: `zip-${Date.now()}`,
        title: `Zip ${nextIdx} (Season Batch)`,
        seasonNumber: 1,
        url: '',
        size: '2.4 GB',
        quality: '1080p Ultra HD',
        host: 'MegaCloud',
        episodesRange: 'All Episodes Included',
      },
    ]);
  };

  const handleUpdateZipDownload = (
    index: number,
    field: keyof ZipDownloadPackage,
    value: any
  ) => {
    setZipDownloads((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveZipDownload = (index: number) => {
    setZipDownloads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenAddSeason = () => {
    const nextSeasonNum =
      seasonsList.length > 0
        ? Math.max(...seasonsList.map((s) => Number(s.seasonNumber) || 1)) + 1
        : (seasonsList.length === 0 ? 1 : 2);
    setSeasonModalData({
      id: `season-${Date.now()}`,
      seasonNumber: nextSeasonNum,
      title: `${title || 'Anime'} Season ${nextSeasonNum}`,
      poster: poster || '',
      banner: banner || '',
      totalEpisodes: 12,
      year: year || 2026,
      status: 'ongoing',
      animeId: '',
      slug: '',
      description: '',
    });
    setEditingSeasonIndex(null);
    setShowSeasonModal(true);
  };

  const handleOpenEditSeason = (index: number) => {
    const s = seasonsList[index];
    if (!s) return;
    setSeasonModalData({ ...s });
    setEditingSeasonIndex(index);
    setShowSeasonModal(true);
  };

  const handleSaveSeason = () => {
    if (!seasonModalData.seasonNumber) return;
    const item: AnimeSeasonEntry = {
      id: seasonModalData.id || `season-${Date.now()}`,
      seasonNumber: Number(seasonModalData.seasonNumber),
      title: seasonModalData.title?.trim() || `Season ${seasonModalData.seasonNumber}`,
      poster: seasonModalData.poster?.trim() || undefined,
      banner: seasonModalData.banner?.trim() || undefined,
      totalEpisodes: Number(seasonModalData.totalEpisodes) || undefined,
      year: Number(seasonModalData.year) || undefined,
      status: seasonModalData.status || 'ongoing',
      animeId: seasonModalData.animeId?.trim() || undefined,
      slug: seasonModalData.slug?.trim() || undefined,
      description: seasonModalData.description?.trim() || undefined,
    };

    setSeasonsList((prev) => {
      const copy = [...prev];
      if (editingSeasonIndex !== null && editingSeasonIndex >= 0 && editingSeasonIndex < copy.length) {
        copy[editingSeasonIndex] = item;
      } else {
        const existingIdx = copy.findIndex((s) => s.seasonNumber === item.seasonNumber);
        if (existingIdx >= 0) {
          copy[existingIdx] = item;
        } else {
          copy.push(item);
        }
      }
      return copy.sort((a, b) => a.seasonNumber - b.seasonNumber);
    });

    setShowSeasonModal(false);
    setEditingSeasonIndex(null);
  };

  const handleDeleteSeason = (index: number) => {
    setSeasonsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickInitSeasons = () => {
    setSeasonsList([
      {
        id: `season-1`,
        seasonNumber: 1,
        title: `${title || 'Anime'} Season 1`,
        totalEpisodes: totalEpisodes || 12,
        year: year || 2026,
        status: 'completed',
      },
      {
        id: `season-2`,
        seasonNumber: 2,
        title: `${title || 'Anime'} Season 2`,
        totalEpisodes: 12,
        year: (year || 2026) + 1,
        status: 'ongoing',
      },
    ]);
  };

  const handleAutoGenerateSeo = () => {
    if (!title.trim()) {
      onShowMessage('Please enter an anime title first!');
      return;
    }
    const mockAnime: Anime = {
      id: animeId || 'preview',
      title: title.trim(),
      japaneseTitle: japaneseTitle.trim() || undefined,
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description.trim() || `Watch ${title} in Hindi Dub & English Sub in high definition.`,
      poster: poster.trim() || 'https://via.placeholder.com/300x450',
      type: type as any,
      status: status as any,
      year: Number(year) || 2026,
      audioLanguage: audioLanguage || 'Hindi Dub',
      rating: Number(rating) || 8.5,
      genres: selectedGenres.length > 0 ? selectedGenres : ['Action', 'Adventure'],
      published: true,
      totalEpisodes: Number(totalEpisodes) || 12,
      duration: duration || '24m',
    };

    const meta = generateAnimeSeoMetadata(mockAnime, { siteName: 'ZYNOX ANIME' });
    const tags = generateAnimeGoogleTags(mockAnime, { isDownload: true });

    setMetaTitle(meta.title);
    setMetaDescription(meta.description);
    setMetaKeywords(tags.join(', '));
    onShowMessage('Generated Google Search SEO tags successfully!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setActiveSection('basic');
      setError('Anime Title is required.');
      return;
    }

    // Auto-derive or clean slug
    let trimmedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!trimmedSlug) {
      trimmedSlug = trimmedTitle.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (!trimmedSlug) {
      setActiveSection('basic');
      setError('A valid URL Slug is required.');
      return;
    }
    setSlug(trimmedSlug);

    // Fallback poster so creation is never blocked
    let trimmedPoster = poster.trim();
    if (!trimmedPoster) {
      trimmedPoster = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80';
      setPoster(trimmedPoster);
    }

    const trimmedDescription = description.trim() || `${trimmedTitle} is a popular anime streaming on ZYNOX ANIME in high definition with Hindi Dub and English Sub.`;
    if (!description.trim()) {
      setDescription(trimmedDescription);
    }

    const trimmedBanner = banner.trim();

    const parsedGenres = genresInput
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    const validDownloadLinks = downloadLinks.filter((d) => d.url.trim());
    const validZipDownloads = zipDownloads.filter((z) => z.url.trim());

    const payload: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'> = {
      title: trimmedTitle,
      japaneseTitle: japaneseTitle.trim() || undefined,
      slug: trimmedSlug,
      description: trimmedDescription,
      poster: trimmedPoster,
      posterUrl: trimmedPoster,
      banner: trimmedBanner || undefined,
      bannerUrl: trimmedBanner || undefined,
      trailerUrl: trailerUrl.trim() || undefined,
      downloadUrl: downloadUrl.trim() || undefined,
      downloadBatchUrl: downloadBatchUrl.trim() || downloadUrl.trim() || undefined,
      downloadLinks: validDownloadLinks.length > 0 ? validDownloadLinks : undefined,
      zipDownloads: validZipDownloads.length > 0 ? validZipDownloads : undefined,
      seasonsList: seasonsList.length > 0 ? seasonsList : undefined,
      genres: parsedGenres.length > 0 ? parsedGenres : ['Action', 'Fantasy'],
      type,
      status,
      isUpcoming: status === 'upcoming',
      year: Number(year) || 2026,
      season: season.trim() || undefined,
      audioLanguage: audioLanguage.trim() || 'Hindi Dub & Japanese Sub',
      studio: studio.trim() || undefined,
      totalEpisodes: Number(totalEpisodes) || 12,
      duration: duration.trim() || '24m',
      rating: Number(rating) || 8.0,
      ageRating: ageRating.trim() || 'PG-13',
      releaseDay: releaseDay.trim() || undefined,
      releaseTime: releaseTime.trim() || undefined,
      timezone: timezone.trim() || 'Asia/Kolkata',
      trending: isTrending,
      isTrending,
      popular: isPopular,
      isPopular,
      featured: isFeatured,
      isFeatured,
      published,
      seoTitle: metaTitle.trim() || undefined,
      metaTitle: metaTitle.trim() || undefined,
      seoDescription: metaDescription.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      seoKeywords: metaKeywords.trim() || undefined,
      keywords: metaKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (isEditMode && animeId) {
        await updateAnime(animeId, payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Updated Anime Title',
          'Anime',
          animeId,
          trimmedTitle
        );
        onShowMessage('Anime updated successfully.');
      } else {
        const newId = await createAnime(payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Created Anime Title',
          'Anime',
          newId,
          trimmedTitle
        );
        onShowMessage('Anime added successfully to database!');
      }
      navigate('/admin/anime');
    } catch (err: any) {
      console.error('Failed to save anime:', err);
      const msg = err?.message || String(err);
      if (
        err?.code === 'permission-denied' ||
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('missing')
      ) {
        setError(
          'Permission Denied: To add anime into the live database, you must be logged in as the admin (zairoxmax2.0@gmail.com).'
        );
      } else {
        setError(msg || 'An unexpected error occurred while saving.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout currentTab="anime" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/anime')}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs font-bold text-[#1683FF] uppercase tracking-wider">
                Anime Catalog Editor
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {isEditMode ? `Edit: ${title || 'Anime'}` : 'Create New Anime Series'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/anime')}
              className="px-3.5 sm:px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 sm:px-5 py-2.5 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEditMode ? 'Save Anime' : 'Publish Anime'}</span>
            </button>
          </div>
        </div>

        {/* Admin Authentication Status Banner */}
        {!isSuperAdmin && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {!user
                  ? 'You are currently not logged in. To publish anime into the live database, please log in with your admin account (zairoxmax2.0@gmail.com).'
                  : `Logged in as ${user.email}. Only the site admin (zairoxmax2.0@gmail.com) has database write access.`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Sign In as Admin
            </button>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none bg-[#0B1322] border border-white/5 p-2 rounded-2xl">
          {[
            { id: 'basic', label: 'Basic Info', icon: Film },
            {
              id: 'seasons',
              label: `Seasons${seasonsList.length > 0 ? ` (${seasonsList.length})` : ''}`,
              icon: Layers,
            },
            { id: 'media', label: 'Artwork & Media', icon: Download },
            { id: 'schedule', label: 'Release Schedule', icon: Calendar },
            { id: 'seo', label: 'SEO & Highlights', icon: Globe },
          ].map((sec) => {
            const Icon = sec.icon;
            const isCurrent = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: BASIC INFORMATION */}
          {activeSection === 'basic' && (
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-bold text-white">Title & Series Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Anime Title (English/Main) *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleAutoSlug}
                    placeholder="e.g. Solo Leveling"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Japanese / Romaji Title</label>
                  <input
                    type="text"
                    value={japaneseTitle}
                    onChange={(e) => setJapaneseTitle(e.target.value)}
                    placeholder="e.g. 俺だけレベルアップな件"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#94A3B8]">URL Slug (Identifier) *</label>
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    className="text-[10px] text-[#1683FF] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Generate from Title
                  </button>
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="solo-leveling"
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-[#1683FF]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#94A3B8]">Synopsis / Overview *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="In a world where hunters must battle deadly monsters to protect humanity..."
                  className="w-full bg-[#050A14] border border-white/10 rounded-2xl p-3.5 text-xs text-white leading-relaxed outline-none focus:border-[#1683FF] resize-none"
                  required
                />
              </div>

              {/* Poster Direct Image Upload with Firebase Storage in Tab 1 */}
              <div className="pt-2 border-t border-white/5">
                <AdminImageUploader
                  label="Poster Image"
                  type="poster"
                  currentUrl={poster}
                  animeId={animeId || slug}
                  onUrlChange={setPoster}
                  required
                  recommendedText="Recommended 3:4 portrait (Max 5MB • JPG, PNG, WEBP)"
                />
              </div>

              {/* Genres Tag Picker */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-[#94A3B8]">Genres Selection</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableGenres.map((g) => {
                    const isSelected = selectedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#1683FF] text-white shadow-sm'
                            : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom comma-separated genres..."
                  value={genresInput}
                  onChange={(e) => setGenresInput(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#1683FF] mt-2"
                />
              </div>

              {/* Taxonomy attributes grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Format / Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    <option value="TV">TV Series</option>
                    <option value="Movie">Movie</option>
                    <option value="OVA">OVA</option>
                    <option value="ONA">ONA</option>
                    <option value="Special">Special</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Studio</label>
                  <input
                    type="text"
                    placeholder="e.g. A-1 Pictures"
                    value={studio}
                    onChange={(e) => setStudio(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Total Episodes</label>
                  <input
                    type="number"
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Rating Score</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value) || 8.0)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-4 p-3 bg-[#1683FF]/10 border border-[#1683FF]/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#F8FAFC]">
                    <Layers className="w-4 h-4 text-[#1683FF] shrink-0" />
                    <span>
                      <strong>Multi-Season series?</strong> (e.g. Naruto Season 1, Season 2, etc.) Manage and link seasons in the{' '}
                      <span className="text-[#00CFFF] font-bold">Seasons & Franchise</span> tab!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('seasons')}
                    className="px-3 py-1 bg-[#1683FF] hover:bg-[#1268cc] text-white text-[11px] font-bold rounded-lg transition-all shrink-0 cursor-pointer"
                  >
                    Open Seasons Tab →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEASONS & MULTI-SEASON FRANCHISE */}
          {activeSection === 'seasons' && (
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1683FF]" />
                    <h3 className="text-sm sm:text-base font-bold text-white">Multi-Season & Franchise Manager</h3>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
                    Add and organize multiple seasons like Naruto (Season 1, Season 2, Shippuden) or Demon Slayer.
                    Users will see interactive Season tabs on the anime and episode watch pages.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {seasonsList.length === 0 && (
                    <button
                      type="button"
                      onClick={handleQuickInitSeasons}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quick Setup S1 & S2</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenAddSeason}
                    className="px-4 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold rounded-xl shadow-md shadow-[#1683FF]/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Season</span>
                  </button>
                </div>
              </div>

              {/* Seasons List Cards */}
              {seasonsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1683FF]/10 border border-[#1683FF]/20 text-[#1683FF] flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No explicit seasons configured yet</h4>
                  <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                    By default, episodes are assigned to Season 1. To organize your anime with multiple seasons (e.g. Season 1, Season 2, Season 3), click below to add your seasons!
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleQuickInitSeasons}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Setup Default Season 1 & 2</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddSeason}
                      className="px-4 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Season 1</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {seasonsList.map((s, idx) => {
                    const linkedAnime = s.animeId ? allCatalogAnimes.find((a) => a.id === s.animeId) : null;
                    return (
                      <div
                        key={s.id || `season-${s.seasonNumber}-${idx}`}
                        className="bg-[#050A14] border border-white/10 hover:border-[#1683FF]/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          {s.poster ? (
                            <div className="relative w-11 h-15 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#050A14] group">
                              <img
                                src={s.poster}
                                alt={s.title || `S${s.seasonNumber}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-black text-center text-white py-0.5">
                                S{s.seasonNumber}
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#1683FF]/10 border border-[#1683FF]/30 text-[#1683FF] font-black text-sm flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] text-[#94A3B8] font-bold">S</span>
                              <span>{s.seasonNumber}</span>
                            </div>
                          )}

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white truncate">
                                {s.title || `Season ${s.seasonNumber}`}
                              </h4>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {s.status || 'ongoing'}
                              </span>
                              {s.poster && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Custom Poster
                                </span>
                              )}
                              {s.banner && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  Custom Banner
                                </span>
                              )}
                              {linkedAnime && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" />
                                  Linked: {linkedAnime.title}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-[#94A3B8] flex items-center gap-3 flex-wrap">
                              <span>Season #{s.seasonNumber}</span>
                              {s.year && <span>• Year: {s.year}</span>}
                              {s.totalEpisodes && <span>• {s.totalEpisodes} Episodes</span>}
                              <span>• Mode: {s.animeId ? 'Linked Series' : 'Internal Episodes'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
                          {animeId && (
                            <>
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/episodes/new?animeId=${animeId}&season=${s.seasonNumber}`)}
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title={`Add new episode directly to Season ${s.seasonNumber}`}
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+ Add Ep to S{s.seasonNumber}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/episodes?animeId=${animeId}&season=${s.seasonNumber}`)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title={`View all episodes in Season ${s.seasonNumber}`}
                              >
                                <Play className="w-3.5 h-3.5 text-cyan-400" />
                                <span>View Eps</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditSeason(idx)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                            title="Edit season details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSeason(idx)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            title="Remove season"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEDIA & ARTWORK */}
          {activeSection === 'media' && (
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-bold text-white">Artwork & Media Links</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AdminImageUploader
                  label="Poster Image"
                  type="poster"
                  currentUrl={poster}
                  animeId={animeId || slug}
                  onUrlChange={setPoster}
                  required
                  recommendedText="Portrait 3:4 (Max 5MB • JPG, PNG, WEBP)"
                />

                <AdminImageUploader
                  label="Wide Hero Banner"
                  type="banner"
                  currentUrl={banner}
                  animeId={animeId || slug}
                  onUrlChange={setBanner}
                  recommendedText="Landscape 16:9 (Max 10MB • JPG, PNG, WEBP)"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-[#94A3B8]">Official Trailer URL (YouTube Embed / MP4)</label>
                <input
                  type="text"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                />
              </div>

              {/* Full Series / Batch Download Links Section */}
              <div className="pt-4 border-t border-white/5 space-y-6">
                {/* Promo banner to episode-wise downloads */}
                {isEditMode && animeId && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1683FF]/15 via-emerald-500/10 to-amber-500/10 border border-[#1683FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-[#00CFFF]" />
                        <span>Episode MP4 Links Manager (360p, 480p, 720p, 1080p)</span>
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        Drop individual episode MP4 links for all resolutions or use the bulk paste tool.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/downloads?animeId=${animeId}`)}
                      className="px-4 py-2 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold rounded-xl shadow-md shadow-[#1683FF]/30 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Manage Episode Downloads</span>
                    </button>
                  </div>
                )}

                {/* Zip 1, Zip 2 Downloads Manager */}
                <div className="p-4 rounded-2xl bg-[#050A14] border border-amber-500/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Zip Downloads (Zip 1, Zip 2 Links)</span>
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        Provide batch zip archives for users to download entire seasons or episode packs in 1 click.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/downloads?animeId=${animeId}`)}
                          className="px-3 py-1.5 bg-[#1683FF]/20 hover:bg-[#1683FF] text-[#00CFFF] hover:text-white border border-[#1683FF]/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                          title="Open Bulk Downloads Manager (360p, 480p, 720p, 1080p, Zip 1, Zip 2)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Bulk Downloads Manager</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddZipDownload}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Zip Link</span>
                      </button>
                    </div>
                  </div>

                  {zipDownloads.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#0B1322] border border-white/5 text-center text-xs text-[#94A3B8]">
                      No Zip packages added yet. Click &ldquo;+ Add Zip Link&rdquo; to add Zip 1, Zip 2, etc.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {zipDownloads.map((pkg, idx) => (
                        <div
                          key={pkg.id || idx}
                          className="p-3.5 bg-[#0B1322] border border-white/10 rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide">
                              Zip #{idx + 1}: {pkg.title || `Zip ${idx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveZipDownload(idx)}
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                              title="Remove Zip"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#94A3B8]">Zip Label / Title</label>
                              <input
                                type="text"
                                value={pkg.title}
                                onChange={(e) => handleUpdateZipDownload(idx, 'title', e.target.value)}
                                placeholder="e.g. Zip 1: Batch Episodes 01-12"
                                className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="space-y-1 lg:col-span-2">
                              <label className="text-[10px] font-bold text-[#94A3B8]">Zip Download URL</label>
                              <input
                                type="url"
                                value={pkg.url}
                                onChange={(e) => handleUpdateZipDownload(idx, 'url', e.target.value)}
                                placeholder="https://mega.nz/... or https://drive.google.com/..."
                                className="w-full bg-[#050A14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#94A3B8]">Size & Quality</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={pkg.size || ''}
                                  onChange={(e) => handleUpdateZipDownload(idx, 'size', e.target.value)}
                                  placeholder="2.4 GB"
                                  className="w-1/2 bg-[#050A14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                                />
                                <input
                                  type="text"
                                  value={pkg.quality || ''}
                                  onChange={(e) => handleUpdateZipDownload(idx, 'quality', e.target.value)}
                                  placeholder="1080p"
                                  className="w-1/2 bg-[#050A14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary & Batch Fallback Links */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Direct & Mirror URLs</span>
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        Add direct download URLs and multi-host mirror links.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddDownloadLink}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Mirror</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#94A3B8]">
                        Primary Series Download URL
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={downloadUrl}
                          onChange={(e) => setDownloadUrl(e.target.value)}
                          placeholder="https://mega.nz/... or https://mediafire.com/..."
                          className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#94A3B8]">
                        Batch Zip / Full Season Mirror Link
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={downloadBatchUrl}
                          onChange={(e) => setDownloadBatchUrl(e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/..."
                          className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {downloadLinks.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-bold text-[#94A3B8]">Custom Mirrors:</div>
                      {downloadLinks.map((dl, index) => (
                        <div
                          key={index}
                          className="p-3.5 bg-[#050A14] border border-white/5 rounded-2xl space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#94A3B8]">Batch Mirror #{index + 1}</span>
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
                              <label className="text-[10px] font-bold text-[#94A3B8]">Quality / Batch Label</label>
                              <input
                                type="text"
                                value={dl.quality}
                                onChange={(e) => handleUpdateDownloadLink(index, 'quality', e.target.value)}
                                placeholder="e.g. 1080p Batch Complete"
                                className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#94A3B8]">Hosting Provider</label>
                              <input
                                type="text"
                                value={dl.host}
                                onChange={(e) => handleUpdateDownloadLink(index, 'host', e.target.value)}
                                placeholder="Mega / GDrive / Telegram"
                                className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#94A3B8]">Total Size</label>
                              <input
                                type="text"
                                value={dl.size}
                                onChange={(e) => handleUpdateDownloadLink(index, 'size', e.target.value)}
                                placeholder="e.g. 2.4 GB"
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
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE & BROADCAST */}
          {activeSection === 'schedule' && (
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-bold text-white">Broadcast Status & Schedule Matrix</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Air Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    <option value="ongoing">Currently Airing (Ongoing)</option>
                    <option value="completed">Finished Airing (Completed)</option>
                    <option value="upcoming">Upcoming Releases</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Release Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Broadcast Season</label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="e.g. Winter 2026"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Weekly Release Day</label>
                  <select
                    value={releaseDay}
                    onChange={(e) => setReleaseDay(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    <option value="">None / Not Scheduled</option>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Air Time (24-Hour format)</label>
                  <input
                    type="text"
                    value={releaseTime}
                    onChange={(e) => setReleaseTime(e.target.value)}
                    placeholder="e.g. 20:00"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Primary Audio Languages</label>
                  <input
                    type="text"
                    value={audioLanguage}
                    onChange={(e) => setAudioLanguage(e.target.value)}
                    placeholder="Hindi Dub, Japanese Sub"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HIGHLIGHTS & SEO */}
          {activeSection === 'seo' && (
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
              <h3 className="text-sm font-bold text-white">Homepage Promotion & SEO Snippets</h3>

              {/* Promotional toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#050A14] border border-white/5 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTrending}
                    onChange={(e) => setIsTrending(e.target.checked)}
                    className="rounded accent-[#1683FF]"
                  />
                  <span className="text-xs font-bold text-white">Trending Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span className="text-xs font-bold text-white">Popular Leaderboard</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-white">Featured Spotlight</span>
                </label>
              </div>

              {/* SEO Meta */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Globe className="w-4 h-4 text-[#1683FF]" />
                    <span>Search Engine Optimization & Google Meta</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSeo}
                    className="px-3 py-1.5 bg-[#1683FF]/10 hover:bg-[#1683FF]/20 text-[#1683FF] border border-[#1683FF]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-Generate SEO Tags</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Custom Meta Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={`Watch ${title || 'Anime'} Hindi Dub HD Online`}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">Custom Meta Description</label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={`Stream all episodes of ${title || 'Anime'} in high definition with English & Hindi Dub.`}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#1683FF] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">SEO Keywords</label>
                  <input
                    type="text"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="anime, hindi dub, free streaming, hd episodes"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="anime-published"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="anime-published" className="text-xs font-semibold text-white">
                    Published & Live (Uncheck to keep as draft)
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Bottom Save Action Bar */}
        <div className="bg-[#0B1322] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/anime')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 sm:px-6 py-2.5 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isEditMode ? 'Save Anime Series' : 'Publish Anime Series'}</span>
          </button>
        </div>
      </div>

      {/* Season Add / Edit Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative bg-[#0B1322] border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full my-auto shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header (Sticky) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#0B1322] shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#1683FF]" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {editingSeasonIndex !== null ? 'Edit Season' : 'Add New Season'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSeasonModal(false);
                  setEditingSeasonIndex(null);
                }}
                className="text-xs text-[#94A3B8] hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Smooth Scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Season Number *</label>
                  <input
                    type="number"
                    min={1}
                    value={seasonModalData.seasonNumber || 1}
                    onChange={(e) =>
                      setSeasonModalData((prev) => ({
                        ...prev,
                        seasonNumber: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    required
                  />
                  <span className="text-[10px] text-[#64748B]">e.g. 1, 2, 3</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Release Year</label>
                  <input
                    type="number"
                    value={seasonModalData.year || 2026}
                    onChange={(e) =>
                      setSeasonModalData((prev) => ({
                        ...prev,
                        year: parseInt(e.target.value, 10) || 2026,
                      }))
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Season Title / Label *</label>
                <input
                  type="text"
                  value={seasonModalData.title || ''}
                  onChange={(e) =>
                    setSeasonModalData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Season 2, Naruto Season 2, Shippuden"
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  required
                />
              </div>

              {/* Season Poster Image Direct Upload */}
              <div className="pt-1">
                <AdminImageUploader
                  label="Season Poster Image"
                  type="poster"
                  currentUrl={seasonModalData.poster || ''}
                  animeId={`${animeId || slug || 'season'}_s${seasonModalData.seasonNumber || '1'}`}
                  onUrlChange={(url) =>
                    setSeasonModalData((prev) => ({
                      ...prev,
                      poster: url,
                    }))
                  }
                  recommendedText="Leave empty to inherit main anime poster (Max 5MB)"
                />
              </div>

              {/* Season Banner Image Direct Upload */}
              <div className="pt-1">
                <AdminImageUploader
                  label="Season Banner / Backdrop Image"
                  type="banner"
                  currentUrl={seasonModalData.banner || ''}
                  animeId={`${animeId || slug || 'season'}_s${seasonModalData.seasonNumber || '1'}`}
                  onUrlChange={(url) =>
                    setSeasonModalData((prev) => ({
                      ...prev,
                      banner: url,
                    }))
                  }
                  recommendedText="Optional hero backdrop (Max 10MB)"
                />
              </div>

              {/* Season Description */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Season Synopsis / Story Arc Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={seasonModalData.description || ''}
                  onChange={(e) =>
                    setSeasonModalData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g. In Season 2, Ichigo and his allies infiltrate the Soul Society..."
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Total Episodes</label>
                  <input
                    type="number"
                    value={seasonModalData.totalEpisodes || 12}
                    onChange={(e) =>
                      setSeasonModalData((prev) => ({
                        ...prev,
                        totalEpisodes: parseInt(e.target.value, 10) || 12,
                      }))
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Status</label>
                  <select
                    value={seasonModalData.status || 'ongoing'}
                    onChange={(e) =>
                      setSeasonModalData((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <label className="text-[11px] font-bold text-[#94A3B8] flex items-center gap-1">
                  <LinkIcon className="w-3 h-3 text-[#1683FF]" />
                  <span>Link to Another Anime in Catalog (Optional)</span>
                </label>
                <select
                  value={seasonModalData.animeId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const linked = allCatalogAnimes.find((a) => a.id === selectedId);
                    setSeasonModalData((prev) => ({
                      ...prev,
                      animeId: selectedId || undefined,
                      slug: linked?.slug || undefined,
                    }));
                  }}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                >
                  <option value="">None (Episodes are stored inside this series)</option>
                  {allCatalogAnimes
                    .filter((a) => a.id !== animeId)
                    .map((catAnime) => (
                      <option key={catAnime.id} value={catAnime.id}>
                        {catAnime.title} ({catAnime.year || '—'})
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-[#64748B] block">
                  Select if this season is hosted as a separate anime catalog entry (e.g. Naruto Shippuden).
                </span>
              </div>
            </div>

            {/* Modal Footer (Sticky) */}
            <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-white/10 bg-[#070D18] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowSeasonModal(false);
                  setEditingSeasonIndex(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSeason}
                className="px-5 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white shadow-md shadow-[#1683FF]/30 rounded-xl transition-all cursor-pointer"
              >
                {editingSeasonIndex !== null ? 'Update Season' : 'Add Season'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
