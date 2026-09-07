import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsScheduleItem, ScheduleStatus } from '../../types/cms';
import type { Anime } from '../../types/anime';
import {
  getCmsSchedule,
  saveCmsScheduleItem,
  deleteCmsScheduleItem,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { getAllAnimes } from '../../lib/firestore/anime';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

interface AdminScheduleViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const AdminScheduleView: React.FC<AdminScheduleViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [scheduleItems, setScheduleItems] = useState<CmsScheduleItem[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<Partial<CmsScheduleItem> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schList, animeList] = await Promise.all([getCmsSchedule(), getAllAnimes()]);
      setScheduleItems(schList);
      setAnimes(animeList);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    setEditingItem({
      id: `sch-${Date.now()}`,
      animeId: animes[0]?.id || animes[0]?.slug || '',
      animeTitle: animes[0]?.title || '',
      animeSlug: animes[0]?.slug || '',
      animePoster: animes[0]?.poster || '',
      episodeNumber: 1,
      seasonNumber: 1,
      dayOfWeek: 'Monday',
      releaseTime: '20:00',
      timezone: 'Asia/Kolkata',
      language: 'Hindi Dub & Japanese Sub',
      status: 'upcoming',
    });
    setIsNew(true);
  };

  const handleOpenEdit = (item: CmsScheduleItem) => {
    setEditingItem({ ...item });
    setIsNew(false);
  };

  const handleAnimeSelect = (animeIdOrSlug: string) => {
    const found = animes.find((a) => a.id === animeIdOrSlug || a.slug === animeIdOrSlug);
    if (found && editingItem) {
      setEditingItem({
        ...editingItem,
        animeId: found.id || found.slug,
        animeTitle: found.title,
        animeSlug: found.slug,
        animePoster: found.poster,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.animeTitle || !editingItem.releaseTime) {
      onShowMessage('Please fill all required schedule fields.');
      return;
    }

    try {
      setSaving(true);
      const itemToSave = editingItem as CmsScheduleItem;
      await saveCmsScheduleItem(itemToSave);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isNew ? 'Added Schedule Item' : 'Updated Schedule Item',
        'Schedule',
        itemToSave.id,
        `${itemToSave.animeTitle} - ${itemToSave.dayOfWeek} at ${itemToSave.releaseTime}`
      );
      onShowMessage(`Schedule item for "${itemToSave.animeTitle}" saved successfully!`);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save schedule:', err);
      onShowMessage(`Error: ${err.message || 'Could not save schedule item'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await deleteCmsScheduleItem(itemToDelete.id);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Schedule Item',
        'Schedule',
        itemToDelete.id,
        `Removed schedule item: ${itemToDelete.title}`
      );
      onShowMessage(`Schedule item "${itemToDelete.title}" deleted.`);
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message || 'Could not delete item'}`);
    } finally {
      setDeleting(false);
    }
  };

  // Auto-sync schedule items from anime database
  const handleAutoSync = async () => {
    try {
      setSaving(true);
      let count = 0;
      for (const a of animes) {
        if (a.releaseDay && a.status === 'ongoing') {
          const rDay = (a.releaseDay || '').toLowerCase();
          const matchDay = DAYS_OF_WEEK.find(
            (d) => d.toLowerCase() === rDay
          );
          if (matchDay) {
            const schItem: CmsScheduleItem = {
              id: `sch-auto-${a.slug}`,
              animeId: a.id || a.slug,
              animeTitle: a.title,
              animeSlug: a.slug,
              animePoster: a.poster,
              episodeNumber: (a.totalEpisodes ? Math.min(a.totalEpisodes, 12) : 1),
              dayOfWeek: matchDay,
              releaseTime: a.releaseTime || '20:00',
              timezone: a.timezone || 'Asia/Kolkata',
              language: a.audioLanguage || 'Hindi Dub',
              status: 'upcoming',
            };
            await saveCmsScheduleItem(schItem);
            count++;
          }
        }
      }
      onShowMessage(`Successfully synchronized ${count} anime into broadcast schedule!`);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Sync error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = scheduleItems.filter(
    (item) => selectedDay === 'all' || item.dayOfWeek === selectedDay
  );

  return (
    <AdminLayout currentTab="schedule" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#1683FF] uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Broadcast Matrix CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Anime Release Schedule Manager
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Control public weekly broadcast times, countdown clocks, episode numbers, and status overrides.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleAutoSync}
              disabled={saving}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-cyan-400 border border-cyan-500/20 rounded-xl transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              <span>Auto-Sync from Anime</span>
            </button>
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Schedule Slot</span>
            </button>
          </div>
        </div>

        {/* Day Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#0B1322] border border-white/5 p-3 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDay === 'all'
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
            }`}
          >
            All Days ({scheduleItems.length})
          </button>
          {DAYS_OF_WEEK.map((day) => {
            const count = scheduleItems.filter((i) => i.dayOfWeek === day).length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedDay === day
                    ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{day}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Schedule Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading schedule slots...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8] space-y-3">
            <Calendar className="w-10 h-10 text-[#1683FF] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-white">No schedule slots found</h3>
            <p className="text-xs max-w-sm mx-auto">
              Click &quot;Add Schedule Slot&quot; or &quot;Auto-Sync from Anime&quot; to populate your weekly broadcast schedule.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-[#0B1322] border border-white/5 hover:border-[#1683FF]/40 rounded-2xl p-4 transition-all flex gap-3.5 relative group"
              >
                <img
                  src={item.animePoster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'}
                  alt={item.animeTitle}
                  className="w-16 h-24 object-cover rounded-xl shrink-0 border border-white/10"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#1683FF] bg-[#1683FF]/10 px-2 py-0.5 rounded">
                        {item.dayOfWeek}
                      </span>
                      <span className="font-mono text-cyan-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.releaseTime}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{item.animeTitle}</h4>
                    <div className="text-[11px] text-[#94A3B8]">
                      Episode {item.episodeNumber} • {item.language || 'Hindi Dub'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">
                      {item.status}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                        title="Edit Slot"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, title: item.animeTitle })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        title="Delete Slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit / New Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-lg bg-[#0B1322] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {isNew ? 'Create New Schedule Slot' : 'Edit Schedule Slot'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Select Anime */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Select Anime Series</label>
                  <select
                    value={editingItem.animeId || editingItem.animeSlug || ''}
                    onChange={(e) => handleAnimeSelect(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    {animes.map((a) => (
                      <option key={a.id || a.slug} value={a.id || a.slug}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Day of Week</label>
                    <select
                      value={editingItem.dayOfWeek || 'Monday'}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          dayOfWeek: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Air Time (24-Hour)</label>
                    <input
                      type="text"
                      placeholder="e.g. 20:30"
                      value={editingItem.releaseTime || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, releaseTime: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                      required
                    />
                  </div>
                </div>

                {/* Episode & Season Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Episode Number</label>
                    <input
                      type="number"
                      value={editingItem.episodeNumber || 1}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          episodeNumber: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Broadcast Status</label>
                    <select
                      value={editingItem.status || 'upcoming'}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          status: e.target.value as ScheduleStatus,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="released">Released</option>
                      <option value="delayed">Delayed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Audio Language & Timezone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Audio Language</label>
                    <input
                      type="text"
                      placeholder="e.g. Hindi Dub & JPN Sub"
                      value={editingItem.language || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, language: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Timezone</label>
                    <input
                      type="text"
                      value={editingItem.timezone || 'Asia/Kolkata'}
                      onChange={(e) => setEditingItem({ ...editingItem, timezone: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white rounded-xl shadow-lg shadow-[#1683FF]/30 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Slot'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Modal */}
        <ConfirmModal
          isOpen={!!itemToDelete}
          title="Delete Schedule Broadcast Slot?"
          message={itemToDelete ? `Are you sure you want to remove "${itemToDelete.title}" from the broadcast schedule?` : ''}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Slot'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
        />
      </div>
    </AdminLayout>
  );
};
