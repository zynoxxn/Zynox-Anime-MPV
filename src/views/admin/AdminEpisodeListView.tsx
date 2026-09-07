import React, { useEffect, useState } from 'react';
import type { Episode } from '../../types/episode';
import type { Anime } from '../../types/anime';
import { getAllEpisodesByAnimeId, deleteEpisode, updateEpisode } from '../../lib/firestore/episodes';
import { getAllAnimes } from '../../lib/firestore/anime';
import { logAdminActivity } from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  PlusCircle,
  Edit,
  Trash2,
  Tv,
  Film,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Search,
  Server,
  Layers,
  Download,
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
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>(
    qSeason ? parseInt(qSeason, 10) || 'all' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetDeleteEp, setTargetDeleteEp] = useState<Episode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [animeList, epList] = await Promise.all([
        getAllAnimes(),
        getAllEpisodesByAnimeId(selectedAnimeId === 'all' ? undefined : selectedAnimeId),
      ]);
      setAnimes(animeList);
      setEpisodes(epList);
    } catch (err: any) {
      console.error('Error fetching admin episodes:', err);
      setError('Failed to load episodes list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [selectedAnimeId]);

  const handleTogglePublish = async (ep: Episode) => {
    if (!ep.id) return;
    try {
      const nextStatus = !ep.published;
      await updateEpisode(ep.id, { published: nextStatus });
      setEpisodes((prev) =>
        prev.map((e) => (e.id === ep.id ? { ...e, published: nextStatus } : e))
      );
      onShowMessage(`Episode marked as ${nextStatus ? 'Published' : 'Draft'}.`);
    } catch (err: any) {
      console.error('Failed to update published status:', err);
      setError('Failed to update episode published status.');
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
        `Ep ${targetDeleteEp.episodeNumber} - ${targetDeleteEp.title || ''}`
      );
      setEpisodes((prev) => prev.filter((e) => e.id !== targetDeleteEp.id));
      onShowMessage('Episode deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete episode:', err);
      setError('Failed to delete episode.');
    } finally {
      setIsDeleting(false);
      setTargetDeleteEp(null);
    }
  };

  const getAnimeTitle = (animeId: string): string => {
    const found = animes.find((a) => a.id === animeId || a.slug === animeId);
    return found ? found.title : animeId;
  };

  const selectedAnime = animes.find((a) => a.id === selectedAnimeId || a.slug === selectedAnimeId);

  const availableSeasons = React.useMemo(() => {
    const set = new Set<number>();
    if (selectedAnime?.seasonsList) {
      selectedAnime.seasonsList.forEach((s) => {
        if (s.seasonNumber) set.add(Number(s.seasonNumber));
      });
    }
    episodes.forEach((ep) => {
      set.add(Number(ep.seasonNumber || ep.season || 1));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [episodes, selectedAnime]);

  const filtered = episodes.filter((ep) => {
    const titleMatch = (ep.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const numMatch = ep.episodeNumber.toString().includes(searchQuery);
    const epSeason = Number(ep.seasonNumber || ep.season || 1);
    const seasonMatch = selectedSeason === 'all' || epSeason === selectedSeason;
    return (titleMatch || numMatch) && seasonMatch;
  });

  return (
    <AdminLayout currentTab="episodes" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-5 sm:p-6 rounded-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Episodes
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              {episodes.length} total episodes {selectedSeason !== 'all' && `(Season ${selectedSeason})`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                let url = '/admin/downloads';
                if (selectedAnimeId !== 'all') {
                  url += `?animeId=${selectedAnimeId}`;
                  if (selectedSeason !== 'all') {
                    url += `&season=${selectedSeason}`;
                  }
                }
                navigate(url);
              }}
              className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-bold rounded-xl shadow-md shadow-amber-500/10 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
              title="Bulk Episode Downloads Manager (Zip 1, Zip 2, 360p, 480p, 720p, 1080p)"
            >
              <Download className="w-4 h-4" />
              <span>Downloads</span>
            </button>

            <button
              type="button"
              onClick={() => {
                let url = '/admin/episodes/new';
                if (selectedAnimeId !== 'all') {
                  url += `?animeId=${selectedAnimeId}`;
                  if (selectedSeason !== 'all') {
                    url += `&season=${selectedSeason}`;
                  }
                }
                navigate(url);
              }}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Episode</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search episodes by title or episode number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedAnimeId}
              onChange={(e) => {
                setSelectedAnimeId(e.target.value);
                setSelectedSeason('all');
              }}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              <option value="all">All Anime Series ({episodes.length} eps)</option>
              {animes.map((a) => (
                <option key={a.id || a.slug} value={a.id || a.slug}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {availableSeasons.length > 1 && (
            <div className="w-full sm:w-44">
              <select
                value={selectedSeason}
                onChange={(e) =>
                  setSelectedSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="all">All Seasons ({episodes.length})</option>
                {availableSeasons.map((s) => {
                  const meta = selectedAnime?.seasonsList?.find(
                    (sl) => Number(sl.seasonNumber) === s
                  );
                  return (
                    <option key={s} value={s}>
                      {meta?.title || `Season ${s}`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Episodes Table */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading episode catalog...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
            No episodes found. Select another anime or add a new episode.
          </div>
        ) : (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filtered.map((ep) => (
                <div
                  key={ep.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-14 h-10 rounded-lg bg-[#050A14] border border-white/10 shrink-0 overflow-hidden relative">
                      {ep.thumbnail ? (
                        <img
                          src={ep.thumbnail}
                          alt={ep.title || 'Ep'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cyan-400 font-bold text-xs">
                          #{ep.episodeNumber}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          EP {ep.episodeNumber}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {ep.title || `Episode ${ep.episodeNumber}`}
                        </h3>
                      </div>

                      <div className="text-[11px] text-[#94A3B8] flex items-center gap-2">
                        <span className="font-semibold text-white truncate max-w-[200px]">
                          {getAnimeTitle(ep.animeId)}
                        </span>
                        <span>•</span>
                        <span>Season {ep.seasonNumber || 1}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Server className="w-3 h-3" />
                          {ep.videoSources?.length || (ep.videoUrl ? 1 : 0)} servers active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(ep)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        ep.published
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {ep.published ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{ep.published ? 'Live' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/downloads?animeId=${ep.animeId}&season=${ep.seasonNumber || 1}`)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black transition-colors"
                      title="Manage Downloads (Zip, 360p-1080p)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/episodes/edit/${ep.id}`)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500 text-white transition-colors"
                      title="Edit Episode"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetDeleteEp(ep)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors"
                      title="Delete Episode"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={Boolean(targetDeleteEp)}
          title="Delete Episode"
          message={`Are you sure you want to permanently delete Episode ${targetDeleteEp?.episodeNumber} (${targetDeleteEp?.title || ''})?`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Episode'}
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTargetDeleteEp(null)}
        />
      </div>
    </AdminLayout>
  );
};
