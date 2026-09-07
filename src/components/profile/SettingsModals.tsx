import React, { useState } from 'react';
import { X, Bell, Shield, Check } from 'lucide-react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowMessage: (msg: string) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowMessage,
}) => {
  const [newEpisodes, setNewEpisodes] = useState(true);
  const [watchlistAlerts, setWatchlistAlerts] = useState(true);
  const [communityReplies, setCommunityReplies] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onShowMessage('Notification preferences updated!');
    onClose();
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
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Notification Settings</h3>
            <p className="text-xs text-[#94A3B8]">Manage what alerts you receive.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">New Episode Releases</div>
              <div className="text-[11px] text-[#94A3B8]">Get alerted when followed animes release episodes</div>
            </div>
            <input
              type="checkbox"
              checked={newEpisodes}
              onChange={(e) => setNewEpisodes(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">Watchlist Updates</div>
              <div className="text-[11px] text-[#94A3B8]">Notify me about changes to titles in my watchlist</div>
            </div>
            <input
              type="checkbox"
              checked={watchlistAlerts}
              onChange={(e) => setWatchlistAlerts(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">Community Discussion Replies</div>
              <div className="text-[11px] text-[#94A3B8]">When other otaku reply to your comments</div>
            </div>
            <input
              type="checkbox"
              checked={communityReplies}
              onChange={(e) => setCommunityReplies(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">Seasonal Anime Newsletter</div>
              <div className="text-[11px] text-[#94A3B8]">Weekly digest of top trending series and schedules</div>
            </div>
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold transition-all shadow-lg shadow-[#1683FF]/30 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
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

  if (!isOpen) return null;

  const handleSave = () => {
    onShowMessage('Privacy preferences saved!');
    onClose();
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Privacy Settings</h3>
            <p className="text-xs text-[#94A3B8]">Control your profile visibility to other viewers.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">Public Otaku Profile</div>
              <div className="text-[11px] text-[#94A3B8]">Allow others to view your profile link</div>
            </div>
            <input
              type="checkbox"
              checked={publicProfile}
              onChange={(e) => setPublicProfile(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">Share Watchlist Publicly</div>
              <div className="text-[11px] text-[#94A3B8]">Display your saved animes on your public profile</div>
            </div>
            <input
              type="checkbox"
              checked={showWatchlist}
              onChange={(e) => setShowWatchlist(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-[#030712] rounded-xl border border-white/5 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#F8FAFC]">Share Watch History</div>
              <div className="text-[11px] text-[#94A3B8]">Show recently watched episode badges publicly</div>
            </div>
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
              className="accent-[#1683FF] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#94A3B8] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold transition-all shadow-lg shadow-[#1683FF]/30 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
