import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsSeason } from '../../types/cms';
import {
  getCmsSeasons,
  saveCmsSeason,
  deleteCmsSeason,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AdminSeasonsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminSeasonsView: React.FC<AdminSeasonsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [seasons, setSeasons] = useState<CmsSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSeason, setEditingSeason] = useState<Partial<CmsSeason> | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getCmsSeasons();
      setSeasons(list);
    } catch (err) {
      console.error('Failed to load seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    setEditingSeason({
      id: `season-${Date.now()}`,
      name: 'Winter 2026',
      slug: 'winter-2026',
      year: 2026,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      status: 'current',
      enabled: true,
    });
    setIsNew(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeason || !editingSeason.name) return;

    try {
      setSaving(true);
      const toSave = editingSeason as CmsSeason;
      await saveCmsSeason(toSave);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isNew ? 'Added Seasonal Period' : 'Updated Season',
        'SeasonsCMS',
        toSave.id,
        toSave.name
      );
      onShowMessage(`Season "${toSave.name}" saved!`);
      setEditingSeason(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!seasonToDelete) return;
    try {
      setDeleting(true);
      await deleteCmsSeason(seasonToDelete.id);
      onShowMessage(`Season "${seasonToDelete.name}" deleted.`);
      setSeasonToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout currentTab="seasons" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Seasonal Catalog CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Seasonal Anime Lineup Manager
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Manage broadcast seasons (Winter, Spring, Summer, Fall) and assign dates and active statuses.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-600/30 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Season</span>
          </button>
        </div>

        {/* Seasons List */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading seasons...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                className="bg-[#0B1322] border border-white/10 rounded-2xl p-5 space-y-3 relative group shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg">
                    {season.year}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSeason(season);
                        setIsNew(false);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeasonToDelete({ id: season.id, name: season.name })}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      title="Delete Season"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">{season.name}</h3>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">/season/{season.slug}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[#94A3B8]">
                  <span className="capitalize text-emerald-400 font-semibold">{season.status}</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/season/${season.slug}`)}
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>View Public</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {editingSeason && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-md bg-[#0B1322] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 shrink-0">
                <h3 className="text-base font-bold text-white">
                  {isNew ? 'Create New Season' : 'Edit Season'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSeason(null)}
                  className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Season Name</label>
                  <input
                    type="text"
                    value={editingSeason.name || ''}
                    onChange={(e) =>
                      setEditingSeason({
                        ...editingSeason,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Year</label>
                    <input
                      type="number"
                      value={editingSeason.year || 2026}
                      onChange={(e) =>
                        setEditingSeason({
                          ...editingSeason,
                          year: parseInt(e.target.value, 10) || 2026,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Status</label>
                    <select
                      value={editingSeason.status || 'current'}
                      onChange={(e) =>
                        setEditingSeason({
                          ...editingSeason,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="current">Current Season</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingSeason(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Season'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Season Modal */}
        <ConfirmModal
          isOpen={!!seasonToDelete}
          title="Delete Seasonal Group?"
          message={seasonToDelete ? `Are you sure you want to delete season "${seasonToDelete.name}"?` : ''}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Season'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setSeasonToDelete(null)}
        />
      </div>
    </AdminLayout>
  );
};
