import React, { useState, useEffect, useRef } from 'react';
import { AnimeAvatar, DEFAULT_AVATAR } from '../data/avatars';
import { getAnimeAvatars } from '../lib/firestore/avatars';
import { compressAvatarImage } from '../lib/image-compress';
import {
  X,
  Check,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string;
  onSelectAvatar: (avatarUrl: string) => void;
  isAdmin?: boolean;
  onNavigateAdmin?: (path: string) => void;
}

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
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load avatars list
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

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

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  // Handle local file upload (compresses to lightweight thumbnail)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

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

  // Handle custom URL input apply
  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSelectedUrl(urlInput.trim());
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg bg-[#07111F] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Simple Title: Avatar */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#040A14]">
          <div className="flex items-center gap-3">
            {/* Current Active Preview */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#1683FF] shadow-lg shadow-[#1683FF]/30 shrink-0 bg-[#02060D]">
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
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                Avatar
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Upload / Paste URL Action Bar - Only visible to Admins */}
        {isAdmin && (
          <>
            <div className="px-5 py-3 border-b border-white/5 bg-[#050D1A] flex items-center justify-between gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-[#1683FF]/20 text-[#CBD5E1] hover:text-[#00CFFF] border border-white/10 hover:border-[#1683FF]/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#00CFFF]" />
                <span>Upload Image</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showUrlInput
                    ? 'bg-[#1683FF] text-white border-[#1683FF]'
                    : 'bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white border-white/10'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-[#00CFFF]" />
                <span>Paste URL</span>
              </button>
            </div>

            {/* Optional URL Input Popover */}
            {showUrlInput && (
              <form
                onSubmit={handleApplyUrl}
                className="px-5 py-3 bg-[#030812] border-b border-white/10 flex items-center gap-2 animate-fadeIn"
              >
                <input
                  type="url"
                  autoFocus
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste direct image link (https://...)"
                  className="flex-1 bg-[#07111F] border border-white/15 focus:border-[#1683FF] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-[#64748B] outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Set
                </button>
              </form>
            )}
          </>
        )}

        {/* Avatars Grid - Pure circular avatars */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[380px] sm:max-h-[440px] custom-scrollbar flex-1 bg-[#050D1A]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#94A3B8]">
              <div className="w-6 h-6 border-2 border-[#1683FF] border-t-transparent rounded-full animate-spin" />
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
                    className="group relative aspect-square rounded-full p-0.5 transition-all duration-200 cursor-pointer focus:outline-none"
                    style={{
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    {/* Ring Container */}
                    <div
                      className={`w-full h-full rounded-full overflow-hidden border-2 bg-[#02060D] transition-all duration-200 ${
                        isSelected
                          ? 'border-[#00CFFF] shadow-lg shadow-[#00CFFF]/40 ring-2 ring-[#1683FF]/60'
                          : 'border-white/10 group-hover:border-white/40 group-hover:scale-105'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>

                    {/* Selected Badge Checkmark */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#1683FF] border-2 border-[#07111F] text-white flex items-center justify-center shadow-md animate-scaleUp">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Simple Action & Admin Link */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#040A14] flex items-center justify-between gap-3">
          {isAdmin && onNavigateAdmin ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateAdmin('/admin/avatars');
              }}
              className="text-[11px] font-semibold text-[#64748B] hover:text-[#00CFFF] transition-colors"
            >
              Manage in Admin
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#CBD5E1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-xs font-bold text-white shadow-lg shadow-[#1683FF]/30 transition-all hover:scale-105 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
