import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type {
  CmsAnnouncement,
  AnnouncementType,
  AnnouncementDisplay,
  SitePopupNotice,
} from '../../types/cms';
import {
  getCmsAnnouncements,
  saveCmsAnnouncement,
  deleteCmsAnnouncement,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AdminPopupNoticeEditor } from '../../components/admin/AdminPopupNoticeEditor';
import { SiteNoticeModal } from '../../components/SiteNoticeModal';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';

interface AdminAnnouncementsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminAnnouncementsView: React.FC<AdminAnnouncementsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'popup' | 'banners'>('popup');
  const [previewNotice, setPreviewNotice] = useState<SitePopupNotice | null>(null);
  const [announcements, setAnnouncements] = useState<CmsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<CmsAnnouncement> | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getCmsAnnouncements();
      setAnnouncements(list);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNew = () => {
    setEditingItem({
      id: `announcement-${Date.now()}`,
      title: 'Site Notice',
      message: 'Join our official Telegram community for daily episode drop alerts and Hindi dub updates!',
      type: 'info',
      displayLocation: 'notification',
      link: 'https://t.me/ZynoxAnime',
      buttonText: 'Join Telegram',
      active: true,
      dismissible: true,
    });
    setIsNew(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title || !editingItem.message) return;

    try {
      setSaving(true);
      const toSave = editingItem as CmsAnnouncement;
      await saveCmsAnnouncement(toSave);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isNew ? 'Created Announcement' : 'Updated Announcement',
        'AnnouncementsCMS',
        toSave.id,
        toSave.title
      );
      onShowMessage(`Announcement "${toSave.title}" saved!`);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await deleteCmsAnnouncement(itemToDelete.id);
      onShowMessage(`Announcement "${itemToDelete.title}" removed.`);
      setItemToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'important':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <AdminLayout currentTab="announcements" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Bell className="w-4 h-4" />
              <span>Global Alerts & Notices CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Site Announcements & Popup Manager
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Customize the website open pop-up card, top sticky banners, broadcast alerts, and telegram links.
            </p>
          </div>

          {activeTab === 'banners' && (
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-black shadow-lg shadow-amber-500/30 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </button>
          )}
        </div>

        {/* Top Feature Switcher Tabs */}
        <div className="flex border-b border-white/10 gap-2 bg-[#0B1322] p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('popup')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'popup'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Website Open Popup Card (Editable Header, Notice & Footer)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'banners'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Top Banners & Sticky Alerts ({announcements.length})</span>
          </button>
        </div>

        {/* TAB 1: WEBSITE OPEN POPUP NOTICE CARD */}
        {activeTab === 'popup' && (
          <AdminPopupNoticeEditor
            onShowMessage={onShowMessage}
            onPreviewModal={(n) => setPreviewNotice(n)}
          />
        )}

        {/* TAB 2: SYSTEM ANNOUNCEMENT BANNERS */}
        {activeTab === 'banners' && (
          <>
            {/* List */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading announcements...</div>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="bg-[#0B1322] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-[#94A3B8]">
                        {item.displayLocation}
                      </span>
                      {item.active ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{item.message}</p>
                    {item.link && (
                      <div className="text-[11px] text-[#1683FF] mt-1">
                        Action Button: {item.buttonText || 'Link'} &bull; {item.link}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete({ id: item.id, title: item.title })}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* Real-time On-Screen Live Preview Modal for Admin */}
        {previewNotice && (
          <SiteNoticeModal
            isOpen={!!previewNotice}
            onClose={() => setPreviewNotice(null)}
            notice={previewNotice}
          />
        )}

        {/* Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#0B1322] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {isNew ? 'Create Announcement' : 'Edit Announcement'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Notice Title</label>
                  <input
                    type="text"
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Notice Message</label>
                  <textarea
                    rows={3}
                    value={editingItem.message || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, message: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Notice Style</label>
                    <select
                      value={editingItem.type || 'info'}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          type: e.target.value as AnnouncementType,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="info">Info (Cyan)</option>
                      <option value="success">Success (Emerald)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="important">Important (Rose)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Placement</label>
                    <select
                      value={editingItem.displayLocation || 'top_banner'}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          displayLocation: e.target.value as AnnouncementDisplay,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="top_banner">Top Sticky Banner</option>
                      <option value="popup">Modal Popup</option>
                      <option value="notification">Notification Card</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">CTA Link URL</label>
                    <input
                      type="url"
                      value={editingItem.link || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, link: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Button Label</label>
                    <input
                      type="text"
                      value={editingItem.buttonText || 'Join Telegram'}
                      onChange={(e) => setEditingItem({ ...editingItem, buttonText: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ann-active"
                      checked={editingItem.active ?? true}
                      onChange={(e) => setEditingItem({ ...editingItem, active: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <label htmlFor="ann-active" className="text-xs font-semibold text-white">
                      Active on Live Website
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ann-dismiss"
                      checked={editingItem.dismissible ?? true}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, dismissible: e.target.checked })
                      }
                      className="rounded accent-amber-500"
                    />
                    <label htmlFor="ann-dismiss" className="text-xs font-semibold text-white">
                      User Dismissible
                    </label>
                  </div>
                </div>

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
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-black rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Notice'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!itemToDelete}
          title="Delete Site Announcement?"
          message={itemToDelete ? `Are you sure you want to delete announcement "${itemToDelete.title}"? This cannot be undone.` : ''}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Notice'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
        />
      </div>
    </AdminLayout>
  );
};
