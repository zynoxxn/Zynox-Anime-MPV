import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsScheduleItem } from '../../types/cms';
import type { Anime } from '../../types/anime';
import {
  getCmsSchedule,
  saveCmsScheduleItem,
  deleteCmsScheduleItem,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { getAllAnimes } from '../../lib/firestore/anime';
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminListRow,
  AdminSelect,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
} from '../../components/admin';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Tv,
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
      const seenAnime = new Set<string>();
      const dedupedSchedule = schList.filter((item) => {
        const key = item.animeId || item.animeSlug || item.animeTitle;
        if (!key) return true;
        if (seenAnime.has(key)) return false;
        seenAnime.add(key);
        return true;
      });
      setScheduleItems(dedupedSchedule);
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
    const scheduledAnimeIds = new Set(scheduleItems.map((s) => s.animeId || s.animeSlug));
    const availableAnime = animes.find((a) => !scheduledAnimeIds.has(a.id) && !scheduledAnimeIds.has(a.slug)) || animes[0];

    setEditingItem({
      id: `sch-${Date.now()}`,
      animeId: availableAnime?.id || availableAnime?.slug || '',
      animeTitle: availableAnime?.title || '',
      animeSlug: availableAnime?.slug || '',
      animePoster: availableAnime?.poster || '',
      animeBanner: availableAnime?.banner || (availableAnime as any)?.bannerUrl || availableAnime?.poster || '',
      episodeNumber: 1,
      seasonNumber: 1,
      dayOfWeek: 'Monday',
      releaseTime: '20:00',
      timezone: 'Asia/Kolkata',
      language: 'Hindi Dub',
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
      const existing = scheduleItems.find(
        (s) => s.animeId === found.id || s.animeSlug === found.slug || s.animeId === found.slug
      );

      setEditingItem({
        ...(existing || editingItem),
        id: existing?.id || editingItem.id || `sch-${Date.now()}`,
        animeId: found.id || found.slug,
        animeTitle: found.title,
        animeSlug: found.slug,
        animePoster: found.poster,
        animeBanner: found.banner || (found as any).bannerUrl || found.poster || '',
      });
      if (existing) {
        setIsNew(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.animeTitle || !editingItem.dayOfWeek) {
      onShowMessage('Anime title and release day are required.');
      return;
    }

    try {
      setSaving(true);
      const itemToSave: CmsScheduleItem = {
        id: editingItem.id || `sch-${Date.now()}`,
        animeId: editingItem.animeId || '',
        animeTitle: editingItem.animeTitle || '',
        animeSlug: editingItem.animeSlug || '',
        animePoster: editingItem.animePoster || '',
        animeBanner: editingItem.animeBanner || editingItem.animePoster || '',
        episodeNumber: Number(editingItem.episodeNumber) || 1,
        seasonNumber: Number(editingItem.seasonNumber) || 1,
        dayOfWeek: editingItem.dayOfWeek as any,
        releaseTime: editingItem.releaseTime || '20:00',
        timezone: editingItem.timezone || 'Asia/Kolkata',
        language: editingItem.language || 'Hindi Dub',
        status: editingItem.status || 'upcoming',
      };

      await saveCmsScheduleItem(itemToSave);

      if (user?.email) {
        logAdminActivity(
          user.uid || 'admin',
          user.email,
          isNew ? 'CREATE_SCHEDULE_SLOT' : 'UPDATE_SCHEDULE_SLOT',
          'schedule',
          itemToSave.id,
          `${itemToSave.dayOfWeek} ${itemToSave.releaseTime} — ${itemToSave.animeTitle}`
        ).catch(() => {});
      }

      onShowMessage(`Schedule slot saved for "${itemToSave.animeTitle}".`);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Failed to save slot: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await deleteCmsScheduleItem(itemToDelete.id);
      if (user?.email) {
        logAdminActivity(
          user.uid || 'admin',
          user.email,
          'DELETE_SCHEDULE_SLOT',
          'schedule',
          itemToDelete.id,
          `Deleted schedule slot for "${itemToDelete.title}"`
        ).catch(() => {});
      }
      onShowMessage(`Removed schedule slot for "${itemToDelete.title}".`);
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Failed to delete slot: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

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
      onShowMessage(`Synchronized ${count} anime into release schedule.`);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Sync error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return scheduleItems.filter(
      (item) => selectedDay === 'all' || item.dayOfWeek === selectedDay
    );
  }, [scheduleItems, selectedDay]);

  const scheduleTabs = [
    { id: 'all', label: `All (${scheduleItems.length})` },
    ...DAYS_OF_WEEK.map((day) => ({
      id: day,
      label: day.slice(0, 3),
    })),
  ];

  return (
    <AdminLayout currentTab="schedule" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0">
        {/* Page Header (ONE primary button: Add slot) */}
        <AdminPageHeader
          title="Broadcast Schedule"
          description={`${scheduleItems.length} weekly airing slots configured`}
          primaryAction={{
            label: 'Add slot',
            icon: Plus,
            onClick: handleOpenNew,
          }}
          secondaryActions={[
            {
              label: 'Sync from anime',
              icon: RefreshCw,
              onClick: handleAutoSync,
              disabled: saving,
            },
          ]}
        />

        {/* Day Filter Tabs */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-2.5 overflow-x-auto no-scrollbar">
          <AdminSegmentedTabs
            tabs={scheduleTabs}
            activeTab={selectedDay}
            onChange={(tab) => setSelectedDay(tab)}
          />
        </div>

        {/* Schedule List */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <AdminEmptyState
                icon={Calendar}
                title="No schedule slots for this day"
                description="Click 'Add slot' or 'Sync from anime' to schedule broadcasts."
                actionLabel="Add slot"
                onAction={handleOpenNew}
              />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((item) => (
                <AdminListRow
                  key={item.id}
                  id={item.id}
                  title={item.animeTitle}
                  thumbnail={item.animePoster}
                  thumbnailType="poster"
                  meta={`${item.dayOfWeek} at ${item.releaseTime || '20:00'} IST · EP ${item.episodeNumber} · ${item.language || 'Hindi Dub'}`}
                  status={item.status || 'upcoming'}
                  onClick={() => handleOpenEdit(item)}
                  menuItems={[
                    {
                      id: 'edit',
                      label: 'Edit slot',
                      icon: Edit2,
                      onClick: () => handleOpenEdit(item),
                    },
                    {
                      id: 'view',
                      label: 'View anime',
                      icon: Tv,
                      onClick: () => navigate(`/anime/${item.animeSlug || item.animeId}`),
                    },
                    {
                      id: 'delete',
                      label: 'Delete slot',
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setItemToDelete({ id: item.id, title: item.animeTitle }),
                    },
                  ]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Edit / Create Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-[#0B1324] border border-white/10 rounded-[12px] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {isNew ? 'Create Schedule Slot' : 'Edit Schedule Slot'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <AdminSelect
                    label="Select Anime"
                    value={editingItem.animeId || editingItem.animeSlug || ''}
                    onChange={(val) => handleAnimeSelect(String(val))}
                    options={animes.map((a) => ({
                      value: a.id || a.slug,
                      label: a.title,
                    }))}
                    sheetTitle="Choose Anime"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <AdminSelect
                      label="Day of Week"
                      value={editingItem.dayOfWeek || 'Monday'}
                      onChange={(val) => setEditingItem({ ...editingItem, dayOfWeek: String(val) as any })}
                      options={DAYS_OF_WEEK.map((d) => ({
                        value: d,
                        label: d,
                      }))}
                      sheetTitle="Select Day"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Air Time (IST)
                    </label>
                    <input
                      type="time"
                      value={editingItem.releaseTime || '20:00'}
                      onChange={(e) => setEditingItem({ ...editingItem, releaseTime: e.target.value })}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Next Episode #
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.episodeNumber || 1}
                      onChange={(e) => setEditingItem({ ...editingItem, episodeNumber: parseInt(e.target.value, 10) || 1 })}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <AdminSelect
                      label="Status"
                      value={editingItem.status || 'upcoming'}
                      onChange={(val) => setEditingItem({ ...editingItem, status: String(val) as any })}
                      options={[
                        { value: 'upcoming', label: 'Upcoming' },
                        { value: 'airing', label: 'Airing' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'delayed', label: 'Delayed' },
                      ]}
                      sheetTitle="Select Status"
                    />
                  </div>
                </div>

                <div>
                  <AdminSelect
                    label="Audio Language"
                    value={editingItem.language || 'Hindi Dub'}
                    onChange={(val) => setEditingItem({ ...editingItem, language: String(val) })}
                    options={[
                      { value: 'Hindi Dub', label: 'Hindi Dub' },
                      { value: 'Japanese Sub', label: 'Japanese Sub' },
                      { value: 'Dual Audio', label: 'Dual Audio' },
                      { value: 'Multi Audio', label: 'Multi Audio' },
                    ]}
                    sheetTitle="Select Audio"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
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
                    <span>Save slot</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Schedule Slot?`}
          consequence={`This will remove "${itemToDelete?.title}" from the public weekly broadcast schedule.`}
          confirmLabel="Delete slot"
          isLoading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
