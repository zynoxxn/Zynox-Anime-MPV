import React, { useEffect, useState, useRef } from 'react';
import type { Anime } from '../../types/anime';
import { getAllAnimes } from '../../lib/firestore/anime';
import { getOptimizedImageUrl, FALLBACK_ANIME_POSTER } from '../../lib/image-optimizer';
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
  Megaphone,
  ListPlus,
  Sparkles,
  Bell,
  Activity,
  Compass,
} from 'lucide-react';

interface AdminQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}

interface QuickAction {
  id: string;
  title: string;
  category: 'Dashboard' | 'Library' | 'Homepage' | 'Community' | 'Site' | 'System';
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  // Dashboard
  { id: 'act-dashboard', title: 'Dashboard Overview', category: 'Dashboard', path: '/admin', icon: Sliders },
  
  // Library
  { id: 'act-add-anime', title: 'New Anime Series', category: 'Library', path: '/admin/anime/new', icon: PlusCircle },
  { id: 'act-anime', title: 'Anime Library', category: 'Library', path: '/admin/anime', icon: Film },
  { id: 'act-episodes', title: 'Episodes Manager', category: 'Library', path: '/admin/episodes', icon: Tv },
  { id: 'act-bulk-episodes', title: 'Bulk Episodes Import', category: 'Library', path: '/admin/episodes/bulk', icon: ListPlus },
  { id: 'act-seasons', title: 'Seasons & Sequels', category: 'Library', path: '/admin/seasons', icon: Layers },
  { id: 'act-downloads', title: 'Downloads Manager', category: 'Library', path: '/admin/downloads', icon: Download },
  { id: 'act-schedule', title: 'Release Airing Schedule', category: 'Library', path: '/admin/schedule', icon: Calendar },
  { id: 'act-taxonomy', title: 'Categories & Taxonomy (Genres, Statuses, Years)', category: 'Library', path: '/admin/taxonomy', icon: Tag },

  // Homepage
  { id: 'act-homepage', title: 'Homepage Layout & Sections', category: 'Homepage', path: '/admin/homepage', icon: Sliders },
  { id: 'act-hero', title: 'Hero Carousel Banners', category: 'Homepage', path: '/admin/hero', icon: Sparkles },
  { id: 'act-notice', title: 'Popups & Notices', category: 'Homepage', path: '/admin/notice', icon: Megaphone },
  { id: 'act-announcements', title: 'Top Bar Announcements', category: 'Homepage', path: '/admin/announcements', icon: Bell },
  { id: 'act-avatars', title: 'Avatar Library', category: 'Homepage', path: '/admin/avatars', icon: Users },

  // Community
  { id: 'act-requests', title: 'Anime Requests', category: 'Community', path: '/admin/requests', icon: FileText },
  { id: 'act-reports', title: 'Reports & Flagged Comments', category: 'Community', path: '/admin/reports', icon: MessageSquare },
  { id: 'act-users', title: 'User Management & Roles', category: 'Community', path: '/admin/users', icon: Users },

  // Site
  { id: 'act-settings', title: 'Site Settings & Features', category: 'Site', path: '/admin/settings', icon: Settings },
  { id: 'act-navigation', title: 'Navigation & Footer Links', category: 'Site', path: '/admin/navigation', icon: Compass },
  { id: 'act-seo', title: 'SEO & Metadata', category: 'Site', path: '/admin/seo', icon: Globe },
  { id: 'act-legal', title: 'Legal & Policy Pages (DMCA, Privacy, Terms)', category: 'Site', path: '/admin/legal', icon: FileText },

  // System
  { id: 'act-logs', title: 'Activity Logs & Audit Trail', category: 'System', path: '/admin/logs', icon: Activity },
];

export const AdminQuickSearchModal: React.FC<AdminQuickSearchModalProps> = ({
  isOpen,
  onClose,
  navigate,
}) => {
  const [query, setQuery] = useState('');
  const [animes, setAnimes] = useState<Anime[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      getAllAnimes().then((list) => setAnimes(list)).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = (query || '').toLowerCase().trim();
  const filteredActions = ADMIN_QUICK_ACTIONS.filter((act) =>
    (act.title || '').toLowerCase().includes(q) ||
    (act.category || '').toLowerCase().includes(q)
  );

  const filteredAnimes = q
    ? (animes || []).filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.slug || '').toLowerCase().includes(q) ||
          (a.japaneseTitle || '').toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[#0B1324] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80dvh] animate-fadeIn">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#1E88FF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            name="admin_quick_search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search anime, episodes, CMS modules, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-[#94A3B8] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs font-mono transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Scrollable Results */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 max-h-[calc(80dvh-120px)] no-scrollbar">
          {/* Quick Actions List */}
          <div>
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-2 py-1">
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left bg-white/5 hover:bg-[#1E88FF]/15 hover:border-[#1E88FF]/30 border border-transparent transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1E88FF]/10 text-[#1E88FF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-[#1E88FF] truncate">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] truncate">{act.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anime Search Matches */}
          {filteredAnimes.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-2 py-1">
                Anime Results ({filteredAnimes.length})
              </div>
              <div className="space-y-1.5 mt-1">
                {filteredAnimes.map((a) => (
                  <div
                    key={a.id || a.slug}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={getOptimizedImageUrl(a.poster, { width: 80, fallbackType: 'poster' })}
                        alt={a.title}
                        className="w-9 h-12 object-cover rounded-lg shrink-0 border border-white/10"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== FALLBACK_ANIME_POSTER) {
                            target.src = FALLBACK_ANIME_POSTER;
                          }
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{a.title}</div>
                        <div className="text-[10px] text-[#94A3B8] truncate">
                          {a.status || 'ongoing'} • {a.year || 'N/A'} • {a.audioLanguage || 'Multi Audio'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelect(`/admin/anime/edit/${a.id || a.slug}`)}
                        className="px-2.5 py-1.5 bg-[#1E88FF] hover:bg-[#1873db] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(`/admin/anime/${a.id || a.slug}/episodes`)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
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

        {/* Footer Shortcut Helper */}
        <div className="p-3 bg-[#050A14] border-t border-white/5 flex items-center justify-between text-[11px] text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white text-[10px]">
              Ctrl + K
            </span>
            <span>Shortcut to toggle anywhere</span>
          </div>
          <span className="hidden sm:inline">ZYNOX No-Code Admin Console</span>
        </div>
      </div>
    </div>
  );
};
