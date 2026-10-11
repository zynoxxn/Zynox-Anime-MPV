import React, { useEffect, useState, useRef } from 'react';
import type { Anime } from '../../types/anime';
import { getAllAnimes } from '../../lib/firestore/anime';
import {
  Search,
  Film,
  Download,
  Calendar,
  Layers,
  Sliders,
  Tag,
  MessageSquare,
  FileText,
  Users,
  Settings,
  Globe,
  PlusCircle,
  Tv,
  X,
  ExternalLink,
  Command,
  Megaphone,
  ListPlus,
  Sparkles,
  Bell,
  Activity,
} from 'lucide-react';

interface AdminQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}

interface QuickAction {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: any;
}

const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { id: 'act-dashboard', title: 'Dashboard Analytics', category: 'Overview', path: '/admin', icon: Sliders },
  { id: 'act-add-anime', title: 'Add New Anime Series', category: 'Anime & Content', path: '/admin/anime/new', icon: PlusCircle },
  { id: 'act-manage-anime', title: 'Anime Library (Browse & Edit)', category: 'Anime & Content', path: '/admin/anime', icon: Film },
  { id: 'act-manage-episodes', title: 'Episodes Manager', category: 'Anime & Content', path: '/admin/episodes', icon: Tv },
  { id: 'act-bulk-episodes', title: 'Bulk Add Episodes (Fast Import)', category: 'Anime & Content', path: '/admin/episodes/bulk', icon: ListPlus },
  { id: 'act-downloads', title: 'Downloads Manager (Zip & Episodes)', category: 'Anime & Content', path: '/admin/downloads', icon: Download },
  { id: 'act-schedule', title: 'Release Schedule', category: 'Anime & Content', path: '/admin/schedule', icon: Calendar },
  { id: 'act-notice', title: 'Site Pop-Up Notice (1:1 Pop-Up)', category: 'Display & Curation', path: '/admin/notice', icon: Megaphone },
  { id: 'act-hero-banners', title: 'Hero Carousel Banners', category: 'Display & Curation', path: '/admin/hero', icon: Sparkles },
  { id: 'act-announcements', title: 'Announcements', category: 'Display & Curation', path: '/admin/announcements', icon: Bell },
  { id: 'act-requests', title: 'User Anime Requests', category: 'Community & Moderation', path: '/admin/requests', icon: FileText },
  { id: 'act-reports', title: 'Reports & Comments Moderation', category: 'Community & Moderation', path: '/admin/reports', icon: MessageSquare },
  { id: 'act-users', title: 'User Accounts & Roles', category: 'Community & Moderation', path: '/admin/users', icon: Users },
  { id: 'act-settings', title: 'Site General Settings', category: 'System & SEO', path: '/admin/settings', icon: Settings },
  { id: 'act-seo', title: 'SEO & Meta Tags', category: 'System & SEO', path: '/admin/seo', icon: Globe },
  { id: 'act-logs', title: 'Activity Logs', category: 'System & SEO', path: '/admin/logs', icon: Activity },
];

export const AdminQuickSearchModal: React.FC<AdminQuickSearchModalProps> = ({
  isOpen,
  onClose,
  navigate,
}) => {
  const [query, setQuery] = useState('');
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      getAllAnimes().then((list) => setAnimes(list)).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter actions and animes
  const q = (query || '').toLowerCase();
  const filteredActions = ADMIN_QUICK_ACTIONS.filter((act) =>
    (act.title || '').toLowerCase().includes(q) ||
    (act.category || '').toLowerCase().includes(q)
  );

  const filteredAnimes = query.trim()
    ? (animes || []).filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.slug || '').toLowerCase().includes(q) ||
          (a.japaneseTitle || '').toLowerCase().includes(q)
      ).slice(0, 8)
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0B1322] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#1683FF]" />
          <input
            ref={inputRef}
            type="text"
            name="admin_quick_search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Search anime, episodes, CMS sections, settings (or press ESC to close)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-[#94A3B8] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 max-h-[60vh]">
          {/* Quick Actions */}
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-3 py-1">
              Admin CMS Modules ({filteredActions.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
              {filteredActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleSelect(act.path)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left bg-white/5 hover:bg-[#1683FF]/20 hover:border-[#1683FF]/40 border border-transparent transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1683FF]/10 text-[#1683FF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-[#1683FF] truncate">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] truncate">{act.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Anime Matches */}
          {filteredAnimes.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-3 py-1">
                Direct Anime Results ({filteredAnimes.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredAnimes.map((a) => (
                  <div
                    key={a.id || a.slug}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={a.poster}
                        alt={a.title}
                        className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{a.title}</div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {a.status} • {a.year || 'N/A'} • {a.audioLanguage || 'Multi'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelect(`/admin/anime/edit/${a.id || a.slug}`)}
                        className="px-3 py-1 bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Edit Anime
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(`/admin/anime/${a.id || a.slug}/episodes`)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Episodes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="p-3 bg-[#050A14] border-t border-white/5 flex items-center justify-between text-[11px] text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white text-[10px]">
              Ctrl + K
            </span>
            <span>Toggle anywhere</span>
          </div>
          <span>ZYNOX Admin CMS Quick Navigator</span>
        </div>
      </div>
    </div>
  );
};
