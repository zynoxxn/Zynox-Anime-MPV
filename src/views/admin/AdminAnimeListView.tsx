import React, { useEffect, useState } from 'react';
import type { Anime } from '../../types/anime';
import { getAllAnimes, deleteAnime, updateAnime } from '../../lib/firestore/anime';
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
  Search,
  Download,
  Clock,
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
    if (!anime.id) return;
    try {
      const nextStatus = !anime.published;
      await updateAnime(anime.id, { published: nextStatus });
      setAnimes((prev) =>
        prev.map((a) => (a.id === anime.id ? { ...a, published: nextStatus } : a))
      );
      onShowMessage(`Anime marked as ${nextStatus ? 'Published' : 'Draft'}.`);
    } catch (err: any) {
      console.error('Failed to update published status:', err);
      setError('Failed to update published status.');
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
        prev.filter((a) => a.id !== animeToDelete.id && a.slug !== animeToDelete.slug && a.id !== targetId)
      );
      onShowMessage(`"${animeToDelete.title}" deleted successfully.`);
    } catch (err: any) {
      console.error('Failed to delete anime:', err);
      setError('Failed to delete anime.');
    } finally {
      setIsDeleting(false);
      setTargetDeleteAnime(null);
    }
  };

  const filtered = animes.filter((a) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (a.title || '').toLowerCase().includes(q) ||
      (a.slug || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || (a.type || 'TV').toLowerCase() === (typeFilter || 'all').toLowerCase();
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <AdminLayout currentTab="anime" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-5 sm:p-6 rounded-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Anime Library
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              {animes.length} titles registered
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/anime/new')}
            className="px-4 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold rounded-xl shadow-md shadow-[#1683FF]/20 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Anime</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="admin_anime_search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Search anime by title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
            >
              <option value="all">All Statuses</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="upcoming">Upcoming</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
            >
              <option value="all">All Types</option>
              <option value="tv">TV</option>
              <option value="movie">Movie</option>
              <option value="ova">OVA</option>
              <option value="ona">ONA</option>
            </select>
          </div>
        </div>

        {/* Anime Table */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading anime database...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
            No anime found matching your search.
          </div>
        ) : (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filtered.map((anime) => (
                <div
                  key={anime.id || anime.slug}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Left: Thumbnail & Title Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <img
                      src={anime.poster}
                      alt={anime.title}
                      className="w-12 h-16 object-cover rounded-xl shrink-0 border border-white/10"
                    />

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white group-hover:text-[#1683FF] transition-colors truncate">
                          {anime.title}
                        </h3>
                        {(anime.status === 'upcoming' || anime.isUpcoming) && (
                          <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            Upcoming Show
                          </span>
                        )}
                        <span className="text-[10px] text-[#94A3B8] font-mono">/{anime.slug}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#94A3B8]">
                        <span className="font-semibold text-white capitalize bg-white/5 px-2 py-0.5 rounded">
                          {anime.type || 'TV'}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{anime.status || 'ongoing'}</span>
                        <span>•</span>
                        <span>{anime.year || '2026'}</span>
                        <span>•</span>
                        <span className="text-cyan-400">{anime.audioLanguage || 'Hindi Dub'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 pt-3 md:pt-0 w-full md:w-auto justify-end border-t border-white/5 md:border-t-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(anime)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        anime.published
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      {anime.published ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{anime.published ? 'Published' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/anime/${anime.id || anime.slug}/episodes`)}
                      className="px-2.5 sm:px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Episodes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/downloads?animeId=${anime.id || anime.slug}`)}
                      className="px-2.5 sm:px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Manage Downloads (Zip 1, Zip 2, 360p-1080p)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Downloads</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/anime/edit/${anime.id || anime.slug}`)}
                      className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-[#1683FF] text-white transition-colors cursor-pointer"
                      title="Edit Anime"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetDeleteAnime(anime)}
                      className="p-1.5 sm:p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors cursor-pointer"
                      title="Delete Anime"
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
          isOpen={Boolean(targetDeleteAnime)}
          title="Delete Anime Title"
          message={`Are you sure you want to permanently delete "${targetDeleteAnime?.title}"? All associated episodes may become unlinked.`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Anime'}
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTargetDeleteAnime(null)}
        />
      </div>
    </AdminLayout>
  );
};
