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
import {
  AdminPageHeader,
  AdminSelect,
  AdminToggle,
  AdminStatusBadge,
  AdminConfirmDialog,
  AdminImageUploader,
  AdminEmptyState,
  AdminSkeleton,
  AdminRowMenu,
} from '../../components/admin';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  X,
  Play,
  ExternalLink,
  MoveUp,
  MoveDown,
  RefreshCw,
  Sliders,
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
      onShowMessage('Please provide a banner title.');
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

      const shouldFeature = toSave.active !== false;
      if (toSave.animeId) {
        try {
          await updateAnime(toSave.animeId, { featured: shouldFeature, isFeatured: shouldFeature });
        } catch {}
      }
      if (toSave.animeSlug && toSave.animeSlug !== toSave.animeId) {
        try {
          await updateAnime(toSave.animeSlug, { featured: shouldFeature, isFeatured: shouldFeature });
        } catch {}
      }

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isNew ? 'Created Hero Spotlight Banner' : 'Updated Hero Spotlight Banner',
        'HeroBannerCMS',
        toSave.id,
        toSave.title
      );

      onShowMessage(`Saved banner "${toSave.title}".`);
      setEditingBanner(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error saving banner: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
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
        'Deleted Hero Spotlight Banner',
        'HeroBannerCMS',
        bannerToDelete.id,
        bannerToDelete.title
      );

      onShowMessage(`Deleted banner "${bannerToDelete.title}".`);
      setBannerToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Failed to delete banner: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (banner: CmsHeroBanner) => {
    try {
      const nextActive = !banner.active;
      await saveCmsHeroBanner({ ...banner, active: nextActive });
      if (banner.animeId) {
        await updateAnime(banner.animeId, { featured: nextActive, isFeatured: nextActive });
      }
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, active: nextActive } : b))
      );
      onShowMessage(`"${banner.title}" marked as ${nextActive ? 'Active' : 'Draft'}.`);
    } catch {
      onShowMessage('Failed to toggle status.');
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const [moved] = newBanners.splice(index, 1);
    newBanners.splice(targetIndex, 0, moved);

    const updated = newBanners.map((b, i) => ({ ...b, displayOrder: i + 1 }));
    setBanners(updated);

    try {
      await Promise.all(updated.map((b) => saveCmsHeroBanner(b)));
      onShowMessage('Updated slide order.');
    } catch {
      onShowMessage('Failed to update banner order.');
    }
  };

  return (
    <AdminLayout currentTab="banners" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0">
        {/* Page Header (ONE primary button: Add banner) */}
        <AdminPageHeader
          title="Hero Spotlight Banners"
          description={`${banners.length} spotlight carousel banners configured`}
          primaryAction={{
            label: 'Add banner',
            icon: Plus,
            onClick: handleOpenNew,
          }}
        />

        {/* Card Grid (16:9 banner thumb, title, toggle, "⋯") */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AdminSkeleton variant="card" count={3} />
          </div>
        ) : banners.length === 0 ? (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-8">
            <AdminEmptyState
              icon={Sliders}
              title="No hero banners created"
              description="Add spotlight slides for featured anime on the public homepage."
              actionLabel="Add banner"
              onAction={handleOpenNew}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-[12px] overflow-hidden transition-colors flex flex-col justify-between group"
              >
                {/* 16:9 Banner Thumbnail */}
                <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                  <img
                    src={banner.backgroundImage || banner.posterImage || '/placeholder-banner.jpg'}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Order badge & Status badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-[6px] bg-black/70 backdrop-blur-md text-[10px] font-mono text-white border border-white/10">
                      #{index + 1}
                    </span>
                    <AdminStatusBadge status={banner.active ? 'live' : 'draft'} />
                  </div>

                  {/* Action Menu button top right */}
                  <div className="absolute top-2 right-2">
                    <AdminRowMenu
                      title={banner.title}
                      items={[
                        {
                          id: 'edit',
                          label: 'Edit banner',
                          icon: Edit2,
                          onClick: () => {
                            setEditingBanner(banner);
                            setIsNew(false);
                          },
                        },
                        {
                          id: 'view',
                          label: 'View target page',
                          icon: ExternalLink,
                          onClick: () => navigate(banner.buttonUrl || '/'),
                        },
                        {
                          id: 'delete',
                          label: 'Delete banner',
                          icon: Trash2,
                          destructive: true,
                          onClick: () =>
                            setBannerToDelete({
                              id: banner.id,
                              title: banner.title,
                              animeId: banner.animeId,
                              animeSlug: banner.animeSlug,
                            }),
                        },
                      ]}
                    />
                  </div>

                  {/* Title overlay on bottom of thumb */}
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <h3 className="text-sm font-bold text-white truncate drop-shadow">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-[11px] text-[#CBD5E1] truncate drop-shadow">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Move up/down, Toggle, Edit button */}
                <div className="p-3 bg-[#101A30]/50 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleReorder(index, 'up')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move slide earlier"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === banners.length - 1}
                      onClick={() => handleReorder(index, 'down')}
                      className="p-1.5 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move slide later"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(banner)}
                      className={`text-[11px] px-2.5 py-1 rounded-[6px] font-semibold border transition-colors cursor-pointer ${
                        banner.active
                          ? 'bg-[#1E88FF]/15 text-[#1E88FF] border-[#1E88FF]/30 hover:bg-[#1E88FF]/25'
                          : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white'
                      }`}
                    >
                      {banner.active ? 'Active' : 'Draft'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingBanner(banner);
                        setIsNew(false);
                      }}
                      className="h-7 px-2.5 rounded-[6px] bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor Drawer / Modal */}
        {editingBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-[#0B1324] border border-white/10 rounded-[12px] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {isNew ? 'Create Spotlight Banner' : 'Edit Spotlight Banner'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <AdminSelect
                    label="Autofill from Anime Series"
                    value={editingBanner.animeId || editingBanner.animeSlug || ''}
                    onChange={(val) => handleSelectAnime(String(val))}
                    options={animes.map((a) => ({
                      value: a.id || a.slug,
                      label: a.title,
                    }))}
                    sheetTitle="Select Target Anime"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Banner Title <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Subtitle (e.g. Season 2 • Hindi Dub • 1080p)
                  </label>
                  <input
                    type="text"
                    value={editingBanner.subtitle || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Spotlight Synopsis / Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingBanner.description || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                    className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    16:9 Wide Banner Background Image
                  </label>
                  <AdminImageUploader
                    aspectRatio="16:9"
                    value={editingBanner.backgroundImage || ''}
                    onChange={(url) => setEditingBanner({ ...editingBanner, backgroundImage: url })}
                    label="Banner Image (1920x1080)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={editingBanner.buttonText || 'Watch Now'}
                      onChange={(e) => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Button URL
                    </label>
                    <input
                      type="text"
                      value={editingBanner.buttonUrl || '/'}
                      onChange={(e) => setEditingBanner({ ...editingBanner, buttonUrl: e.target.value })}
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <AdminToggle
                    checked={editingBanner.active ?? true}
                    onChange={(checked) => setEditingBanner({ ...editingBanner, active: checked })}
                    label="Show on Public Homepage"
                    description="When disabled, this slide is kept as a draft."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingBanner(null)}
                    className="h-10 px-4 rounded-[10px] border border-white/10 hover:border-white/20 text-[#CBD5E1] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save banner</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(bannerToDelete)}
          onClose={() => setBannerToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete "${bannerToDelete?.title}"?`}
          consequence="This spotlight banner slide will be permanently removed from the public homepage."
          confirmLabel="Delete banner"
          isLoading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
