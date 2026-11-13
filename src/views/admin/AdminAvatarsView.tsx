import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { AnimeAvatar, DEFAULT_AVATAR } from '../../data/avatars';
import {
  getAnimeAvatars,
  saveAnimeAvatar,
  saveBulkAnimeAvatars,
  deleteAnimeAvatar,
  deleteBulkAnimeAvatars,
  resetDefaultAnimeAvatars,
  DEFAULT_DRIVE_FOLDER_ID,
  syncDriveAvatarsToFirestore,
  fetchDriveFolderAvatars,
} from '../../lib/firestore/avatars';
import { compressAvatarImage } from '../../lib/image-compress';
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminSelectionBar,
  AdminConfirmDialog,
  AdminSkeleton,
  AdminEmptyState,
} from '../../components/admin';
import {
  Plus,
  RefreshCw,
  Trash2,
  Check,
  CheckCircle2,
  X,
  Upload,
  FolderSync,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Users,
} from 'lucide-react';

interface AdminAvatarsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminAvatarsView: React.FC<AdminAvatarsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const [avatars, setAvatars] = useState<AnimeAvatar[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-select for avatars
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Google Drive Sync Card
  const [showDriveDetails, setShowDriveDetails] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncReviewModalOpen, setSyncReviewModalOpen] = useState(false);
  const [syncPreviewList, setSyncPreviewList] = useState<AnimeAvatar[]>([]);
  const [isSavingSync, setIsSavingSync] = useState(false);

  // Add Single Avatar Modal
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [singleName, setSingleName] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleSaving, setSingleSaving] = useState(false);
  const singleFileRef = useRef<HTMLInputElement>(null);

  // Bulk Upload by URLs Modal
  const [isBulkUrlModalOpen, setIsBulkUrlModalOpen] = useState(false);
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Bulk Files Upload Ref
  const bulkFilesRef = useRef<HTMLInputElement>(null);

  // Confirmation dialogs
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const list = await getAnimeAvatars(forceRefresh);
      setAvatars(list);
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to load avatars list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Selection toggle
  const toggleSelectAvatar = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Google Drive Sync Flow: Sync -> Review Dialog -> Save to DB
  const handleStartDriveSync = async () => {
    try {
      setIsSyncingDrive(true);
      const syncedItems = await fetchDriveFolderAvatars(DEFAULT_DRIVE_FOLDER_ID, true);
      setSyncPreviewList(syncedItems);
      setSyncReviewModalOpen(true);
    } catch (err: any) {
      onShowMessage(`Google Drive sync error: ${err.message}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleConfirmSaveSync = async () => {
    try {
      setIsSavingSync(true);
      const count = await syncDriveAvatarsToFirestore();
      await loadData(true);
      setSyncReviewModalOpen(false);
      onShowMessage(`Saved ${count} avatars from Google Drive!`);
    } catch (err: any) {
      onShowMessage(`Failed to save synced avatars: ${err.message}`);
    } finally {
      setIsSavingSync(false);
    }
  };

  // Single Add / File Compress
  const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarImage(file);
      setSingleUrl(compressed);
      if (!singleName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setSingleName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch {
      onShowMessage('Failed to read and compress image file.');
    }
  };

  const handleSaveSingleAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) {
      onShowMessage('Please provide an image URL or upload a file.');
      return;
    }
    try {
      setSingleSaving(true);
      const newAvatar = await saveAnimeAvatar({
        id: `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: singleName.trim() || `Avatar ${avatars.length + 1}`,
        url: singleUrl.trim(),
        anime: 'Custom',
        category: 'Popular',
        accentColor: '#1E88FF',
      });
      await loadData(true);
      setIsSingleModalOpen(false);
      setSingleName('');
      setSingleUrl('');
      onShowMessage(`Added avatar "${newAvatar.name}".`);
    } catch (err: any) {
      onShowMessage(`Failed to save avatar: ${err.message}`);
    } finally {
      setSingleSaving(false);
    }
  };

  // Bulk URLs Parse and Save
  const handleSaveBulkUrls = async () => {
    const lines = bulkUrlsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));

    if (lines.length === 0) {
      onShowMessage('Please enter at least one valid image URL starting with http.');
      return;
    }

    try {
      setBulkSaving(true);
      await saveBulkAnimeAvatars(lines);
      await loadData(true);
      setIsBulkUrlModalOpen(false);
      setBulkUrlsText('');
      onShowMessage(`Imported ${lines.length} avatars successfully!`);
    } catch (err: any) {
      onShowMessage(`Failed to import avatars: ${err.message}`);
    } finally {
      setBulkSaving(false);
    }
  };

  // Bulk Files Select
  const handleBulkFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      const compressedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressAvatarImage(file);
        if (compressed) {
          compressedUrls.push(compressed);
        }
      }
      if (compressedUrls.length > 0) {
        await saveBulkAnimeAvatars(compressedUrls);
        await loadData(true);
        onShowMessage(`Uploaded and compressed ${compressedUrls.length} avatar images.`);
      }
    } catch (err: any) {
      onShowMessage(`Error processing image files: ${err.message}`);
    } finally {
      setLoading(false);
      if (bulkFilesRef.current) bulkFilesRef.current.value = '';
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setIsDeleting(true);
      await deleteBulkAnimeAvatars(ids);
      setAvatars((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      onShowMessage(`Deleted ${ids.length} avatars.`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (err: any) {
      onShowMessage(`Failed to delete avatars: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete All with keyword DELETE
  const handleDeleteAll = async () => {
    try {
      setIsDeleting(true);
      const allIds = avatars.map((a) => a.id);
      await deleteBulkAnimeAvatars(allIds);
      setAvatars([]);
      setSelectedIds(new Set());
      setShowDeleteAllConfirm(false);
      onShowMessage('All avatars have been removed.');
    } catch (err: any) {
      onShowMessage(`Failed to delete all avatars: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Defaults
  const handleResetDefaults = async () => {
    try {
      setIsDeleting(true);
      await resetDefaultAnimeAvatars();
      await loadData(true);
      setShowResetConfirm(false);
      setSelectedIds(new Set());
      onShowMessage('Reset avatar library to standard defaults.');
    } catch (err: any) {
      onShowMessage(`Failed to reset defaults: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout currentTab="avatars" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-20">
        {/* Hidden File Inputs */}
        <input
          ref={bulkFilesRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleBulkFilesSelect}
        />

        {/* Page Header (1 Primary: Add avatar, Overflow Menu with bulk options) */}
        <AdminPageHeader
          title="Anime Profile Avatars"
          description={`${avatars.length} selectable profile pictures available for registered users`}
          primaryAction={{
            label: 'Add avatar',
            icon: Plus,
            onClick: () => setIsSingleModalOpen(true),
          }}
          secondaryActions={[
            {
              label: 'Bulk upload images',
              icon: Upload,
              onClick: () => bulkFilesRef.current?.click(),
            },
            {
              label: 'Add by URLs',
              icon: LinkIcon,
              onClick: () => setIsBulkUrlModalOpen(true),
            },
            {
              label: 'Reset to defaults',
              icon: RotateCcw,
              onClick: () => setShowResetConfirm(true),
            },
            {
              label: 'Delete all avatars',
              icon: Trash2,
              onClick: () => setShowDeleteAllConfirm(true),
            },
          ]}
        />

        {/* Google Drive Sync: Collapsed Card */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[#1E88FF]/15 border border-[#1E88FF]/25 text-[#1E88FF] flex items-center justify-center shrink-0">
                <FolderSync className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                    Google Drive Folder Sync
                  </h3>
                  <AdminStatusBadge status="live" label="Connected" />
                </div>
                <p className="text-xs text-[#94A3B8] truncate">
                  Folder: &quot;Zynox Official PFPs&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDriveDetails((prev) => !prev)}
                className="h-8 px-2.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Details</span>
                {showDriveDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                disabled={isSyncingDrive}
                onClick={handleStartDriveSync}
                className="h-8 px-3 rounded-[8px] bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin text-[#1E88FF]' : ''}`} />
                <span>{isSyncingDrive ? 'Syncing...' : 'Sync now'}</span>
              </button>
            </div>
          </div>

          {showDriveDetails && (
            <div className="pt-3 border-t border-white/5 space-y-2 text-xs text-[#94A3B8]">
              <div className="flex items-center justify-between">
                <span>Folder ID</span>
                <span className="font-mono text-white text-[11px] truncate max-w-xs">{DEFAULT_DRIVE_FOLDER_ID}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Connects directly to the shared Drive folder without quota bottlenecks. Auto-compresses web images into crisp square thumbnails.
              </p>
            </div>
          )}
        </div>

        {/* Avatars Grid (4 cols phone / 8 cols desktop) */}
        {loading ? (
          <div className="space-y-4">
            <AdminSkeleton variant="card" count={2} />
          </div>
        ) : avatars.length === 0 ? (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-8">
            <AdminEmptyState
              icon={Users}
              title="No avatars in library"
              description="Add single images, sync from Google Drive, or restore defaults."
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
            {avatars.map((av) => {
              const isSelected = selectedIds.has(av.id);
              return (
                <div
                  key={av.id}
                  onClick={() => toggleSelectAvatar(av.id)}
                  className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-[14px] bg-[#0B1324] hover:bg-[#101A30] border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#1E88FF] ring-2 ring-[#1E88FF] bg-[#1E88FF]/10'
                      : 'border-white/5 hover:border-white/15'
                  }`}
                  title={`${av.name} (Tap to select)`}
                >
                  {/* Selection Indicator Check Badge (20px top-right) */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-md z-10 animate-scaleIn">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  {/* 64px Circular Avatar with Fallback */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#050A14] border border-white/10 shrink-0">
                    <img
                      src={av.url}
                      alt={av.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>

                  {/* Name label */}
                  <span className="text-[11px] font-medium text-[#CBD5E1] truncate w-full text-center">
                    {av.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Selection Bar */}
        <AdminSelectionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              label: 'Delete',
              icon: Trash2,
              variant: 'danger',
              onClick: () => setShowBulkDeleteConfirm(true),
            },
          ]}
        />

        {/* Add Single Avatar Modal */}
        {isSingleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#0B1324] border border-white/15 rounded-[12px] p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Add New Avatar</h3>
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSingleAvatar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Character / Avatar Name
                  </label>
                  <input
                    type="text"
                    required
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="e.g. Gojo Satoru"
                    className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    placeholder="https://.../avatar.jpg"
                    className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div className="pt-1">
                  <span className="block text-xs text-[#94A3B8] mb-2">Or select local file to compress:</span>
                  <input
                    ref={singleFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSingleFileChange}
                    className="text-xs text-[#94A3B8] file:mr-3 file:py-1.5 file:px-3 file:rounded-[8px] file:border-0 file:bg-white/10 file:text-white file:text-xs file:cursor-pointer hover:file:bg-white/20"
                  />
                </div>

                {singleUrl && (
                  <div className="flex items-center gap-3 p-2.5 bg-[#050A14] border border-white/10 rounded-[8px]">
                    <img
                      src={singleUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0 text-xs">
                      <p className="text-white font-medium truncate">{singleName || 'Unnamed'}</p>
                      <p className="text-[11px] text-[#94A3B8] font-mono truncate">{singleUrl.slice(0, 40)}...</p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSingleModalOpen(false)}
                    className="h-9 px-3.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={singleSaving}
                    className="h-9 px-4 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {singleSaving ? 'Saving...' : 'Add Avatar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add by URLs Modal */}
        {isBulkUrlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#0B1324] border border-white/15 rounded-[12px] p-5 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Import Avatars by URLs</h3>
                <button
                  type="button"
                  onClick={() => setIsBulkUrlModalOpen(false)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white">
                  Paste Image URLs (One URL per line)
                </label>
                <textarea
                  rows={6}
                  value={bulkUrlsText}
                  onChange={(e) => setBulkUrlsText(e.target.value)}
                  placeholder="https://.../naruto.jpg&#10;https://.../sasuke.jpg&#10;https://.../luffy.jpg"
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] p-3 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBulkUrlModalOpen(false)}
                  className="h-9 px-3.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkSaving}
                  onClick={handleSaveBulkUrls}
                  className="h-9 px-4 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {bulkSaving ? 'Importing...' : 'Import URLs'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Review & Save Dialog */}
        {syncReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0B1324] border border-white/15 rounded-[12px] p-5 max-w-xl w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Review Synced Drive Avatars</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncReviewModalOpen(false)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#94A3B8]">
                Found {syncPreviewList.length} avatars in the Google Drive folder. Review the thumbnails below and click &quot;Save to Database&quot; to commit.
              </p>

              <div className="grid grid-cols-6 gap-2 max-h-56 overflow-y-auto p-2 bg-[#050A14] border border-white/10 rounded-[8px]">
                {syncPreviewList.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                    <span className="text-[10px] text-[#94A3B8] truncate w-full text-center">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSyncReviewModalOpen(false)}
                  className="h-9 px-3.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingSync}
                  onClick={handleConfirmSaveSync}
                  className="h-9 px-4 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {isSavingSync ? 'Saving...' : `Save ${syncPreviewList.length} Avatars`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirm Dialog */}
        <AdminConfirmDialog
          isOpen={showBulkDeleteConfirm}
          onClose={() => setShowBulkDeleteConfirm(false)}
          onConfirm={handleBulkDelete}
          title={`Delete ${selectedIds.size} selected avatars?`}
          consequence="These avatars will be removed from the selection catalog for registered members."
          confirmLabel="Delete Selected"
          isLoading={isDeleting}
        />

        {/* Delete All with Keyword DELETE */}
        <AdminConfirmDialog
          isOpen={showDeleteAllConfirm}
          onClose={() => setShowDeleteAllConfirm(false)}
          onConfirm={handleDeleteAll}
          title="Delete all avatars in catalog?"
          consequence="This will permanently empty the avatar library document collection."
          confirmLabel="Delete All Avatars"
          requireKeyword="DELETE"
          isDestructive={true}
          isLoading={isDeleting}
        />

        {/* Reset Defaults Confirm */}
        <AdminConfirmDialog
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={handleResetDefaults}
          title="Reset to default anime avatar library?"
          consequence="This replaces existing avatar documents with the official anime avatar default library."
          confirmLabel="Reset Defaults"
          isDestructive={false}
          isLoading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};
