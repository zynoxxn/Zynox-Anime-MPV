import React, { useState } from 'react';
import { X, User, Edit3, Loader2, Sparkles, Camera } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
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
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const currentAvatar = userProfile?.avatar || user?.photoURL || DEFAULT_AVATAR;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      if (userProfile) {
        userProfile.displayName = displayName.trim();
        userProfile.bio = bio.trim();
      }
      onShowMessage('Profile updated successfully!');
      onClose();
    } catch (err: any) {
      onShowMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#081426] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1683FF]/20 border border-[#1683FF]/40 flex items-center justify-center text-[#00CFFF]">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Edit Profile</h3>
            <p className="text-xs text-[#94A3B8]">Customize your display name, bio and avatar.</p>
          </div>
        </div>

        {/* Avatar Preview & Change */}
        <div className="flex items-center gap-4 p-3 bg-[#030712] rounded-xl border border-white/5">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#1683FF] p-0.5 bg-[#050A14]">
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
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center text-white"
            >
              <Camera className="w-4 h-4 text-[#00CFFF]" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#F8FAFC]">Anime Avatar</div>
            <button
              type="button"
              onClick={onOpenAvatarPicker}
              className="text-xs text-[#00CFFF] hover:underline font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Change Anime Avatar</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">Bio / Quote</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Anime lover and manga enthusiast. Watching anime is my passion!"
              className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl p-3 text-xs text-[#F8FAFC] outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold transition-all shadow-lg shadow-[#1683FF]/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
