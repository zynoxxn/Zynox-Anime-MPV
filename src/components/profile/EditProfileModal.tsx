import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, Sparkles, Camera } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { sanitizeString } from '../../lib/security';
import { DEFAULT_AVATAR } from '../../data/avatars';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAvatarPicker: () => void;
  onShowMessage: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAvatarPicker,
  onShowMessage,
}) => {
  const { user, userProfile } = useAuth();
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || user?.displayName || ''
  );
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(userProfile?.displayName || user?.displayName || '');
    setBio(userProfile?.bio || '');

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, userProfile?.displayName, userProfile?.bio, user?.displayName, saving, onClose]);

  if (!isOpen) return null;

  const currentAvatar = userProfile?.avatar || user?.photoURL || DEFAULT_AVATAR;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    const cleanName = sanitizeString(displayName).slice(0, 60);
    const cleanBio = sanitizeString(bio).slice(0, 280);
    if (!cleanName) {
      onShowMessage('Display name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: cleanName,
        bio: cleanBio,
      });
      if (userProfile) {
        userProfile.displayName = cleanName;
        userProfile.bio = cleanBio;
      }
      onShowMessage('Profile updated successfully!');
      onClose();
    } catch {
      onShowMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close edit profile modal"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center text-[#1E88FF] shrink-0">
            <Edit3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">Edit Profile</h3>
            <p className="text-xs text-[#94A3B8] truncate">
              Customize your display name, bio, and avatar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 bg-[#101A30] rounded-xl border border-white/10">
          <div className="relative group shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1E88FF] p-0.5 bg-[#050A14]">
              <img
                src={currentAvatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <button
              type="button"
              onClick={onOpenAvatarPicker}
              aria-label="Pick avatar"
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center text-white cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#1E88FF]" />
            </button>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-xs font-semibold text-white">Anime Avatar</div>
            <button
              type="button"
              onClick={onOpenAvatarPicker}
              className="text-xs text-[#1E88FF] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Change Anime Avatar</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. AnimeOtaku"
              className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-xs sm:text-sm text-white outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Bio / Quote
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about your favorite anime..."
              className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl p-3 text-xs sm:text-sm text-white outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
