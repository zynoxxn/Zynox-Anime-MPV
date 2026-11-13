import React, { useEffect, useState, useMemo, useRef } from 'react';
import type { Episode } from '../../types/episode';
import type { Anime } from '../../types/anime';
import {
  getAllEpisodesByAnimeId,
  deleteEpisode,
  updateEpisode,
  createEpisode,
} from '../../lib/firestore/episodes';
import { getAllAnimes } from '../../lib/firestore/anime';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import {
  AdminPageHeader,
  AdminSearchInput,
  AdminSelect,
  AdminListRow,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
} from '../../components/admin';
import {
  Plus,
  Tv,
  Film,
  Download,
  Copy,
  Trash2,
  ExternalLink,
  ListPlus,
} from 'lucide-react';

interface AdminEpisodeListViewProps {
  animeId?: string;
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminEpisodeListView: React.FC<AdminEpisodeListViewProps> = ({
  animeId: initialAnimeId,
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const qAnimeId = searchParams.get('animeId');
  const qSeason = searchParams.get('season');

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>(initialAnimeId || qAnimeId || 'all');
  const [selectedSeason, setSelectedSeason] = useState<string>(qSeason || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetDeleteEp, setTargetDeleteEp] = useState<Episode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const timeoutTimerRef = useRef<any>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 8-second timeout safeguard to prevent hanging in skeleton state
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = setTimeout(() => {
        setLoading((curLoading) => {
          if (curLoading) {
            setError('Loading episodes timed out. Please check your network and retry.');
            return false;
          }
          return curLoading;
        });
      }, 8000);

      const [animeList, epList] = await Promise.all([
        getAllAnimes().catch(() => []),
        getAllEpisodesByAnimeId(selectedAnimeId === 'all' ? undefined : selectedAnimeId).catch(() => []),
      ]);

      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      setAnimes(animeList);
      setEpisodes(epList);
    } catch {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      setError('Failed to load episodes list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [selectedAnimeId]);

  const handleDuplicateEpisode = async (ep: Episode) => {
    try {
      const duplicated: Omit<Episode, 'id'> = {
        ...ep,
        episodeNumber: (ep.episodeNumber || 1) + 1,
        title: `${ep.title || 'Episode'} (Copy)`,
        published: false,
      };
      delete (duplicated as any).id;
      const createdId = await createEpisode(duplicated);
      const newEp: Episode = {
        ...duplicated,
        id: createdId,
      };
      setEpisodes((prev) => [newEp, ...prev]);
      onShowMessage(`Duplicated as Episode ${newEp.episodeNumber}.`);
    } catch {
      onShowMessage('Failed to duplicate episode.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteEp?.id) return;
    try {
      setIsDeleting(true);
      await deleteEpisode(targetDeleteEp.id);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Episode',
        'Episode',
        targetDeleteEp.id,
        `EP ${targetDeleteEp.episodeNumber} - ${targetDeleteEp.title}`
      );
      setEpisodes((prev) => prev.filter((e) => e.id !== targetDeleteEp.id));
      onShowMessage(`Episode ${targetDeleteEp.episodeNumber} deleted.`);
    } catch {
      onShowMessage('Failed to delete episode.');
    } finally {
      setIsDeleting(false);
      setTargetDeleteEp(null);
    }
  };

  // Compute server count safely across sub/dub/direct video
  const getServerCount = (ep: Episode) => {
    const allSources = ep.sources || ep.videoSources || [];
    const directCount = ep.videoUrl ? 1 : 0;
    return allSources.length + directCount;
  };

  // Filtered episodes
  const filteredEpisodes = useMemo(() => {
    return episodes.filter((ep) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (ep.title || '').toLowerCase().includes(q) ||
        String(ep.episodeNumber).includes(q) ||
        (ep.animeTitle || '').toLowerCase().includes(q);

      const epSeason = ep.seasonNumber || ep.season || 1;
      const matchesSeason = selectedSeason === 'all' || String(epSeason) === selectedSeason;

      return matchesSearch && matchesSeason;
    });
  }, [episodes, searchQuery, selectedSeason]);

  // Current selected anime title
  const currentAnime = animes.find((a) => (a.id === selectedAnimeId || a.slug === selectedAnimeId));

  return (
    <AdminLayout currentTab="episodes" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0">
        {/* Page Header (ONE primary button: "Add episode") */}
        <AdminPageHeader
          title={currentAnime ? `${currentAnime.title} — Episodes` : 'Episodes'}
          description={`${episodes.length} streamable episodes loaded`}
          primaryAction={{
            label: 'Add episode',
            icon: Plus,
            onClick: () => {
              const url = selectedAnimeId !== 'all' ? `/admin/episodes/new?animeId=${selectedAnimeId}` : '/admin/episodes/new';
              navigate(url);
            },
          }}
          secondaryActions={[
            {
              label: 'Bulk import',
              icon: ListPlus,
              onClick: () => {
                const url = selectedAnimeId !== 'all' ? `/admin/episodes/bulk?animeId=${selectedAnimeId}` : '/admin/episodes/bulk';
                navigate(url);
              },
            },
          ]}
        />

        {error && (
          <AdminErrorState
            message={error}
            onRetry={fetchInitialData}
          />
        )}

        {/* Filter Bar: Search + (Anime & Season selects side-by-side on tablet+, stacked on phone) */}
        <div className="space-y-3">
          <AdminSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by episode number or title..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <AdminSelect
                value={selectedAnimeId}
                onChange={(val) => setSelectedAnimeId(String(val))}
                options={[
                  { value: 'all', label: 'All Anime Series' },
                  ...animes.map((a) => ({
                    value: a.id || a.slug,
                    label: a.title,
                  })),
                ]}
                sheetTitle="Filter by Anime"
              />
            </div>

            <div>
              <AdminSelect
                value={selectedSeason}
                onChange={(val) => setSelectedSeason(String(val))}
                options={[
                  { value: 'all', label: 'All Seasons' },
                  { value: '1', label: 'Season 1' },
                  { value: '2', label: 'Season 2' },
                  { value: '3', label: 'Season 3' },
                  { value: '4', label: 'Season 4' },
                ]}
                sheetTitle="Filter by Season"
              />
            </div>
          </div>
        </div>

        {/* Episodes List Container */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="p-8">
              <AdminEmptyState
                icon={Tv}
                title={
                  searchQuery || selectedSeason !== 'all' || selectedAnimeId !== 'all'
                    ? 'No episodes match your filters'
                    : 'No episodes yet — add the first one'
                }
                description={
                  searchQuery || selectedSeason !== 'all' || selectedAnimeId !== 'all'
                    ? 'Try clearing the search query or selecting all seasons.'
                    : 'Start uploading episodes, stream server embeds, and download mirrors.'
                }
                actionLabel="Add episode"
                onAction={() => {
                  const url = selectedAnimeId !== 'all' ? `/admin/episodes/new?animeId=${selectedAnimeId}` : '/admin/episodes/new';
                  navigate(url);
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEpisodes.map((ep) => {
                const epId = ep.id || `ep-${ep.episodeNumber}`;
                const serverCount = getServerCount(ep);
                const seasonNum = ep.seasonNumber || ep.season || 1;
                const parentAnime = animes.find((a) => a.id === ep.animeId || a.slug === ep.animeId || a.slug === ep.animeSlug);
                const animeName = parentAnime?.title || ep.animeTitle || 'Anime';

                return (
                  <AdminListRow
                    key={epId}
                    id={epId}
                    title={`EP ${ep.episodeNumber} · ${ep.title || `Episode ${ep.episodeNumber}`}`}
                    meta={`${animeName} · Season ${seasonNum} · ${serverCount} ${serverCount === 1 ? 'server' : 'servers'}`}
                    thumbnail={ep.thumbnail || parentAnime?.poster}
                    thumbnailType="episode"
                    status={ep.published === false ? 'draft' : ep.status || 'live'}
                    onClick={() => navigate(`/admin/episodes/edit/${epId}`)}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit episode',
                        icon: Tv,
                        onClick: () => navigate(`/admin/episodes/edit/${epId}`),
                      },
                      {
                        id: 'duplicate',
                        label: 'Duplicate',
                        icon: Copy,
                        onClick: () => handleDuplicateEpisode(ep),
                      },
                      {
                        id: 'view',
                        label: 'Watch episode',
                        icon: ExternalLink,
                        onClick: () => {
                          const slug = parentAnime?.slug || ep.animeSlug || ep.animeId;
                          navigate(`/anime/${slug}/episode/${ep.episodeNumber}`);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete episode',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setTargetDeleteEp(ep),
                      },
                    ]}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(targetDeleteEp)}
          onClose={() => setTargetDeleteEp(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Episode ${targetDeleteEp?.episodeNumber}?`}
          consequence="This will permanently delete this episode and its stream links from the player."
          confirmLabel="Delete episode"
          isLoading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};
