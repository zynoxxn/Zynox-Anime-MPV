import React, { useEffect, useState, useMemo } from 'react';
import type { Anime } from '../../types/anime';
import { getAllAnimes, deleteAnime, updateAnime, createAnime } from '../../lib/firestore/anime';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import {
  AdminPageHeader,
  AdminSearchInput,
  AdminSelect,
  AdminListRow,
  AdminStatusBadge,
  AdminConfirmDialog,
  AdminSelectionBar,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
} from '../../components/admin';
import {
  Plus,
  Film,
  Tv,
  Download,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  CheckSquare,
} from 'lucide-react';

interface AdminAnimeListViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminAnimeListView: React.FC<AdminAnimeListViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetDeleteAnime, setTargetDeleteAnime] = useState<Anime | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAnimeList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllAnimes();
      setAnimes(data);
    } catch (err: any) {
      console.error('Error fetching admin anime list:', err);
      setError('Failed to load anime list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimeList();
  }, []);

  const handleTogglePublish = async (anime: Anime) => {
    const id = anime.id || anime.slug;
    if (!id) return;
    try {
      const nextStatus = !anime.published;
      await updateAnime(id, { published: nextStatus });
      setAnimes((prev) =>
        prev.map((a) => ((a.id === id || a.slug === id) ? { ...a, published: nextStatus } : a))
      );
      onShowMessage(`"${anime.title}" marked as ${nextStatus ? 'Published' : 'Draft'}.`);
    } catch {
      onShowMessage('Failed to update published status.');
    }
  };

  const handleDuplicate = async (anime: Anime) => {
    try {
      const newTitle = `${anime.title} (Copy)`;
      const newSlug = `${anime.slug || 'copy'}-${Date.now().toString(36)}`;
      const duplicatedData = {
        ...anime,
        title: newTitle,
        slug: newSlug,
        published: false,
      };
      delete (duplicatedData as any).id;
      const createdId = await createAnime(duplicatedData);
      const newAnimeObj: Anime = {
        ...duplicatedData,
        id: createdId,
      };
      setAnimes((prev) => [newAnimeObj, ...prev]);
      onShowMessage(`Duplicated "${anime.title}" as draft.`);
    } catch {
      onShowMessage('Failed to duplicate anime.');
    }
  };

  const handleConfirmDelete = async () => {
    const animeToDelete = targetDeleteAnime;
    if (!animeToDelete) return;
    const targetId = animeToDelete.id || animeToDelete.slug;
    if (!targetId) return;

    try {
      setIsDeleting(true);
      await deleteAnime(targetId);
      if (animeToDelete.slug && animeToDelete.slug !== targetId) {
        await deleteAnime(animeToDelete.slug);
      }
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Anime Title',
        'Anime',
        targetId,
        animeToDelete.title
      );
      setAnimes((prev) =>
        prev.filter((a) => a.id !== targetId && a.slug !== targetId && a.id !== animeToDelete.id)
      );
      onShowMessage(`"${animeToDelete.title}" deleted.`);
    } catch {
      onShowMessage('Failed to delete anime.');
    } finally {
      setIsDeleting(false);
      setTargetDeleteAnime(null);
    }
  };

  // Bulk actions
  const handleBulkPublish = async (publish: boolean) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => updateAnime(id, { published: publish })));
      setAnimes((prev) =>
        prev.map((a) => (ids.includes(a.id || a.slug) ? { ...a, published: publish } : a))
      );
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      onShowMessage(`${ids.length} titles marked as ${publish ? 'Published' : 'Draft'}.`);
    } catch {
      onShowMessage('Bulk update failed.');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => deleteAnime(id)));
      setAnimes((prev) => prev.filter((a) => !ids.includes(a.id || a.slug)));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      onShowMessage(`Deleted ${ids.length} titles.`);
    } catch {
      onShowMessage('Bulk delete failed.');
    }
  };

  const filtered = useMemo(() => {
    return animes.filter((a) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (a.title || '').toLowerCase().includes(q) ||
        (a.slug || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || (a.status || 'ongoing').toLowerCase() === statusFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || (a.type || 'TV').toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [animes, searchQuery, statusFilter, typeFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id || a.slug)));
    }
  };

  return (
    <AdminLayout currentTab="anime" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0">
        {/* Page Header (ONE primary button: "Add anime", title left + primary right on same line) */}
        <AdminPageHeader
          title="Anime Library"
          description={`${animes.length} titles registered in catalog`}
          primaryAction={{
            label: 'Add anime',
            icon: Plus,
            onClick: () => navigate('/admin/anime/new'),
          }}
        />

        {error && (
          <AdminErrorState
            message={error}
            onRetry={fetchAnimeList}
          />
        )}

        {/* Filter Controls Bar: Search with Select mode toggle, + Status and Type side-by-side (2 cols) even on phone */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AdminSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search anime..."
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode((prev) => {
                  if (prev) setSelectedIds(new Set());
                  return !prev;
                });
              }}
              className={`h-11 px-3.5 rounded-[10px] text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isSelectionMode
                  ? 'bg-[#1E88FF]/15 border-[#1E88FF]/40 text-[#1E88FF]'
                  : 'bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>{isSelectionMode ? 'Cancel' : 'Select'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <AdminSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(String(val))}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'ongoing', label: 'Ongoing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'upcoming', label: 'Upcoming' },
                ]}
                sheetTitle="Filter by Status"
              />
            </div>

            <div>
              <AdminSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(String(val))}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'tv', label: 'TV Series' },
                  { value: 'movie', label: 'Movie' },
                  { value: 'ova', label: 'OVA' },
                  { value: 'ona', label: 'ONA' },
                  { value: 'special', label: 'Special' },
                ]}
                sheetTitle="Filter by Type"
              />
            </div>
          </div>
        </div>

        {/* Anime List / Table Container */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          {/* Header row on desktop */}
          <div className="hidden lg:flex items-center px-4 py-2.5 bg-[#101A30] border-b border-white/10 text-xs font-semibold text-[#94A3B8]">
            {isSelectionMode && (
              <div className="w-8 shrink-0 flex items-center">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                  onClick={toggleSelectAll}
                  className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer ${
                    selectedIds.size > 0 && selectedIds.size === filtered.length
                      ? 'bg-[#1E88FF] border-[#1E88FF] text-white'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  {selectedIds.size > 0 && selectedIds.size === filtered.length && (
                    <span className="text-[10px] leading-none">✓</span>
                  )}
                </button>
              </div>
            )}
            <div className="flex-1 min-w-0">Title & Details</div>
            <div className="w-28 text-left">Type</div>
            <div className="w-28 text-left">Status</div>
            <div className="w-24 text-right pr-4">Views</div>
            <div className="w-12 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <AdminEmptyState
                icon={Film}
                title="No anime found"
                description={
                  searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'No anime in your catalog yet. Add your first series.'
                }
                actionLabel="Add anime"
                onAction={() => navigate('/admin/anime/new')}
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((anime) => {
                const animeId = anime.id || anime.slug;
                const isSelected = selectedIds.has(animeId);
                const statusCap = (anime.status || 'Ongoing').charAt(0).toUpperCase() + (anime.status || 'Ongoing').slice(1).toLowerCase();

                const seasonCount = Array.isArray(anime.seasonsList) ? anime.seasonsList.length : 0;

                return (
                  <AdminListRow
                    key={animeId}
                    id={animeId}
                    title={anime.title}
                    meta={`${anime.type || 'TV'} · ${statusCap} · ${anime.year || '2026'}${seasonCount > 0 ? ` · ${seasonCount} ${seasonCount === 1 ? 'Season' : 'Seasons'}` : ''} · ${anime.audioLanguage || 'Multi Audio'}`}
                    thumbnail={anime.poster}
                    thumbnailType="poster"
                    status={anime.published === false ? 'draft' : anime.status || 'ongoing'}
                    selectable={isSelectionMode}
                    selected={isSelected}
                    onSelect={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(animeId);
                        else next.delete(animeId);
                        return next;
                      });
                    }}
                    onClick={() => navigate(`/admin/anime/edit/${animeId}`)}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit',
                        icon: Film,
                        onClick: () => navigate(`/admin/anime/edit/${animeId}`),
                      },
                      {
                        id: 'seasons',
                        label: seasonCount > 0 ? `Seasons (${seasonCount})` : 'Seasons',
                        icon: Layers,
                        onClick: () => navigate(`/admin/anime/edit/${animeId}?tab=seasons`),
                      },
                      {
                        id: 'episodes',
                        label: 'Episodes',
                        icon: Tv,
                        onClick: () => navigate(`/admin/anime/${animeId}/episodes`),
                      },
                      {
                        id: 'downloads',
                        label: 'Downloads',
                        icon: Download,
                        onClick: () => navigate(`/admin/downloads?animeId=${animeId}`),
                      },
                      {
                        id: 'duplicate',
                        label: 'Duplicate',
                        icon: Copy,
                        onClick: () => handleDuplicate(anime),
                      },
                      {
                        id: 'view',
                        label: 'View on site',
                        icon: ExternalLink,
                        onClick: () => navigate(`/anime/${anime.slug || animeId}`),
                      },
                      {
                        id: 'publish',
                        label: anime.published === false ? 'Publish' : 'Unpublish',
                        icon: anime.published === false ? Eye : EyeOff,
                        divider: true,
                        onClick: () => handleTogglePublish(anime),
                      },
                      {
                        id: 'delete',
                        label: 'Delete',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setTargetDeleteAnime(anime),
                      },
                    ]}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky selection bar when in selection mode and items are selected */}
        {isSelectionMode && selectedIds.size > 0 && (
          <AdminSelectionBar
            selectedCount={selectedIds.size}
            totalCount={filtered.length}
            onSelectAll={toggleSelectAll}
            onClear={() => setSelectedIds(new Set())}
            actions={[
              {
                label: 'Publish',
                onClick: () => handleBulkPublish(true),
              },
              {
                label: 'Draft',
                onClick: () => handleBulkPublish(false),
              },
              {
                label: 'Delete',
                destructive: true,
                onClick: handleBulkDelete,
              },
            ]}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(targetDeleteAnime)}
          onClose={() => setTargetDeleteAnime(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete "${targetDeleteAnime?.title}"?`}
          consequence="This will permanently delete this anime, its seasons, and associated episodes from your library."
          confirmLabel="Delete anime"
          isLoading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};
