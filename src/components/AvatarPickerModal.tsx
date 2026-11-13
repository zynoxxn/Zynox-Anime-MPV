import React, { useState, useEffect, useRef } from 'react';
import { AnimeAvatar, DEFAULT_AVATAR } from '../data/avatars';
import { getAnimeAvatars } from '../lib/firestore/avatars';
import { compressAvatarImage } from '../lib/image-compress';
import { isValidSafeUrl } from '../lib/security';
import {
  X,
  Check,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string;
  onSelectAvatar: (avatarUrl: string) => void;
  isAdmin?: boolean;
  onNavigateAdmin?: (path: string) => void;
}

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onSelectAvatar,
  isAdmin = false,
  onNavigateAdmin,
}) => {
  const [avatarsList, setAvatarsList] = useState<AnimeAvatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string>(currentAvatar || DEFAULT_AVATAR);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setUploadError(null);

    getAnimeAvatars(true)
      .then((items) => {
        if (isMounted) {
          setAvatarsList(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    if (currentAvatar) {
      setSelectedUrl(currentAvatar);
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, currentAvatar, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
      setUploadError('Only PNG, JPG, WEBP, or GIF images are supported.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Image exceeds maximum file size of 5 MB.');
      return;
    }
    setUploadError(null);

    try {
      const compressedUrl = await compressAvatarImage(file, 256, 0.82);
      if (compressedUrl) {
        setSelectedUrl(compressedUrl);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setSelectedUrl(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = urlInput.trim();
    if (!clean) return;
    if (!isValidSafeUrl(clean) || (!clean.startsWith('https://') && !clean.startsWith('http://'))) {
      setUploadError('Please enter a valid http:// or https:// image URL.');
      return;
    }
    setUploadError(null);
    setSelectedUrl(clean);
    setShowUrlInput(false);
    setUrlInput('');
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelectAvatar(selectedUrl);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0B1324] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#101A30]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#1E88FF] shrink-0 bg-[#050A14]">
              <img
                src={selectedUrl || DEFAULT_AVATAR}
                alt="Selected Avatar"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              Choose Avatar
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close avatar picker"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin Quick Upload / URL */}
        {isAdmin && (
          <>
            <div className="px-5 py-3 border-b border-white/10 bg-[#050A14] flex items-center justify-between gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-[#1E88FF]" />
                <span>Upload Image</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={`flex-1 h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  showUrlInput
                    ? 'bg-[#1E88FF] text-white border-[#1E88FF]'
                    : 'bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white border-white/10'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Paste URL</span>
              </button>
            </div>

            {uploadError && (
              <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 font-medium">
                {uploadError}
              </div>
            )}

            {showUrlInput && (
              <form
                onSubmit={handleApplyUrl}
                className="px-5 py-3 bg-[#101A30] border-b border-white/10 flex items-center gap-2"
              >
                <input
                  type="url"
                  autoFocus
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste image link (https://...)"
                  className="flex-1 h-9 bg-[#050A14] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-xs text-white placeholder-[#64748B] outline-none min-w-0"
                />
                <button
                  type="submit"
                  className="h-9 px-3.5 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Set
                </button>
              </form>
            )}
          </>
        )}

        {/* Avatars Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[380px] sm:max-h-[440px] flex-1 bg-[#050A14]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#94A3B8]">
              <div className="w-6 h-6 border-2 border-[#1E88FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : avatarsList.length === 0 ? (
            <div className="py-12 text-center text-[#94A3B8] text-xs">
              <ImageIcon className="w-8 h-8 text-[#64748B] mx-auto mb-2 opacity-50" />
              <span>No preset avatars available.</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4">
              {avatarsList.map((avatar) => {
                const isSelected = selectedUrl === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedUrl(avatar.url)}
                    className="group relative aspect-square rounded-full p-0.5 transition-transform duration-200 cursor-pointer focus:outline-none"
                    style={{
                      transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                    }}
                  >
                    <div
                      className={`w-full h-full rounded-full overflow-hidden border-2 bg-[#0B1324] transition-colors ${
                        isSelected
                          ? 'border-[#1E88FF] ring-2 ring-[#1E88FF]/40'
                          : 'border-white/10 group-hover:border-white/40'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name || 'Avatar'}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>

                    {isSelected && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#1E88FF] border-2 border-[#0B1324] text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#101A30] flex items-center justify-between gap-3">
          {isAdmin && onNavigateAdmin ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateAdmin('/admin/avatars');
              }}
              className="text-xs font-semibold text-[#94A3B8] hover:text-[#1E88FF] transition-colors cursor-pointer"
            >
              Manage in Admin
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-9 px-5 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
