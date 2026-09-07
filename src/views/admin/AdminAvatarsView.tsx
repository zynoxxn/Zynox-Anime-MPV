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
} from '../../lib/firestore/avatars';
import { compressAvatarImage } from '../../lib/image-compress';
import {
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  Copy,
  Layers,
  Image as ImageIcon,
  CheckSquare,
  Square,
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

  // Selection for Bulk Delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal: Single Upload / Add
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [singleUrl, setSingleUrl] = useState('');
  const [singleSaving, setSingleSaving] = useState(false);

  // Modal: Bulk Upload
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkFilesCount, setBulkFilesCount] = useState(0);

  // Modal: Single Delete Confirmation (in-app modal replacing blocked window.confirm)
  const [avatarToDelete, setAvatarToDelete] = useState<AnimeAvatar | null>(null);
  const [deletingSingle, setDeletingSingle] = useState(false);

  // Modal: Bulk Delete Confirmation
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Reset Confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // File input refs
  const singleFileRef = useRef<HTMLInputElement>(null);
  const bulkFilesRef = useRef<HTMLInputElement>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const list = await getAnimeAvatars(forceRefresh);
      setAvatars(list);
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to load avatars list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Single Upload Handlers ---
  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowMessage('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    try {
      const compressed = await compressAvatarImage(file, 256, 0.82);
      if (compressed) {
        setSingleUrl(compressed);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setSingleUrl(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) {
      onShowMessage('Please select an image file or enter an image URL.');
      return;
    }

    setSingleSaving(true);
    try {
      await saveAnimeAvatar({ url: singleUrl.trim() });
      await loadData(true);
      setIsSingleModalOpen(false);
      setSingleUrl('');
      onShowMessage('Avatar added successfully!');
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to save avatar.');
    } finally {
      setSingleSaving(false);
    }
  };

  // --- Bulk Upload Handlers ---
  const handleBulkFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBulkSaving(true);
    setBulkFilesCount(files.length);

    try {
      const readPromises: Promise<string>[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          readPromises.push(compressAvatarImage(file, 256, 0.82));
        }
      }

      const results = await Promise.all(readPromises);
      const validDataUrls = results.filter((u) => u.length > 0);

      if (validDataUrls.length > 0) {
        await saveBulkAnimeAvatars(validDataUrls);
        await loadData(true);
        onShowMessage(`Successfully imported ${validDataUrls.length} avatars!`);
      } else {
        onShowMessage('No valid image files found.');
      }
    } catch (err) {
      console.error(err);
      onShowMessage('Error during bulk file import.');
    } finally {
      setBulkSaving(false);
      setBulkFilesCount(0);
      if (bulkFilesRef.current) bulkFilesRef.current.value = '';
    }
  };

  const handleSaveBulkUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUrlsText.trim()) {
      onShowMessage('Please enter at least one image URL.');
      return;
    }

    const lines = bulkUrlsText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http') || l.startsWith('data:image'));

    if (lines.length === 0) {
      onShowMessage('No valid image URLs found. Please enter URLs starting with http:// or https://');
      return;
    }

    setBulkSaving(true);
    try {
      await saveBulkAnimeAvatars(lines);
      await loadData(true);
      setIsBulkModalOpen(false);
      setBulkUrlsText('');
      onShowMessage(`Successfully imported ${lines.length} avatars!`);
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to save bulk avatars.');
    } finally {
      setBulkSaving(false);
    }
  };

  // --- Single Delete Confirmation Execution ---
  const handleConfirmDeleteSingle = async () => {
    if (!avatarToDelete) return;
    setDeletingSingle(true);
    try {
      await deleteAnimeAvatar(avatarToDelete.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(avatarToDelete.id);
        return next;
      });
      await loadData(true);
      setAvatarToDelete(null);
      onShowMessage('Avatar deleted successfully.');
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to delete avatar.');
    } finally {
      setDeletingSingle(false);
    }
  };

  // --- Bulk Delete Confirmation Execution ---
  const handleConfirmDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeletingBulk(true);
    try {
      const idsToDelete = Array.from(selectedIds) as string[];
      await deleteBulkAnimeAvatars(idsToDelete);
      setSelectedIds(new Set());
      await loadData(true);
      setIsBulkDeleteModalOpen(false);
      onShowMessage(`${idsToDelete.length} avatars deleted successfully.`);
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to delete selected avatars.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === avatars.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(avatars.map((a) => a.id)));
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    try {
      await resetDefaultAnimeAvatars();
      await loadData(true);
      setSelectedIds(new Set());
      setIsResetConfirmOpen(false);
      onShowMessage('All avatars have been cleared.');
    } catch (err) {
      console.error(err);
      onShowMessage('Failed to clear avatars.');
    } finally {
      setResetting(false);
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onShowMessage('Avatar URL copied!');
  };

  return (
    <AdminLayout
      currentTab="avatars"
      navigate={navigate}
      onShowMessage={onShowMessage}
    >
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/10 p-5 sm:p-6 rounded-3xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Avatars
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Manage the avatars collection that users can pick from across the app
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Hidden Bulk File Input */}
            <input
              type="file"
              ref={bulkFilesRef}
              multiple
              accept="image/*"
              onChange={handleBulkFilesSelected}
              className="hidden"
            />

            {/* Reset */}
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset default avatars"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Reset Defaults</span>
            </button>

            {/* Bulk Upload Files Button */}
            <button
              type="button"
              onClick={() => bulkFilesRef.current?.click()}
              disabled={bulkSaving}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-[#1683FF]/20 text-[#CBD5E1] hover:text-[#00CFFF] border border-white/10 hover:border-[#1683FF]/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#00CFFF]" />
              <span>{bulkSaving ? `Importing ${bulkFilesCount}...` : 'Bulk Upload Files'}</span>
            </button>

            {/* Bulk URLs Importer Button */}
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#1683FF]" />
              <span>Bulk URLs</span>
            </button>

            {/* Add Single Avatar */}
            <button
              type="button"
              onClick={() => {
                setSingleUrl('');
                setIsSingleModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Avatar</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Stats & Selection control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1322] border border-white/10 px-5 py-3.5 rounded-2xl">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-white">
              Total: <span className="text-[#00CFFF] font-black text-sm">{avatars.length}</span> Avatars
            </span>
            
            {avatars.length > 0 && (
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-semibold text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {selectedIds.size === avatars.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#1683FF]" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>{selectedIds.size === avatars.length ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
          </div>

          {avatars.length > 0 && (
            <div className="flex items-center gap-2 animate-fadeIn">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs font-medium text-[#CBD5E1]">
                    {selectedIds.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedIds.size})</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Delete all avatars"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All</span>
              </button>
            </div>
          )}
        </div>

        {/* Avatars Grid - Pure Avatars, No extra text */}
        {loading ? (
          <div className="text-center py-20 text-[#94A3B8]">
            <div className="w-8 h-8 border-2 border-[#1683FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading avatars...</p>
          </div>
        ) : avatars.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/10 rounded-3xl p-12 text-center text-[#94A3B8]">
            <ImageIcon className="w-12 h-12 text-[#64748B] mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-bold text-white">No avatars found</h3>
            <p className="text-xs text-[#64748B] mt-1">Upload images or import bulk URLs above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-5">
            {avatars.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`group relative bg-[#07111F] border rounded-2xl p-2.5 transition-all duration-200 flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-[#00CFFF] ring-2 ring-[#00CFFF]/40 shadow-lg shadow-[#00CFFF]/20'
                      : 'border-white/10 hover:border-[#1683FF]/50 hover:bg-[#0A1830]'
                  }`}
                >
                  {/* Selection Checkbox on top-left */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className="absolute top-2 left-2 z-10 w-5 h-5 rounded-md bg-black/70 border border-white/30 flex items-center justify-center text-white transition-opacity group-hover:opacity-100 cursor-pointer"
                    style={{ opacity: isSelected ? 1 : undefined }}
                    title={isSelected ? 'Deselect' : 'Select'}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-[#00CFFF] stroke-[3]" />
                    ) : null}
                  </button>

                  {/* Circular Avatar Image */}
                  <div
                    onClick={() => toggleSelect(item.id)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#1683FF] shadow-md bg-[#02060D] transition-transform duration-200 group-hover:scale-105 cursor-pointer mt-1"
                  >
                    <img
                      src={item.url}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>

                  {/* Action Icons at bottom */}
                  <div className="mt-3 flex items-center justify-center gap-1.5 w-full pt-1.5 border-t border-white/5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(item.url, item.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Dedicated Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatarToDelete(item);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                      title="Delete Avatar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Single Avatar Delete Confirmation */}
        {avatarToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-sm bg-[#081426] border border-rose-500/30 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Avatar</h3>
                  <p className="text-xs text-[#94A3B8]">This avatar will be permanently removed.</p>
                </div>
              </div>

              {/* Preview of Avatar to delete */}
              <div className="flex items-center justify-center py-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-rose-500/40 shadow-lg shadow-rose-500/20 bg-[#02060D]">
                  <img
                    src={avatarToDelete.url}
                    alt="Delete target"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAvatarToDelete(null)}
                  disabled={deletingSingle}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingle}
                  disabled={deletingSingle}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-lg shadow-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {deletingSingle ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Bulk Delete Confirmation */}
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-sm bg-[#081426] border border-rose-500/30 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Selected Avatars</h3>
                  <p className="text-xs text-[#94A3B8]">
                    Are you sure you want to delete {selectedIds.size} avatars?
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                These {selectedIds.size} avatars will be permanently removed from the catalog.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={deletingBulk}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSelected}
                  disabled={deletingBulk}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-lg shadow-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {deletingBulk ? 'Deleting...' : `Delete ${selectedIds.size} Avatars`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Single Avatar Upload / URL */}
        {isSingleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-md bg-[#081426] border border-white/15 rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#050A14]">
                <h2 className="text-base font-bold text-white">Add Avatar</h2>
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="p-1 text-[#94A3B8] hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSingle} className="p-5 sm:p-6 space-y-4">
                {/* Live Circular Preview */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#1683FF] shadow-lg shadow-[#1683FF]/30 bg-[#050A14]">
                    <img
                      src={singleUrl.trim() || DEFAULT_AVATAR}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                </div>

                {/* Upload File Option */}
                <input
                  type="file"
                  ref={singleFileRef}
                  onChange={handleSingleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => singleFileRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-[#1683FF]/20 text-[#CBD5E1] hover:text-[#00CFFF] border border-white/10 hover:border-[#1683FF]/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#00CFFF]" />
                  <span>Choose Image File from Device</span>
                </button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">or paste URL</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Direct Image URL */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD5E1]">
                    Image Direct URL
                  </label>
                  <input
                    type="url"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or any image link"
                    className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsSingleModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={singleSaving || !singleUrl.trim()}
                    className="px-5 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {singleSaving ? 'Saving...' : 'Add Avatar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bulk URLs Importer */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-lg bg-[#081426] border border-white/15 rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#050A14]">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-[#1683FF]" />
                  <h2 className="text-base font-bold text-white">Bulk Avatars Import (URLs)</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="p-1 text-[#94A3B8] hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBulkUrls} className="p-5 sm:p-6 space-y-4">
                <p className="text-xs text-[#94A3B8]">
                  Paste multiple image URLs below, separated by line breaks or commas. All URLs will be imported simultaneously into the avatar catalog.
                </p>

                <textarea
                  rows={8}
                  value={bulkUrlsText}
                  onChange={(e) => setBulkUrlsText(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2...&#10;https://images.unsplash.com/photo-3..."
                  className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-2xl p-3 text-xs text-white placeholder-[#64748B] outline-none font-mono"
                />

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-[#64748B]">
                    {bulkUrlsText.split(/[\n,]+/).filter((l) => l.trim().length > 0).length} URLs entered
                  </span>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkSaving || !bulkUrlsText.trim()}
                      className="px-5 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {bulkSaving ? 'Importing...' : 'Import All URLs'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset / Delete All Confirmation Modal */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-md bg-[#081426] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-white">Delete All Avatars?</h3>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                This will permanently delete all avatars from Firestore. You can upload or import new avatar images anytime.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={resetting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resetting ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
