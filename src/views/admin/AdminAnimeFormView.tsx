import React, { useState, useEffect, useMemo } from 'react';
import type { Anime, AnimeSeasonEntry, ZipDownloadPackage } from '../../types/anime';
import { createAnime, getAnimeById, updateAnime, deleteAnime } from '../../lib/firestore/anime';
import { getCmsGenres, getCmsTypes, getCmsLanguages, logAdminActivity } from '../../lib/firestore/cms';
import { generateAnimeSeoMetadata, generateAnimeGoogleTags } from '../../lib/seo';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import {
  AdminSegmentedTabs,
  AdminSelect,
  AdminToggle,
  AdminStatusBadge,
  AdminStickySaveBar,
  AdminAccordion,
  AdminImageUploader,
  AdminConfirmDialog,
  AdminListRow,
  AdminRowMenu,
  AdminCopyInput,
  AdminSectionHeader,
  AdminEmptyState,
} from '../../components/admin';
import {
  ArrowLeft,
  Film,
  Image as ImageIcon,
  Sliders,
  Calendar,
  Sparkles,
  Globe,
  Eye,
  Plus,
  Trash2,
  Tv,
  Download,
  ExternalLink,
  Layers,
  Copy,
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
  const { user } = useAuth();
  const isEditMode = Boolean(animeId);

  // Tab State: Details · Seasons · Episodes · Downloads
  const [activeTab, setActiveTab] = useState<'details' | 'seasons' | 'episodes' | 'downloads'>('details');

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

  // Taxonomies
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [seasonsList, setSeasonsList] = useState<AnimeSeasonEntry[]>([]);

  // Modals & Save State
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Season Editor Modal
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeasonIndex, setEditingSeasonIndex] = useState<number | null>(null);
  const [seasonModalData, setSeasonModalData] = useState<Partial<AnimeSeasonEntry>>({});

  // Delete Anime Dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadTaxonomies = async () => {
      try {
        const [gList] = await Promise.all([
          getCmsGenres().catch(() => []),
          getCmsTypes().catch(() => []),
          getCmsLanguages().catch(() => []),
        ]);
        setAvailableGenres(gList.map((g) => g.name));
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
            setType(data.type || 'TV');
            setStatus((data.status as any) || 'ongoing');
            setYear(data.year || 2026);
            setSeason(data.season || 'Winter 2026');
            setAudioLanguage(data.audioLanguage || 'Hindi Dub & Japanese Sub');
            setStudio(data.studio || '');
            setTotalEpisodes(data.totalEpisodes || 12);
            setDuration(data.duration || '24m');
            setRating(data.rating || 8.5);
            setAgeRating(data.ageRating || 'PG-13');
            setReleaseDay(data.releaseDay || '');
            setReleaseTime(data.releaseTime || '');
            setTimezone(data.timezone || 'Asia/Kolkata');
            setIsTrending(Boolean(data.trending || data.isTrending));
            setIsPopular(Boolean(data.popular || data.isPopular));
            setIsFeatured(Boolean(data.featured || data.isFeatured));
            setPublished(data.published !== false);

            if (data.seasonsList && data.seasonsList.length > 0) {
              setSeasonsList(data.seasonsList);
            } else {
              setSeasonsList([]);
            }
            setDownloadUrl(data.downloadUrl || '');
            setDownloadBatchUrl(data.downloadBatchUrl || '');
            setDownloadLinks(data.downloadLinks || []);
            setZipDownloads(data.zipDownloads || []);

            setMetaTitle(data.seoTitle || data.metaTitle || '');
            setMetaDescription(data.seoDescription || data.metaDescription || '');
            setMetaKeywords(data.seoKeywords || (data.keywords ? data.keywords.join(', ') : ''));
          } else {
            setError('Anime entry not found.');
          }
        } catch {
          setError('Failed to fetch anime details.');
        } finally {
          setLoading(false);
          setIsDirty(false);
        }
      };
      loadAnime();
    } else {
      // Clear form state completely for Create Mode to prevent state leak
      setTitle('');
      setJapaneseTitle('');
      setSlug('');
      setDescription('');
      setPoster('');
      setBanner('');
      setTrailerUrl('');
      setSelectedGenres([]);
      setType('TV');
      setStatus('ongoing');
      setYear(2026);
      setSeason('Winter 2026');
      setAudioLanguage('Hindi Dub & Japanese Sub');
      setStudio('');
      setTotalEpisodes(12);
      setDuration('24m');
      setRating(8.5);
      setAgeRating('PG-13');
      setReleaseDay('');
      setReleaseTime('');
      setTimezone('Asia/Kolkata');
      setIsTrending(false);
      setIsPopular(false);
      setIsFeatured(false);
      setPublished(false);
      setSeasonsList([]);
      setDownloadUrl('');
      setDownloadBatchUrl('');
      setDownloadLinks([]);
      setZipDownloads([]);
      setMetaTitle('');
      setMetaDescription('');
      setMetaKeywords('');
      setIsDirty(false);
      setLoading(false);
      setError(null);
    }
  }, [isEditMode, animeId]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleAutoSlug = () => {
    if (!title.trim()) return;
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
    markDirty();
  };

  const toggleGenre = (genreName: string) => {
    let updated: string[];
    if (selectedGenres.includes(genreName)) {
      updated = selectedGenres.filter((g) => g !== genreName);
    } else {
      updated = [...selectedGenres, genreName];
    }
    setSelectedGenres(updated);
    markDirty();
  };

  const handleAutoGenerateSeo = () => {
    if (!title.trim()) {
      onShowMessage('Enter an anime title first.');
      return;
    }
    const mockAnime: Anime = {
      id: animeId || 'preview',
      title: title.trim(),
      japaneseTitle: japaneseTitle.trim() || undefined,
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description.trim() || `Watch ${title} in Hindi Dub & English Sub.`,
      poster: poster.trim() || 'https://via.placeholder.com/300x450',
      type: type as any,
      status: status as any,
      year: Number(year) || 2026,
      audioLanguage: audioLanguage || 'Hindi Dub',
      rating: Number(rating) || 8.5,
      genres: selectedGenres.length > 0 ? selectedGenres : ['Action', 'Fantasy'],
      published: true,
      totalEpisodes: Number(totalEpisodes) || 12,
      duration: duration || '24m',
    };

    const meta = generateAnimeSeoMetadata(mockAnime, { siteName: 'ZYNOX ANIME' });
    const tags = generateAnimeGoogleTags(mockAnime, { isDownload: true });

    setMetaTitle(meta.title);
    setMetaDescription(meta.description);
    setMetaKeywords(tags.join(', '));
    markDirty();
    onShowMessage('Generated Google SEO tags.');
  };

  const handleSave = async () => {
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setActiveTab('details');
      setError('Anime title is required.');
      return;
    }

    let trimmedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!trimmedSlug) {
      trimmedSlug = trimmedTitle.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    }
    setSlug(trimmedSlug);

    let trimmedPoster = poster.trim();
    if (!trimmedPoster) {
      trimmedPoster = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80';
      setPoster(trimmedPoster);
    }

    const trimmedDescription = description.trim() || `${trimmedTitle} is streaming on ZYNOX ANIME in Hindi Dub and English Sub.`;
    const trimmedBanner = banner.trim();

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
      downloadLinks: downloadLinks.filter((d) => d.url.trim()),
      zipDownloads: zipDownloads.filter((z) => z.url.trim()),
      seasonsList: seasonsList.length > 0 ? seasonsList : undefined,
      genres: selectedGenres.length > 0 ? selectedGenres : ['Action', 'Fantasy'],
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
      keywords: metaKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      if (isEditMode && animeId) {
        await updateAnime(animeId, payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Updated Anime',
          'Anime',
          animeId,
          trimmedTitle
        );
        onShowMessage(`Saved "${trimmedTitle}".`);
      } else {
        const createdId = await createAnime(payload);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Created Anime',
          'Anime',
          createdId || trimmedSlug,
          trimmedTitle
        );
        onShowMessage(`Created "${trimmedTitle}".`);
        navigate(`/admin/anime/edit/${createdId || trimmedSlug}`);
      }
      setIsDirty(false);
    } catch {
      setError('Failed to save anime.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnime = async () => {
    if (!animeId) return;
    try {
      setIsDeleting(true);
      await deleteAnime(animeId);
      if (slug && slug !== animeId) {
        await deleteAnime(slug).catch(() => {});
      }
      onShowMessage(`"${title}" deleted.`);
      navigate('/admin/anime');
    } catch {
      onShowMessage('Failed to delete anime.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <AdminLayout currentTab="anime" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 pb-24 min-w-0">
        {/* Workspace Header: Back arrow + Poster + Title + StatusBadge + "⋯" Menu */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/admin/anime')}
              className="w-9 h-9 rounded-[10px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center transition-colors shrink-0"
              title="Back to Anime Library"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Poster Thumbnail 40x56 */}
            <div className="w-10 h-14 rounded-[8px] bg-black/40 border border-white/10 overflow-hidden shrink-0 hidden xs:block">
              {poster ? (
                <img src={poster} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 text-[#64748B]">
                  <Film className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-[22px] font-bold text-white tracking-tight truncate">
                  {isEditMode ? (title || 'Edit Anime') : 'New anime'}
                </h1>
                <AdminStatusBadge
                  status={isEditMode ? (published ? 'live' : 'draft') : 'draft'}
                  className="shrink-0"
                />
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                {isEditMode ? (slug ? `/${slug}` : 'Anime details workspace') : 'Not saved yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditMode && (
              <AdminRowMenu
                title={title}
                items={[
                  {
                    id: 'duplicate',
                    label: 'Duplicate as draft',
                    icon: Copy,
                    onClick: async () => {
                      const duplicatedSlug = `${slug || 'copy'}-${Date.now().toString(36)}`;
                      const createdId = await createAnime({
                        title: `${title} (Copy)`,
                        slug: duplicatedSlug,
                        description,
                        poster,
                        published: false,
                        type,
                        status: 'ongoing',
                        year,
                      });
                      onShowMessage('Duplicated as draft.');
                      navigate(`/admin/anime/edit/${createdId}`);
                    },
                  },
                  {
                    id: 'view',
                    label: 'View on site',
                    icon: ExternalLink,
                    onClick: () => navigate(`/anime/${slug || animeId}`),
                  },
                  {
                    id: 'delete',
                    label: 'Delete anime',
                    icon: Trash2,
                    destructive: true,
                    onClick: () => setShowDeleteDialog(true),
                  },
                ]}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* SegmentedTabs: Details · Seasons · Episodes · Downloads */}
        <AdminSegmentedTabs
          tabs={[
            { id: 'details', label: 'Details', icon: Film },
            { id: 'seasons', label: 'Seasons', count: isEditMode ? seasonsList.length : undefined, icon: Layers },
            { id: 'episodes', label: 'Episodes', count: isEditMode ? totalEpisodes : undefined, icon: Tv },
            { id: 'downloads', label: 'Downloads', count: isEditMode ? (downloadLinks.length + zipDownloads.length) : undefined, icon: Download },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* TAB 1: DETAILS (Accordion sections: Basics, Artwork, Classification, Schedule, Promotion, SEO, Visibility) */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* a) Basics (Open by default) */}
            <AdminAccordion
              title="Basics"
              subtitle="Title, Japanese name, URL slug, and synopsis"
              icon={Film}
              defaultOpen={true}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-white">
                    English Title <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markDirty();
                    }}
                    onBlur={() => {
                      if (!slug) handleAutoSlug();
                    }}
                    placeholder="e.g. Solo Leveling Season 2"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] focus:ring-1 focus:ring-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Japanese Title
                  </label>
                  <input
                    type="text"
                    value={japaneseTitle}
                    onChange={(e) => {
                      setJapaneseTitle(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. 俺だけレベルアップな件"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-white">
                      URL Slug <span className="text-[#1E88FF]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoSlug}
                      className="text-xs text-[#1E88FF] hover:underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <AdminCopyInput
                    type="text"
                    value={slug}
                    onChange={(val) => {
                      setSlug(val.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                      markDirty();
                    }}
                    placeholder="solo-leveling-season-2"
                    showPaste={true}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-white">
                      Synopsis / Description
                    </label>
                    <span className="text-[11px] text-[#94A3B8]">
                      {description.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                    placeholder="Enter anime synopsis, storyline, and premise..."
                    className="w-full min-h-[96px] bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </AdminAccordion>

            {/* b) Artwork */}
            <AdminAccordion
              title="Artwork & Media"
              subtitle="Poster, banner, and trailer link"
              icon={ImageIcon}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminImageUploader
                  label="Poster (2:3 aspect)"
                  type="poster"
                  currentUrl={poster}
                  animeId={animeId || slug}
                  required={true}
                  onUrlChange={(url) => {
                    setPoster(url);
                    markDirty();
                  }}
                />

                <AdminImageUploader
                  label="Banner (16:9 aspect)"
                  type="banner"
                  currentUrl={banner}
                  animeId={animeId || slug}
                  onUrlChange={(url) => {
                    setBanner(url);
                    markDirty();
                  }}
                />

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-white">
                    Trailer Embed URL (YouTube or Direct)
                  </label>
                  <AdminCopyInput
                    type="url"
                    value={trailerUrl}
                    onChange={(val) => {
                      setTrailerUrl(val);
                      markDirty();
                    }}
                    placeholder="https://www.youtube.com/embed/..."
                    showPaste={true}
                  />
                </div>
              </div>
            </AdminAccordion>

            {/* c) Classification */}
            <AdminAccordion
              title="Classification & Genres"
              subtitle="Format, status, year, season, studio, and genres"
              icon={Sliders}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <AdminSelect
                    label="Format / Type"
                    value={type}
                    onChange={(val) => {
                      setType(val as string);
                      markDirty();
                    }}
                    options={[
                      { value: 'TV', label: 'TV Series' },
                      { value: 'Movie', label: 'Movie' },
                      { value: 'OVA', label: 'OVA' },
                      { value: 'ONA', label: 'ONA' },
                      { value: 'Special', label: 'Special' },
                    ]}
                  />
                </div>

                <div>
                  <AdminSelect
                    label="Airing Status"
                    value={status}
                    onChange={(val) => {
                      setStatus(val as any);
                      markDirty();
                    }}
                    options={[
                      { value: 'ongoing', label: 'Ongoing' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'upcoming', label: 'Upcoming' },
                    ]}
                  />
                </div>

                <div>
                  <AdminSelect
                    label="Release Year"
                    value={year}
                    onChange={(val) => {
                      setYear(Number(val));
                      markDirty();
                    }}
                    options={[2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => ({
                      value: y,
                      label: String(y),
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    Studio
                  </label>
                  <input
                    type="text"
                    value={studio}
                    onChange={(e) => {
                      setStudio(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. MAPPA, Ufotable"
                    className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    Total Episodes
                  </label>
                  <input
                    type="number"
                    value={totalEpisodes}
                    onChange={(e) => {
                      setTotalEpisodes(Number(e.target.value));
                      markDirty();
                    }}
                    className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    Rating Score
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rating}
                    onChange={(e) => {
                      setRating(Number(e.target.value));
                      markDirty();
                    }}
                    className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <AdminSelect
                    label="Audio Language"
                    value={audioLanguage}
                    onChange={(val) => {
                      setAudioLanguage(val as string);
                      markDirty();
                    }}
                    options={[
                      { value: 'Hindi Dub & Japanese Sub', label: 'Hindi Dub & Japanese Sub' },
                      { value: 'Hindi Dub', label: 'Hindi Dub' },
                      { value: 'Japanese Sub', label: 'Japanese Sub' },
                      { value: 'English Dub', label: 'English Dub' },
                      { value: 'Multi Audio', label: 'Multi Audio' },
                    ]}
                  />
                </div>

                {/* Genres Multi-select Chips */}
                <div className="sm:col-span-3 space-y-2">
                  <label className="block text-xs font-semibold text-white">
                    Genres ({selectedGenres.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar p-1 rounded-[10px] bg-[#101A30]">
                    {(availableGenres.length > 0
                      ? availableGenres
                      : ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Supernatural']
                    ).map((genre) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenre(genre)}
                          className={`h-8 px-3 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#1E88FF] text-white font-semibold'
                              : 'bg-white/5 text-[#CBD5E1] hover:bg-white/10'
                          }`}
                        >
                          {genre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AdminAccordion>

            {/* d) Schedule */}
            <AdminAccordion
              title="Airing Schedule"
              subtitle="Release day, broadcast air time, and timezone"
              icon={Calendar}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <AdminSelect
                    label="Broadcast Day"
                    value={releaseDay || 'none'}
                    onChange={(val) => {
                      setReleaseDay(val === 'none' ? '' : (val as string));
                      markDirty();
                    }}
                    options={[
                      { value: 'none', label: 'Not Scheduled' },
                      { value: 'Monday', label: 'Monday' },
                      { value: 'Tuesday', label: 'Tuesday' },
                      { value: 'Wednesday', label: 'Wednesday' },
                      { value: 'Thursday', label: 'Thursday' },
                      { value: 'Friday', label: 'Friday' },
                      { value: 'Saturday', label: 'Saturday' },
                      { value: 'Sunday', label: 'Sunday' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    Air Time (IST)
                  </label>
                  <input
                    type="time"
                    value={releaseTime}
                    onChange={(e) => {
                      setReleaseTime(e.target.value);
                      markDirty();
                    }}
                    className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    disabled
                    className="w-full h-10 bg-[#050A14] border border-white/5 rounded-[10px] px-3.5 text-sm text-[#94A3B8] outline-none"
                  />
                </div>
              </div>
            </AdminAccordion>

            {/* e) Promotion & Badges */}
            <AdminAccordion
              title="Promotion & Badges"
              subtitle="Pin anime to Trending, Popular, or Featured sections"
              icon={Sparkles}
              defaultOpen={false}
            >
              <div className="space-y-1 divide-y divide-white/5">
                <AdminToggle
                  checked={isTrending}
                  onChange={(val) => {
                    setIsTrending(val);
                    markDirty();
                  }}
                  label="Trending Now"
                  description="Feature in top trending discovery carousels"
                />

                <AdminToggle
                  checked={isPopular}
                  onChange={(val) => {
                    setIsPopular(val);
                    markDirty();
                  }}
                  label="Most Popular"
                  description="Highlight in popular anime leaderboards"
                />

                <AdminToggle
                  checked={isFeatured}
                  onChange={(val) => {
                    setIsFeatured(val);
                    markDirty();
                  }}
                  label="Featured Spotlight"
                  description="Display badge and promote on homepage spotlight"
                />
              </div>
            </AdminAccordion>

            {/* f) SEO & Search Meta */}
            <AdminAccordion
              title="SEO & Metadata"
              subtitle="Search engine preview and Google tags"
              icon={Globe}
              defaultOpen={false}
            >
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAutoGenerateSeo}
                    className="h-8 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#1E88FF] transition-colors"
                  >
                    Auto-generate SEO
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitle(e.target.value);
                      markDirty();
                    }}
                    placeholder="Watch Anime Name in Hindi Dub Online - ZYNOX"
                    className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[10px] px-3.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => {
                      setMetaDescription(e.target.value);
                      markDirty();
                    }}
                    placeholder="SEO description for Google snippets..."
                    className="w-full bg-[#101A30] border border-white/10 rounded-[10px] p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </AdminAccordion>

            {/* g) Visibility */}
            <AdminAccordion
              title="Publishing Status"
              subtitle="Control if this anime is live to visitors or saved as draft"
              icon={Eye}
              defaultOpen={false}
            >
              <AdminToggle
                checked={published}
                onChange={(val) => {
                  setPublished(val);
                  markDirty();
                }}
                label={published ? 'Live on Website' : 'Draft (Hidden)'}
                description={
                  published
                    ? 'Visible to public audience on search, catalogue, and homepage.'
                    : 'Only administrators can preview this title.'
                }
              />
            </AdminAccordion>
          </div>
        )}

        {/* TAB 2: SEASONS */}
        {activeTab === 'seasons' && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
            {!isEditMode ? (
              <div className="py-8 text-center space-y-3">
                <Layers className="w-8 h-8 text-[#1E88FF] mx-auto opacity-70" />
                <div className="text-sm font-semibold text-white">Save anime draft first</div>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  Save the anime first to configure multi-season arcs, movies, or sequel entries.
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-[#1E88FF]/20"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Save draft</span>
                </button>
              </div>
            ) : (
              <>
                <AdminSectionHeader
                  title="Seasons & Arcs"
                  description="Organize anime arcs, movies, and season groups"
                  actions={[
                    {
                      label: 'Add season',
                      icon: Plus,
                      variant: 'secondary',
                      onClick: () => {
                        const nextNum = seasonsList.length + 1;
                        setSeasonModalData({
                          id: `season-${Date.now()}`,
                          seasonNumber: nextNum,
                          title: `${title || 'Anime'} Season ${nextNum}`,
                          totalEpisodes: 12,
                          year: year || 2026,
                          status: 'ongoing',
                        });
                        setEditingSeasonIndex(null);
                        setShowSeasonModal(true);
                      },
                    },
                  ]}
                />

                {seasonsList.length === 0 ? (
                  <AdminEmptyState
                    compact={true}
                    icon={Layers}
                    title="No separate seasons"
                    description="This title functions as Season 1 by default."
                    actionLabel="Add season"
                    onAction={() => {
                      const nextNum = seasonsList.length + 1;
                      setSeasonModalData({
                        id: `season-${Date.now()}`,
                        seasonNumber: nextNum,
                        title: `${title || 'Anime'} Season ${nextNum}`,
                        totalEpisodes: 12,
                        year: year || 2026,
                        status: 'ongoing',
                      });
                      setEditingSeasonIndex(null);
                      setShowSeasonModal(true);
                    }}
                  />
                ) : (
                  <div className="divide-y divide-white/5">
                    {seasonsList.map((s, index) => (
                      <AdminListRow
                        key={s.id || index}
                        id={s.id || `s-${index}`}
                        title={s.title || `Season ${s.seasonNumber}`}
                        meta={`Season ${s.seasonNumber} · ${s.totalEpisodes || 12} Episodes · ${s.year || 2026}`}
                        thumbnail={s.poster || poster}
                        thumbnailType="poster"
                        status={s.status || 'ongoing'}
                        dragHandle={true}
                        onClick={() => {
                          setSeasonModalData({ ...s });
                          setEditingSeasonIndex(index);
                          setShowSeasonModal(true);
                        }}
                        menuItems={[
                          {
                            id: 'edit',
                            label: 'Edit season',
                            onClick: () => {
                              setSeasonModalData({ ...s });
                              setEditingSeasonIndex(index);
                              setShowSeasonModal(true);
                            },
                          },
                          {
                            id: 'delete',
                            label: 'Delete season',
                            destructive: true,
                            onClick: () => {
                              setSeasonsList((prev) => prev.filter((_, i) => i !== index));
                              markDirty();
                            },
                          },
                        ]}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: EPISODES */}
        {activeTab === 'episodes' && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
            {!isEditMode ? (
              <div className="py-8 text-center space-y-3">
                <Tv className="w-8 h-8 text-[#1E88FF] mx-auto opacity-70" />
                <div className="text-sm font-semibold text-white">Save the anime first to add episodes</div>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  Create this anime entry first to start attaching video stream servers and episodes.
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-[#1E88FF]/20"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Save draft</span>
                </button>
              </div>
            ) : (
              <>
                <AdminSectionHeader
                  title="Episodes"
                  description="Manage video servers and streams for this anime"
                  actions={[
                    {
                      label: 'Bulk import',
                      icon: Plus,
                      variant: 'secondary',
                      onClick: () => navigate(`/admin/episodes/bulk?animeId=${animeId || slug}`),
                    },
                    {
                      label: 'Open list',
                      icon: Tv,
                      variant: 'primary',
                      onClick: () => navigate(`/admin/anime/${animeId || slug}/episodes`),
                    },
                  ]}
                />

                <AdminEmptyState
                  compact={true}
                  icon={Tv}
                  title={`Episode catalog for ${title || 'Anime'}`}
                  description="Manage episodes individually with multi-stream embeds or import via bulk list."
                  actionLabel="Open list"
                  onAction={() => navigate(`/admin/anime/${animeId || slug}/episodes`)}
                />
              </>
            )}
          </div>
        )}

        {/* TAB 4: DOWNLOADS */}
        {activeTab === 'downloads' && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
            {!isEditMode ? (
              <div className="py-8 text-center space-y-3">
                <Download className="w-8 h-8 text-[#1E88FF] mx-auto opacity-70" />
                <div className="text-sm font-semibold text-white">Save the anime first to add downloads</div>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  Save this anime entry first to attach batch download packages.
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-[#1E88FF]/20"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Save draft</span>
                </button>
              </div>
            ) : (
              <>
                <AdminSectionHeader
                  title="Season zip packages"
                  description="Batch downloads (MegaCloud, Google Drive, Telegram)"
                  actions={[
                    {
                      label: 'Add zip',
                      icon: Plus,
                      variant: 'secondary',
                      onClick: () => {
                        const nextIdx = zipDownloads.length + 1;
                        setZipDownloads((prev) => [
                          ...prev,
                          {
                            id: `zip-${Date.now()}`,
                            title: `Zip ${nextIdx} (Complete Season)`,
                            seasonNumber: 1,
                            url: '',
                            size: '2.4 GB',
                            quality: '1080p Ultra HD',
                            host: 'Mega / Drive',
                          },
                        ]);
                        markDirty();
                      },
                    },
                  ]}
                />

                {zipDownloads.length === 0 ? (
                  <AdminEmptyState
                    compact={true}
                    icon={Download}
                    title="No season zip packages"
                    description="Batch download archives will appear here once added."
                    actionLabel="Add zip"
                    onAction={() => {
                      const nextIdx = zipDownloads.length + 1;
                      setZipDownloads((prev) => [
                        ...prev,
                        {
                          id: `zip-${Date.now()}`,
                          title: `Zip ${nextIdx} (Complete Season)`,
                          seasonNumber: 1,
                          url: '',
                          size: '2.4 GB',
                          quality: '1080p Ultra HD',
                          host: 'Mega / Drive',
                        },
                      ]);
                      markDirty();
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {zipDownloads.map((zip, idx) => (
                      <div
                        key={zip.id || idx}
                        className="p-3.5 rounded-[10px] bg-[#101A30] border border-white/5 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <input
                            type="text"
                            value={zip.title}
                            onChange={(e) => {
                              const copy = [...zipDownloads];
                              copy[idx].title = e.target.value;
                              setZipDownloads(copy);
                              markDirty();
                            }}
                            placeholder="Package Title"
                            className="h-10 bg-[#0B1324] border border-white/10 rounded-[8px] px-2.5 text-xs text-white"
                          />
                          <input
                            type="url"
                            value={zip.url}
                            onChange={(e) => {
                              const copy = [...zipDownloads];
                              copy[idx].url = e.target.value;
                              setZipDownloads(copy);
                              markDirty();
                            }}
                            placeholder="Download URL (https://...)"
                            className="h-10 bg-[#0B1324] border border-white/10 rounded-[8px] px-2.5 text-xs text-white font-mono"
                          />
                          <input
                            type="text"
                            value={zip.size || ''}
                            onChange={(e) => {
                              const copy = [...zipDownloads];
                              copy[idx].size = e.target.value;
                              setZipDownloads(copy);
                              markDirty();
                            }}
                            placeholder="Size (e.g. 2.4 GB)"
                            className="h-10 bg-[#0B1324] border border-white/10 rounded-[8px] px-2.5 text-xs text-white"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={zip.quality || ''}
                              onChange={(e) => {
                                const copy = [...zipDownloads];
                                copy[idx].quality = e.target.value;
                                setZipDownloads(copy);
                                markDirty();
                              }}
                              placeholder="Quality"
                              className="flex-1 h-10 bg-[#0B1324] border border-white/10 rounded-[8px] px-2.5 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setZipDownloads((prev) => prev.filter((_, i) => i !== idx));
                                markDirty();
                              }}
                              className="w-10 h-10 rounded-[8px] hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                              title="Remove package"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sticky Save Bar (appears only when isDirty is true) */}
        <AdminStickySaveBar
          isDirty={isDirty}
          onSave={handleSave}
          onDiscard={() => {
            setIsDirty(false);
            onShowMessage('Changes discarded.');
          }}
          isSaving={saving}
          saveLabel={isEditMode ? 'Save changes' : 'Publish anime'}
        />

        {/* Delete Dialog */}
        <AdminConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteAnime}
          title={`Delete "${title}"?`}
          consequence="This will permanently delete this anime from the database. Linked episodes will also become inaccessible."
          confirmLabel="Delete anime"
          isLoading={isDeleting}
        />

        {/* Season Edit/Add Dialog */}
        {showSeasonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowSeasonModal(false)}
            />
            <div className="relative w-full max-w-md max-h-[90svh] overflow-y-auto no-scrollbar bg-[#0B1324] border border-white/10 rounded-[12px] p-5 shadow-2xl z-10 space-y-4">
              <h3 className="text-base font-bold text-white">
                {editingSeasonIndex !== null ? 'Edit Season' : 'Add Season'}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Season Number
                  </label>
                  <input
                    type="number"
                    value={seasonModalData.seasonNumber || 1}
                    onChange={(e) =>
                      setSeasonModalData((prev) => ({
                        ...prev,
                        seasonNumber: Number(e.target.value),
                      }))
                    }
                    className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Season Title
                  </label>
                  <input
                    type="text"
                    value={seasonModalData.title || ''}
                    onChange={(e) =>
                      setSeasonModalData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Season 2: Entertainment District Arc"
                    className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">
                      Episodes
                    </label>
                    <input
                      type="number"
                      value={seasonModalData.totalEpisodes || 12}
                      onChange={(e) =>
                        setSeasonModalData((prev) => ({
                          ...prev,
                          totalEpisodes: Number(e.target.value),
                        }))
                      }
                      className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      value={seasonModalData.year || 2026}
                      onChange={(e) =>
                        setSeasonModalData((prev) => ({
                          ...prev,
                          year: Number(e.target.value),
                        }))
                      }
                      className="w-full h-10 bg-[#101A30] border border-white/10 rounded-[8px] px-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Per-Season Custom Poster Uploader / URL */}
                <div className="pt-1">
                  <AdminImageUploader
                    label="Season Poster (2:3 aspect)"
                    type="poster"
                    currentUrl={seasonModalData.poster || ''}
                    animeId={animeId || slug}
                    recommendedText="Upload or paste a custom poster for this season (optional — defaults to main poster)"
                    onUrlChange={(url) =>
                      setSeasonModalData((prev) => ({ ...prev, poster: url }))
                    }
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSeasonModal(false)}
                  className="h-9 px-3.5 rounded-[8px] text-xs font-medium text-[#CBD5E1] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!seasonModalData.seasonNumber) return;
                    const item: AnimeSeasonEntry = {
                      ...seasonModalData,
                      id: seasonModalData.id || `season-${Date.now()}`,
                      seasonNumber: Number(seasonModalData.seasonNumber),
                      title: seasonModalData.title?.trim() || `Season ${seasonModalData.seasonNumber}`,
                      poster: seasonModalData.poster?.trim() || undefined,
                      totalEpisodes: Number(seasonModalData.totalEpisodes) || 12,
                      year: Number(seasonModalData.year) || 2026,
                      status: seasonModalData.status || 'ongoing',
                    };
                    setSeasonsList((prev) => {
                      const copy = [...prev];
                      if (editingSeasonIndex !== null) copy[editingSeasonIndex] = item;
                      else copy.push(item);
                      return copy.sort((a, b) => a.seasonNumber - b.seasonNumber);
                    });
                    setShowSeasonModal(false);
                    markDirty();
                  }}
                  className="h-9 px-4 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold cursor-pointer"
                >
                  Save season
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
