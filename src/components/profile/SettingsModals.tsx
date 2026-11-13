import React, { useState, useEffect } from 'react';
import { X, Bell, Shield, Check } from 'lucide-react';
import { AdminToggle } from '../admin/AdminToggle';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowMessage: (msg: string) => void;
}

const NOTIF_STORAGE_KEY = 'zynox_notif_prefs';
const PRIVACY_STORAGE_KEY = 'zynox_privacy_prefs';

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowMessage,
}) => {
  const [newEpisodes, setNewEpisodes] = useState(true);
  const [watchlistAlerts, setWatchlistAlerts] = useState(true);
  const [communityReplies, setCommunityReplies] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.newEpisodes === 'boolean') setNewEpisodes(parsed.newEpisodes);
        if (typeof parsed.watchlistAlerts === 'boolean') setWatchlistAlerts(parsed.watchlistAlerts);
        if (typeof parsed.communityReplies === 'boolean') setCommunityReplies(parsed.communityReplies);
        if (typeof parsed.newsletter === 'boolean') setNewsletter(parsed.newsletter);
      }
    } catch {
      // ignore
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem(
        NOTIF_STORAGE_KEY,
        JSON.stringify({ newEpisodes, watchlistAlerts, communityReplies, newsletter })
      );
    } catch {
      // ignore
    }
    onShowMessage('Notification preferences updated!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification settings"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center text-[#1E88FF] shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">Notification Settings</h3>
            <p className="text-xs text-[#94A3B8] truncate">Manage what alerts you receive.</p>
          </div>
        </div>

        <div className="space-y-2 bg-[#101A30] border border-white/10 rounded-xl p-3.5 divide-y divide-white/5">
          <AdminToggle
            checked={newEpisodes}
            onChange={setNewEpisodes}
            label="New Episode Releases"
            description="Get alerted when followed anime release episodes"
          />
          <AdminToggle
            checked={watchlistAlerts}
            onChange={setWatchlistAlerts}
            label="Watchlist Updates"
            description="Notify about changes to titles in your watchlist"
          />
          <AdminToggle
            checked={communityReplies}
            onChange={setCommunityReplies}
            label="Community Replies"
            description="When other viewers reply to your comments"
          />
          <AdminToggle
            checked={newsletter}
            onChange={setNewsletter}
            label="Seasonal Digest"
            description="Weekly digest of trending series and schedules"
          />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowMessage: (msg: string) => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  onShowMessage,
}) => {
  const [publicProfile, setPublicProfile] = useState(true);
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.publicProfile === 'boolean') setPublicProfile(parsed.publicProfile);
        if (typeof parsed.showWatchlist === 'boolean') setShowWatchlist(parsed.showWatchlist);
        if (typeof parsed.showHistory === 'boolean') setShowHistory(parsed.showHistory);
      }
    } catch {
      // ignore
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem(
        PRIVACY_STORAGE_KEY,
        JSON.stringify({ publicProfile, showWatchlist, showHistory })
      );
    } catch {
      // ignore
    }
    onShowMessage('Privacy preferences saved!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close privacy settings"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center text-[#1E88FF] shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">Privacy Settings</h3>
            <p className="text-xs text-[#94A3B8] truncate">
              Control your profile visibility to other viewers.
            </p>
          </div>
        </div>

        <div className="space-y-2 bg-[#101A30] border border-white/10 rounded-xl p-3.5 divide-y divide-white/5">
          <AdminToggle
            checked={publicProfile}
            onChange={setPublicProfile}
            label="Public Profile"
            description="Allow others to view your profile page"
          />
          <AdminToggle
            checked={showWatchlist}
            onChange={setShowWatchlist}
            label="Share Watchlist Publicly"
            description="Display your saved anime on your public profile"
          />
          <AdminToggle
            checked={showHistory}
            onChange={setShowHistory}
            label="Share Watch History"
            description="Show recently watched activity publicly"
          />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
