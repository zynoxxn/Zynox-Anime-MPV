import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminQuickSearchModal } from './AdminQuickSearchModal';
import {
  LayoutDashboard,
  Film,
  Tv,
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
  HelpCircle,
  LogOut,
  Search,
  ExternalLink,
  Menu,
  X,
  Shield,
  Activity,
  PlusCircle,
  Bell,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AdminLayoutProps {
  currentTab: string;
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  navigate,
  onShowMessage,
  children,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Overview',
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      groupTitle: 'Catalog',
      items: [
        { id: 'anime', title: 'Anime', path: '/admin/anime', icon: Film },
        { id: 'episodes', title: 'Episodes', path: '/admin/episodes', icon: Tv },
        { id: 'downloads', title: 'Add Downloads', path: '/admin/downloads', icon: Download },
        { id: 'schedule', title: 'Schedule', path: '/admin/schedule', icon: Calendar },
        { id: 'seasons', title: 'Seasons', path: '/admin/seasons', icon: Calendar },
        { id: 'taxonomy', title: 'Genres & Studios', path: '/admin/taxonomy', icon: Tag },
      ],
    },
    {
      groupTitle: 'Appearance & CMS',
      items: [
        { id: 'homepage', title: 'Homepage Sections', path: '/admin/homepage', icon: Sliders },
        { id: 'hero-banners', title: 'Hero Banners', path: '/admin/hero-banners', icon: Layers },
        { id: 'navigation-footer', title: 'Nav & Footer', path: '/admin/navigation-footer', icon: Sliders },
        { id: 'announcements', title: 'Announcements', path: '/admin/announcements', icon: Bell },
        { id: 'avatars', title: 'Avatars', path: '/admin/avatars', icon: Sparkles },
      ],
    },
    {
      groupTitle: 'Community',
      items: [
        { id: 'comments', title: 'Comments', path: '/admin/comments', icon: MessageSquare },
        { id: 'requests', title: 'Requests', path: '/admin/requests', icon: FileText },
        { id: 'reports', title: 'Reports', path: '/admin/reports', icon: HelpCircle },
      ],
    },
    {
      groupTitle: 'Settings & System',
      items: [
        { id: 'settings', title: 'Settings', path: '/admin/settings', icon: Settings },
        { id: 'users', title: 'Users', path: '/admin/users', icon: Users },
        { id: 'seo', title: 'SEO', path: '/admin/seo', icon: Globe },
        { id: 'legal-pages', title: 'Legal Pages', path: '/admin/legal-pages', icon: FileText },
        { id: 'logs', title: 'Audit Logs', path: '/admin/logs', icon: Activity },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    onShowMessage('Logged out from admin panel.');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0B1322]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1683FF] flex items-center justify-center text-white shadow-lg shadow-[#1683FF]/30 font-black text-sm">
              Z
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-wider flex items-center gap-1.5">
                <span>ZYNOX</span>
                <span className="text-[10px] bg-[#1683FF]/20 text-[#1683FF] border border-[#1683FF]/30 px-1.5 py-0.2 rounded font-bold">
                  CMS v2.0
                </span>
              </div>
              <div className="text-[10px] text-[#94A3B8]">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Center Quick Search Trigger */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#050A14] border border-white/10 text-[#94A3B8] hover:text-white hover:border-[#1683FF]/50 text-xs transition-all w-72 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#1683FF]" />
            <span>Search anything in CMS...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">
            Ctrl + K
          </kbd>
        </button>

        {/* Right Tools */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/admin/anime/new')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold shadow-md shadow-[#1683FF]/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Anime</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs font-semibold border border-white/5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Site</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-[#94A3B8] transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:flex w-64 bg-[#080E1A] border-r border-white/10 flex-col justify-between overflow-y-auto p-4 shrink-0">
          <div className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-3 py-1">
                  {group.groupTitle}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                          : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Admin User Footer Badge */}
          <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-[#1683FF]/20 text-[#1683FF] border border-[#1683FF]/40 flex items-center justify-center font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.email}</div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Super Admin Active
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-[#080E1A] border-r border-white/10 p-4 flex flex-col justify-between overflow-y-auto z-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="text-sm font-black text-white">ZYNOX CMS NAVIGATION</div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-[#94A3B8] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-1">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-3 py-1">
                      {group.groupTitle}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            navigate(item.path);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                              : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#050A14]">
          {children}
        </main>
      </div>

      {/* Global Quick Search Modal */}
      <AdminQuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigate={navigate}
      />
    </div>
  );
};
