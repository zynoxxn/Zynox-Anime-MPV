import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type {
  SitePopupNotice,
  CmsAnnouncement,
  AnnouncementType,
} from '../../types/cms';
import {
  getCmsPopupNotice,
  saveCmsPopupNotice,
  DEFAULT_POPUP_NOTICE,
  getCmsAnnouncements,
  saveCmsAnnouncement,
  deleteCmsAnnouncement,
  logAdminActivity,
} from '../../lib/firestore/cms';
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminToggle,
  AdminColorField,
  AdminStickySaveBar,
  AdminListRow,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminSkeleton,
  AdminSelect,
  AdminStatusBadge,
} from '../../components/admin';
import {
  Bell,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ExternalLink,
  RefreshCw,
  Eye,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Megaphone,
} from 'lucide-react';

interface AdminNoticeViewProps {
  initialTab?: 'popup' | 'announcements';
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminNoticeView: React.FC<AdminNoticeViewProps> = ({
  initialTab = 'popup',
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const qTab = (searchParams.get('tab') as 'popup' | 'announcements') || initialTab;

  const [activeTab, setActiveTab] = useState<'popup' | 'announcements'>(qTab);

  // Popup notice state
  const [notice, setNotice] = useState<SitePopupNotice>(DEFAULT_POPUP_NOTICE);
  const [loadingNotice, setLoadingNotice] = useState(true);
  const [savingNotice, setSavingNotice] = useState(false);
  const [isNoticeDirty, setIsNoticeDirty] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<CmsAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<CmsAnnouncement> | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<CmsAnnouncement | null>(null);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(false);

  // Load popup notice
  const loadPopupNotice = async () => {
    try {
      setLoadingNotice(true);
      const data = await getCmsPopupNotice();
      setNotice(data);
      setIsNoticeDirty(false);
    } catch (err) {
      console.error('Failed to load popup notice:', err);
    } finally {
      setLoadingNotice(false);
    }
  };

  // Load announcements
  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const list = await getCmsAnnouncements();
      setAnnouncements(list);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    loadPopupNotice();
    loadAnnouncements();
  }, []);

  // Update popup notice field
  const updateNoticeField = (path: string, value: any) => {
    setNotice((prev) => {
      const copy = { ...prev };
      if (path === 'enabled') copy.enabled = value;
      else if (path === 'displayDelaySeconds') copy.displayDelaySeconds = value;
      else if (path.startsWith('header.')) {
        const key = path.replace('header.', '');
        copy.header = { ...copy.header, [key]: value };
      } else if (path.startsWith('notice.')) {
        const key = path.replace('notice.', '');
        copy.notice = { ...copy.notice, [key]: value };
      } else if (path.startsWith('footer.')) {
        const key = path.replace('footer.', '');
        copy.footer = { ...copy.footer, [key]: value };
      }
      return copy;
    });
    setIsNoticeDirty(true);
  };

  const handleSaveNotice = async () => {
    try {
      setSavingNotice(true);
      const newVersion = `${Date.now()}`;
      const updated: SitePopupNotice = {
        ...notice,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      };
      await saveCmsPopupNotice(updated);
      setNotice(updated);

      try {
        localStorage.removeItem('zynox_popup_notice_ver');
        localStorage.removeItem('zynox_popup_notice_time');
        sessionStorage.removeItem('zynox_popup_notice_session');
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('zynox:notice-updated', { detail: updated })
        );
      }

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated Opening Site Popup Notice',
        'PopupNoticeCMS',
        'popup-notice',
        `Title: ${notice.header?.title} (Enabled: ${notice.enabled})`
      );

      onShowMessage('Popup notice saved and version updated.');
      setIsNoticeDirty(false);
    } catch {
      onShowMessage('Failed to save popup notice.');
    } finally {
      setSavingNotice(false);
    }
  };

  const handleResetVersion = () => {
    const newVersion = `${Date.now()}`;
    setNotice((prev) => ({ ...prev, version: newVersion }));
    setIsNoticeDirty(true);
    onShowMessage('Version bumped. All visitors will see this notice again.');
  };

  // Announcements CRUD
  const handleOpenNewAnnouncement = () => {
    setEditingAnnouncement({
      id: `announcement-${Date.now()}`,
      title: 'Site Announcement',
      message: 'Join our official Telegram community for daily episode updates and streaming links!',
      type: 'info',
      displayLocation: 'notification',
      link: 'https://t.me/ZynoxAnime',
      buttonText: 'Join Telegram',
      active: true,
      dismissible: true,
    });
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editingAnnouncement.title || !editingAnnouncement.message) {
      onShowMessage('Announcement title and message are required.');
      return;
    }

    try {
      setSavingAnnouncement(true);
      const toSave = editingAnnouncement as CmsAnnouncement;
      await saveCmsAnnouncement(toSave);

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Saved Announcement',
        'AnnouncementsCMS',
        toSave.id,
        toSave.title
      );

      onShowMessage(`Saved announcement "${toSave.title}".`);
      setEditingAnnouncement(null);
      await loadAnnouncements();
    } catch {
      onShowMessage('Failed to save announcement.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      setDeletingAnnouncement(true);
      await deleteCmsAnnouncement(announcementToDelete.id);
      onShowMessage(`Deleted announcement "${announcementToDelete.title}".`);
      setAnnouncementToDelete(null);
      await loadAnnouncements();
    } catch {
      onShowMessage('Failed to delete announcement.');
    } finally {
      setDeletingAnnouncement(false);
    }
  };

  const noticeColorSwatches = [
    '#1E88FF', // Zynox Electric Blue (Primary)
    '#00F0FF', // Cyber Cyan
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#F43F5E', // Rose
  ];

  return (
    <AdminLayout currentTab="notice" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-24">
        {/* Page Header */}
        <AdminPageHeader
          title="Popups & Site Notices"
          description="Manage visitor entry popup modal and top-bar broadcast alerts"
          primaryAction={
            activeTab === 'announcements'
              ? {
                  label: 'Add announcement',
                  icon: Plus,
                  onClick: handleOpenNewAnnouncement,
                }
              : undefined
          }
        />

        {/* Segmented Tabs (Opening popup · Announcements) */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-2.5 max-w-sm">
          <AdminSegmentedTabs
            tabs={[
              { id: 'popup', label: 'Opening Popup' },
              { id: 'announcements', label: `Announcements (${announcements.length})` },
            ]}
            activeTab={activeTab}
            onChange={(t) => setActiveTab(t as any)}
          />
        </div>

        {/* TAB 1: OPENING POPUP (Form Left + Live Preview Right) */}
        {activeTab === 'popup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Left (7 Cols) */}
            <div className="lg:col-span-7 bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1E88FF]" />
                  <h2 className="text-sm font-semibold text-white">
                    Popup Modal Content
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetVersion}
                  className="text-xs text-[#1E88FF] hover:underline cursor-pointer"
                  title="Bump version to display to all returning visitors"
                >
                  Reset version for all users
                </button>
              </div>

              {/* Enabled toggle */}
              <AdminToggle
                checked={notice.enabled}
                onChange={(val) => updateNoticeField('enabled', val)}
                label="Enable Opening Popup Modal"
                description="When turned on, visitors see this modal upon entering the website."
              />

              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Popup Title <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    value={notice.header?.title || ''}
                    onChange={(e) => updateNoticeField('header.title', e.target.value)}
                    placeholder="Welcome to ZYNOX"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Badge / Tag
                  </label>
                  <input
                    type="text"
                    value={notice.header?.badgeText || ''}
                    onChange={(e) => updateNoticeField('header.badgeText', e.target.value)}
                    placeholder="OFFICIAL NOTICE"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Accent ColorField */}
              <AdminColorField
                label="Accent Color (Heading & Action)"
                value={notice.header?.titleColor || '#1E88FF'}
                onChange={(color) => updateNoticeField('header.titleColor', color)}
                presetSwatches={noticeColorSwatches}
                helperText="Sets the glowing accent tone for the modal title and action button."
              />

              {/* Body Text */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Notice Message
                </label>
                <textarea
                  rows={3}
                  value={notice.notice?.text || ''}
                  onChange={(e) => updateNoticeField('notice.text', e.target.value)}
                  placeholder="Enter notice message shown to visitors..."
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Primary Button Label
                  </label>
                  <input
                    type="text"
                    value={notice.footer?.primaryButtonText || 'Join Telegram'}
                    onChange={(e) => updateNoticeField('footer.primaryButtonText', e.target.value)}
                    className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Primary Button URL
                  </label>
                  <input
                    type="text"
                    value={notice.footer?.primaryButtonUrl || 'https://t.me/ZynoxAnime'}
                    onChange={(e) => updateNoticeField('footer.primaryButtonUrl', e.target.value)}
                    className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Secondary Button Label
                  </label>
                  <input
                    type="text"
                    value={notice.footer?.secondaryButtonText || 'Close'}
                    onChange={(e) => updateNoticeField('footer.secondaryButtonText', e.target.value)}
                    className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Display Delay (Seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={notice.displayDelaySeconds ?? 6}
                    onChange={(e) => updateNoticeField('displayDelaySeconds', parseInt(e.target.value, 10) || 0)}
                    className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Right (5 Cols) */}
            <div className="lg:col-span-5 bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-3 sticky top-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#1E88FF]" />
                  <span className="text-xs font-semibold text-white">Live Visitor Preview</span>
                </div>
                <span className="text-[11px] text-[#94A3B8]">
                  {notice.enabled ? 'Status: Active' : 'Status: Disabled'}
                </span>
              </div>

              {/* Scaled-down popup modal mockup */}
              <div className="bg-[#050A14] border border-white/10 rounded-[14px] p-5 shadow-2xl relative overflow-hidden">
                <div
                  className="absolute -top-12 -left-12 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
                  style={{ backgroundColor: notice.header?.titleColor || '#1E88FF' }}
                />

                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    {notice.header?.badgeText && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                        style={{
                          backgroundColor: `${notice.header?.titleColor || '#1E88FF'}22`,
                          color: notice.header?.titleColor || '#1E88FF',
                        }}
                      >
                        {notice.header.badgeText}
                      </span>
                    )}
                    <span className="text-xs text-[#64748B]">✕</span>
                  </div>

                  <h3
                    className="text-base font-bold text-white tracking-tight"
                    style={{ color: notice.header?.titleColor || '#FFFFFF' }}
                  >
                    {notice.header?.title || 'Popup Notice Title'}
                  </h3>

                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {notice.notice?.text || 'Notice description paragraph appears here.'}
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 h-9 rounded-[8px] text-xs font-semibold text-white flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: notice.header?.titleColor || '#1E88FF' }}
                    >
                      {notice.footer?.primaryButtonText || 'Primary Action'}
                    </button>
                    <button
                      type="button"
                      className="px-3 h-9 rounded-[8px] bg-white/5 text-[#CBD5E1] text-xs font-medium border border-white/10"
                    >
                      {notice.footer?.secondaryButtonText || 'Dismiss'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">
                  Top Bar Banners & Broadcast Alerts ({announcements.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleOpenNewAnnouncement}
                className="h-8 px-2.5 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add announcement</span>
              </button>
            </div>

            {loadingAnnouncements ? (
              <div className="p-4 space-y-3">
                <AdminSkeleton variant="text" count={5} />
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8">
                <AdminEmptyState
                  icon={Megaphone}
                  title="No broadcast announcements"
                  description="Add notification banners or sticky alerts for site updates."
                  actionLabel="Add announcement"
                  onAction={handleOpenNewAnnouncement}
                />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {announcements.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    meta={`${item.type.toUpperCase()} · ${item.displayLocation} · ${(item.message || '').slice(0, 70)}...`}
                    status={item.active ? 'live' : 'draft'}
                    onClick={() => setEditingAnnouncement(item)}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit announcement',
                        icon: Edit2,
                        onClick: () => setEditingAnnouncement(item),
                      },
                      {
                        id: 'delete',
                        label: 'Delete announcement',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setAnnouncementToDelete(item),
                      },
                    ]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sticky Save Bar for Popup Notice */}
        {activeTab === 'popup' && isNoticeDirty && (
          <AdminStickySaveBar
            message="Unsaved popup modal changes"
            saveLabel="Save popup"
            saving={savingNotice}
            onSave={handleSaveNotice}
            onDiscard={loadPopupNotice}
          />
        )}

        {/* Edit Announcement Modal */}
        {editingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-[#0B1324] border border-white/10 rounded-[12px] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {editingAnnouncement.id?.startsWith('announcement-') ? 'New Announcement' : 'Edit Announcement'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Title <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAnnouncement.title || ''}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Message Body <span className="text-[#1E88FF]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editingAnnouncement.message || ''}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, message: e.target.value })}
                    className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <AdminSelect
                      label="Type"
                      value={editingAnnouncement.type || 'info'}
                      onChange={(val) => setEditingAnnouncement({ ...editingAnnouncement, type: val as any })}
                      options={[
                        { value: 'info', label: 'Info' },
                        { value: 'success', label: 'Success' },
                        { value: 'warning', label: 'Warning' },
                        { value: 'important', label: 'Important / Urgent' },
                      ]}
                      sheetTitle="Announcement Type"
                    />
                  </div>

                  <div>
                    <AdminSelect
                      label="Display Location"
                      value={editingAnnouncement.displayLocation || 'notification'}
                      onChange={(val) => setEditingAnnouncement({ ...editingAnnouncement, displayLocation: val as any })}
                      options={[
                        { value: 'notification', label: 'Notification Center' },
                        { value: 'top_bar', label: 'Top Sticky Bar' },
                        { value: 'both', label: 'Both Top Bar & Center' },
                      ]}
                      sheetTitle="Display Location"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Button Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingAnnouncement.buttonText || ''}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, buttonText: e.target.value })}
                      placeholder="e.g. Join Telegram"
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Link URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingAnnouncement.link || ''}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, link: e.target.value })}
                      placeholder="https://..."
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <AdminToggle
                    checked={editingAnnouncement.active ?? true}
                    onChange={(checked) => setEditingAnnouncement({ ...editingAnnouncement, active: checked })}
                    label="Active Announcement"
                    description="Displays in the selected location to visitors."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingAnnouncement(null)}
                    className="h-10 px-4 rounded-[10px] border border-white/10 hover:border-white/20 text-[#CBD5E1] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAnnouncement}
                    className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingAnnouncement ? 'Saving...' : 'Save announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Announcement Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(announcementToDelete)}
          onClose={() => setAnnouncementToDelete(null)}
          onConfirm={handleDeleteAnnouncement}
          title={`Delete "${announcementToDelete?.title}"?`}
          consequence="This announcement will be permanently removed."
          confirmLabel="Delete announcement"
          isLoading={deletingAnnouncement}
        />
      </div>
    </AdminLayout>
  );
};
