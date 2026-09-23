import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsHeroBanner } from '../../types/cms';
import type { Anime } from '../../types/anime';
import {
  getCmsHeroBanners,
  saveCmsHeroBanner,
  deleteCmsHeroBanner,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { getAllAnimes, updateAnime } from '../../lib/firestore/anime';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Sparkles,
  Play,
  ExternalLink,
} from 'lucide-react';

interface AdminHeroBannersViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminHeroBannersView: React.FC<AdminHeroBannersViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [banners, setBanners] = useState<CmsHeroBanner[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Partial<CmsHeroBanner> | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<{ id: string; title: string; animeId?: string; animeSlug?: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [list, animeList] = await Promise.all([getCmsHeroBanners(), getAllAnimes()]);
      setBanners(list);
      setAnimes(animeList);
    } catch (err) {
      console.error('Failed to load hero banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    const firstAnime = animes[0];
    setEditingBanner({
      id: `hero-${Date.now()}`,
      title: firstAnime?.title || 'New Spotlight Anime',
      subtitle: 'Season 1 • Multi Audio • 1080p Ultra HD',
      description: firstAnime?.description || 'Watch high definition anime streaming on Zynox.',
      animeId: firstAnime?.id || firstAnime?.slug || '',
      animeSlug: firstAnime?.slug || '',
      backgroundImage: firstAnime?.banner || firstAnime?.poster || '',
      posterImage: firstAnime?.poster || '',
      buttonText: 'Watch Now',
      buttonUrl: firstAnime ? `/anime/${firstAnime.slug}/episode/1` : '/',
      secondaryButtonText: 'Details',
      secondaryButtonUrl: firstAnime ? `/anime/${firstAnime.slug}` : '/',
      active: true,
      displayOrder: banners.length + 1,
    });
    setIsNew(true);
  };

  const handleSelectAnime = (slugOrId: string) => {
    const found = animes.find((a) => a.id === slugOrId || a.slug === slugOrId);
    if (found && editingBanner) {
      setEditingBanner({
        ...editingBanner,
        animeId: found.id || found.slug,
        animeSlug: found.slug,
        title: found.title,
        description: found.description,
        backgroundImage: found.banner || found.poster,
        posterImage: found.poster,
        buttonUrl: `/anime/${found.slug}/episode/1`,
        secondaryButtonUrl: `/anime/${found.slug}`,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title?.trim()) {
      onShowMessage('Please provide a slide title.');
      return;
    }

    const bgImage =
      editingBanner.backgroundImage?.trim() ||
      editingBanner.posterImage?.trim() ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=85';

    try {
      setSaving(true);
      const toSave: CmsHeroBanner = {
        ...(editingBanner as CmsHeroBanner),
        backgroundImage: bgImage,
      };
      await saveCmsHeroBanner(toSave);

      // Also ensure corresponding anime featured & isFeatured flags are kept in sync
      const shouldFeature = toSave.active !== false;
      if (toSave.animeId) {
        try {
          await updateAnime(toSave.animeId, { featured: shouldFeature, isFeatured: shouldFeature });
        } catch (syncErr) {
          console.warn('Could not sync anime featured flag:', syncErr);
        }
      }
      if (toSave.animeSlug && toSave.animeSlug !== toSave.animeId) {
        try {
          await updateAnime(toSave.animeSlug, { featured: shouldFeature, isFeatured: shouldFeature });
        } catch {}
      }

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isNew ? 'Added Hero Spotlight Banner' : 'Updated Hero Banner',
        'HeroBanner',
        toSave.id,
        toSave.title
      );
      onShowMessage(`Hero banner "${toSave.title}" saved successfully!`);
      setEditingBanner(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error saving banner: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    try {
      setDeleting(true);
      await deleteCmsHeroBanner(bannerToDelete.id);
      if (bannerToDelete.animeId) {
        try {
          await updateAnime(bannerToDelete.animeId, { featured: false, isFeatured: false });
        } catch {}
      }
      if (bannerToDelete.animeSlug && bannerToDelete.animeSlug !== bannerToDelete.animeId) {
        try {
          await updateAnime(bannerToDelete.animeSlug, { featured: false, isFeatured: false });
        } catch {}
      }
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Hero Banner',
        'HeroBanner',
        bannerToDelete.id,
        bannerToDelete.title
      );
      onShowMessage(`Hero slide "${bannerToDelete.title}" deleted.`);
      setBannerToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout currentTab="hero-banners" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Hero Spotlight Carousel CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Hero Slide Banners Manager
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Create and reorder the primary hero slider carousel slides displayed at the very top of the homepage.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Hero Banner</span>
          </button>
        </div>

        {/* Banners Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading spotlight banners...</div>
        ) : banners.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8] space-y-3">
            <Layers className="w-10 h-10 text-cyan-400 mx-auto opacity-50" />
            <h3 className="text-base font-bold text-white">No spotlight slides found</h3>
            <p className="text-xs max-w-sm mx-auto">
              Add your first featured hero slide to highlight top seasonal anime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-[#0B1322] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col group relative"
              >
                {/* Background Image Preview */}
                <div className="h-44 relative bg-[#050A14] overflow-hidden">
                  <img
                    src={banner.backgroundImage}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1322] via-[#0B1322]/50 to-transparent" />

                  {/* Badge & Order */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-white">
                      Slide #{banner.displayOrder}
                    </span>
                    {banner.active ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/80 backdrop-blur-md text-[10px] font-bold text-white">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/80 backdrop-blur-md text-[10px] font-bold text-white">
                        Hidden
                      </span>
                    )}
                  </div>

                  {/* Edit/Delete Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBanner(banner);
                        setIsNew(false);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md hover:bg-[#1683FF] text-white transition-colors"
                      title="Edit Banner"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerToDelete({ id: banner.id, title: banner.title })}
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Overlay text */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="text-[11px] font-bold text-cyan-400">{banner.subtitle}</div>
                    <h3 className="text-base font-black text-white truncate">{banner.title}</h3>
                  </div>
                </div>

                {/* Footer Buttons preview */}
                <div className="p-4 flex items-center justify-between border-t border-white/5 bg-[#080E1A]">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#1683FF] text-white text-[11px] font-bold rounded-lg flex items-center gap-1">
                      <Play className="w-3 h-3" /> {banner.buttonText}
                    </span>
                    {banner.secondaryButtonText && (
                      <span className="px-3 py-1 bg-white/10 text-white text-[11px] font-bold rounded-lg">
                        {banner.secondaryButtonText}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[140px]">
                    {banner.buttonUrl}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit / New Modal */}
        {editingBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-lg bg-[#0B1322] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {isNew ? 'Create New Hero Slide' : 'Edit Hero Slide'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3">
                {/* Anime quick autofill */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Autofill from Anime</label>
                  <select
                    value={editingBanner.animeSlug || editingBanner.animeId || ''}
                    onChange={(e) => handleSelectAnime(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Custom Spotlight / Manual</option>
                    {animes.map((a) => (
                      <option key={a.id || a.slug} value={a.slug}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Slide Title</label>
                  <input
                    type="text"
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Slide Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Season 2 • Hindi Dub • 1080p"
                    value={editingBanner.subtitle || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Description</label>
                  <textarea
                    rows={2}
                    value={editingBanner.description || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                {/* Background Image URL */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Background Banner Image URL</label>
                  <input
                    type="url"
                    value={editingBanner.backgroundImage || ''}
                    onChange={(e) =>
                      setEditingBanner({ ...editingBanner, backgroundImage: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                {/* Primary Button */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Primary Button Text</label>
                    <input
                      type="text"
                      value={editingBanner.buttonText || 'Watch Now'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, buttonText: e.target.value })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Primary Button URL</label>
                    <input
                      type="text"
                      value={editingBanner.buttonUrl || '/'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, buttonUrl: e.target.value })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Secondary Button */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Secondary Button Text</label>
                    <input
                      type="text"
                      value={editingBanner.secondaryButtonText || 'Details'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, secondaryButtonText: e.target.value })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Secondary Button URL</label>
                    <input
                      type="text"
                      value={editingBanner.secondaryButtonUrl || '/'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, secondaryButtonUrl: e.target.value })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Display Order & Active */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#94A3B8]">Slide Order #</label>
                    <input
                      type="number"
                      value={editingBanner.displayOrder || 1}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          displayOrder: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-16 bg-[#050A14] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="banner-active"
                      checked={editingBanner.active ?? true}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, active: e.target.checked })
                      }
                      className="rounded accent-cyan-500"
                    />
                    <label htmlFor="banner-active" className="text-xs font-semibold text-white">
                      Active on Homepage
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingBanner(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-xs font-bold text-white rounded-xl shadow-lg shadow-cyan-500/30 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Banner'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!bannerToDelete}
          title="Delete Hero Spotlight Slide?"
          message={bannerToDelete ? `Are you sure you want to delete "${bannerToDelete.title}" from the homepage hero carousel? This cannot be undone.` : ''}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Slide'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setBannerToDelete(null)}
        />
      </div>
    </AdminLayout>
  );
};
