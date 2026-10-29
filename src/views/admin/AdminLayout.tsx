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
  Megaphone,
  ListPlus,
  Compass,
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

  // Close mobile drawer on route change or ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Overview',
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      groupTitle: 'Anime & Content',
      items: [
        { id: 'anime', title: 'Anime Library', path: '/admin/anime', icon: Film },
        { id: 'episodes', title: 'Episodes', path: '/admin/episodes', icon: Tv },
        { id: 'bulk-episodes', title: 'Bulk Episodes', path: '/admin/episodes/bulk', icon: ListPlus },
        { id: 'downloads', title: 'Downloads', path: '/admin/downloads', icon: Download },
        { id: 'schedule', title: 'Schedule', path: '/admin/schedule', icon: Calendar },
      ],
    },
    {
      groupTitle: 'Display & Curation',
      items: [
        { id: 'notice', title: 'Site Pop-up Notice', path: '/admin/notice', icon: Megaphone },
        { id: 'hero', title: 'Hero Banners', path: '/admin/hero', icon: Sparkles },
        { id: 'announcements', title: 'Announcements', path: '/admin/announcements', icon: Bell },
      ],
    },
    {
      groupTitle: 'Community & Moderation',
      items: [
        { id: 'requests', title: 'Anime Requests', path: '/admin/requests', icon: FileText },
        { id: 'reports', title: 'Reports & Comments', path: '/admin/reports', icon: MessageSquare },
        { id: 'users', title: 'User Management', path: '/admin/users', icon: Users },
      ],
    },
    {
      groupTitle: 'System & SEO',
      items: [
        { id: 'settings', title: 'Site Settings', path: '/admin/settings', icon: Settings },
        { id: 'seo', title: 'SEO & Metadata', path: '/admin/seo', icon: Globe },
        { id: 'logs', title: 'Activity Logs', path: '/admin/logs', icon: Activity },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    onShowMessage('Logged out from admin panel.');
    navigate('/');
  };

  return (
    <div className="h-screen bg-[#050A14] text-white flex flex-col antialiased selection:bg-[#1683FF] selection:text-white overflow-hidden">
      {/* Top Bar - Single clean header */}
      <header className="shrink-0 z-40 bg-[#0B1322]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
          >
            <img
              src="/assets/aistudio/file_00000000d05c82118a47e15fb7b4a381_e8184cc9.png"
              alt="ZYNOX ANIME"
              className="w-9 h-9 rounded-xl object-contain shadow-md shadow-[#1683FF]/30 border border-white/10 group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="text-xs sm:text-sm font-black text-white tracking-wider flex items-center gap-1.5">
                ZYNOX <span className="hidden xs:inline text-[#1683FF] text-[10px] uppercase font-bold tracking-normal px-1.5 py-0.5 rounded bg-[#1683FF]/15 border border-[#1683FF]/30">Admin</span>
              </div>
              <div className="text-[10px] text-[#94A3B8]">Control Panel</div>
            </div>
          </div>
        </div>

        {/* Center Quick Search Trigger */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-[#050A14] border border-white/10 text-[#94A3B8] hover:text-white hover:border-[#1683FF]/50 text-xs transition-all w-48 md:w-64 lg:w-72 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-[#1683FF] shrink-0" />
            <span className="truncate">Search CMS & Anime...</span>
          </div>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white shrink-0">
            Ctrl + K
          </kbd>
        </button>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
            title="Search"
          >
            <Search className="w-4 h-4 text-[#1683FF]" />
          </button>

          {/* Quick Add Anime Button */}
          <button
            type="button"
            onClick={() => navigate('/admin/anime/new')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold shadow-md shadow-[#1683FF]/20 transition-all cursor-pointer"
            title="Add Anime"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Anime</span>
          </button>

          {/* Live Site */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs font-semibold border border-white/5 transition-colors"
            title="Go to Live Site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Live Site</span>
          </button>

          {/* Logout */}
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
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar (Desktop & Tablet / Laptop) */}
        <aside className="hidden md:flex w-60 lg:w-64 bg-[#080E1A] border-r border-white/10 flex-col justify-between overflow-y-auto p-3.5 lg:p-4 shrink-0">
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-2.5 py-1">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                          : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Admin User Footer */}
          <div className="mt-6 pt-3.5 border-t border-white/5 flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-[#1683FF]/20 text-[#1683FF] border border-[#1683FF]/40 flex items-center justify-center font-bold text-xs shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.email || 'Admin'}</div>
              <div className="text-[10px] text-[#94A3B8]">Administrator</div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer Content */}
            <div className="relative w-80 max-w-[85vw] bg-[#080E1A] border-r border-white/10 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#1683FF] flex items-center justify-center text-white font-black text-xs">
                      Z
                    </div>
                    <div>
                      <div className="text-xs font-black text-white tracking-wider">ZYNOX CMS</div>
                      <div className="text-[10px] text-[#94A3B8]">Admin Navigation</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-1">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-2 py-1">
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
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

              {/* Mobile Drawer Footer with User & Logout */}
              <div className="mt-8 pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-8 h-8 rounded-full bg-[#1683FF]/20 text-[#1683FF] border border-[#1683FF]/40 flex items-center justify-center font-bold text-xs shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{user?.email || 'Admin'}</div>
                    <div className="text-[10px] text-[#94A3B8]">Administrator</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#94A3B8] hover:text-white border border-white/5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Live Site</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 bg-[#050A14] pb-24 md:pb-8 min-h-0">
          {children}
        </main>
      </div>

      {/* Mobile Quick Navigation Bottom Bar (Screens < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080E1A]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            currentTab === 'dashboard'
              ? 'text-[#1683FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/anime')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            currentTab === 'anime'
              ? 'text-[#1683FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-bold">Anime</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/episodes')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            currentTab === 'episodes'
              ? 'text-[#1683FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] font-bold">Episodes</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/downloads')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            currentTab === 'downloads'
              ? 'text-[#1683FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px] font-bold">Downloads</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[#94A3B8] hover:text-white transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>

      {/* Global Quick Search Modal */}
      <AdminQuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigate={navigate}
      />
    </div>
  );
};

