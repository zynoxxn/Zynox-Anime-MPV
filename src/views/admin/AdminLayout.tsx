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
  Lock,
  Mail,
  AlertTriangle,
  RefreshCw,
  Clock,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import {
  checkBruteForceLockout,
  recordFailedAuthAttempt,
  resetAuthAttempts,
  logSecurityThreat,
  INACTIVITY_TIMEOUT_MS,
  BruteForceStatus,
} from '../../lib/security';

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
  const { user, isAdmin, loading, logout, signIn } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSuperAdmin = Boolean(
    isAdmin || (user?.email && user.email.toLowerCase().trim() === 'zairoxmax2.0@gmail.com')
  );

  const [adminEmail, setAdminEmail] = useState('zairoxmax2.0@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [lockoutStatus, setLockoutStatus] = useState<BruteForceStatus>(checkBruteForceLockout());
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // Sync lockout countdown
  useEffect(() => {
    const status = checkBruteForceLockout();
    setLockoutStatus(status);
    if (status.isLocked) {
      setCountdownSeconds(Math.ceil(status.remainingMs / 1000));
    }
  }, []);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLockoutStatus(checkBruteForceLockout());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  // Session Inactivity Auto-Lock for authenticated admins
  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    let timeoutId: any;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logSecurityThreat('ADMIN_INACTIVITY_LOCK', {
          userEmail: user.email,
          uid: user.uid,
          reason: 'Auto-locked after 30 minutes of inactivity',
        });
        logout();
        onShowMessage('Session locked due to 30 minutes of inactivity.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [user, isSuperAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentLock = checkBruteForceLockout();
    if (currentLock.isLocked) {
      setLockoutStatus(currentLock);
      setCountdownSeconds(Math.ceil(currentLock.remainingMs / 1000));
      setLoginError(`Security lockout in effect. Please wait ${Math.ceil(currentLock.remainingMs / 1000)}s.`);
      return;
    }

    if (!adminPassword) {
      setLoginError('Please enter your administrator password.');
      return;
    }
    setLoginSubmitting(true);
    setLoginError(null);
    try {
      const res = await signIn(adminEmail.trim(), adminPassword);
      if (!res.success) {
        const failStatus = recordFailedAuthAttempt();
        setLockoutStatus(failStatus);
        if (failStatus.isLocked) {
          setCountdownSeconds(Math.ceil(failStatus.remainingMs / 1000));
          setLoginError(`Maximum attempts exceeded. Gateway locked for 5 minutes.`);
        } else {
          setLoginError(
            `${res.error || 'Authentication failed.'} (${failStatus.remainingAttempts} attempts remaining)`
          );
        }
      } else {
        resetAuthAttempts();
        onShowMessage('Administrator authenticated successfully.');
      }
    } catch (err: any) {
      const failStatus = recordFailedAuthAttempt();
      setLockoutStatus(failStatus);
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginSubmitting(false);
    }
  };

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

  const isTabActive = (itemId: string, tab: string) => {
    if (itemId === tab) return true;
    if (itemId === 'hero' && (tab === 'hero-banners' || tab === 'hero')) return true;
    if (itemId === 'navigation' && (tab === 'navigation-footer' || tab === 'navigation' || tab === 'footer')) return true;
    if (itemId === 'bulk-episodes' && (tab === 'episodes/bulk' || tab === 'bulk-episodes')) return true;
    if (itemId === 'legal' && (tab === 'legal-pages' || tab === 'legal')) return true;
    if (itemId === 'notice' && (tab === 'popup-notice' || tab === 'notice')) return true;
    return false;
  };

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
        { id: 'bulk-episodes', title: 'Bulk Episodes', path: '/admin/episodes/bulk', icon: ListPlus, badge: 'Fast' },
        { id: 'seasons', title: 'Seasons & Sequels', path: '/admin/seasons', icon: Layers },
        { id: 'downloads', title: 'Downloads', path: '/admin/downloads', icon: Download },
        { id: 'schedule', title: 'Schedule', path: '/admin/schedule', icon: Calendar },
        { id: 'taxonomy', title: 'Genres & Taxonomy', path: '/admin/taxonomy', icon: Tag },
      ],
    },
    {
      groupTitle: 'Display & Curation',
      items: [
        { id: 'homepage', title: 'Homepage Sections', path: '/admin/homepage', icon: Sliders },
        { id: 'hero', title: 'Hero Banners', path: '/admin/hero', icon: Sparkles },
        { id: 'notice', title: 'Site Pop-up Notice', path: '/admin/notice', icon: Megaphone },
        { id: 'announcements', title: 'Announcements', path: '/admin/announcements', icon: Bell },
        { id: 'navigation', title: 'Navigation & Footer', path: '/admin/navigation', icon: Compass },
        { id: 'avatars', title: 'Avatar Library', path: '/admin/avatars', icon: Users },
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
        { id: 'legal', title: 'Legal & Policies', path: '/admin/legal', icon: FileText },
        { id: 'logs', title: 'Activity Logs', path: '/admin/logs', icon: Activity },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    onShowMessage('Logged out from admin panel.');
    navigate('/');
  };

  if (loading && !authTimedOut && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#050A14] flex flex-col items-center justify-center p-4 space-y-3">
        <RefreshCw className="w-6 h-6 text-[#1683FF] animate-spin" />
        <div className="text-xs text-[#94A3B8] font-bold tracking-wide uppercase">
          Verifying Security Clearance...
        </div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0B1322] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#1683FF]/15 border border-[#1683FF]/30 flex items-center justify-center mx-auto text-[#1683FF] shadow-lg shadow-[#1683FF]/20">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              ZYNOX Security Gateway
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Restricted Administrator Console</span>
            </div>
            <p className="text-xs text-[#94A3B8] pt-1">
              {user ? (
                <span>
                  Currently signed in as <strong className="text-white">{user.email}</strong> (Unauthorized). Switch to the verified Super Administrator account.
                </span>
              ) : (
                'Sign in with your verified administrator credentials to access management controls.'
              )}
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="zairoxmax2.0@gmail.com"
                  className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {lockoutStatus.isLocked && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold">Security Lockout Active: </span>
                  <span>Too many failed attempts. Try again in {countdownSeconds}s.</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loginSubmitting || lockoutStatus.isLocked}
              className="w-full py-3 bg-[#1683FF] hover:bg-[#1683FF]/90 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1683FF]/25 cursor-pointer disabled:opacity-50"
            >
              {loginSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : lockoutStatus.isLocked ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Locked ({countdownSeconds}s)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock Admin Console</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            {user ? (
              <button
                type="button"
                onClick={() => logout()}
                className="text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer"
              >
                Sign out current account
              </button>
            ) : (
              <span className="text-slate-500 text-[11px]">Authorized personnel only</span>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#94A3B8] hover:text-white font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <span>Back to Site</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  const isActive = isTabActive(item.id, currentTab);
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
                      const isActive = isTabActive(item.id, currentTab);
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

