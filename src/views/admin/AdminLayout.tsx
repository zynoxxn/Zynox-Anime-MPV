import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminQuickSearchModal } from './AdminQuickSearchModal';
import {
  getAdminRole,
  canAccessModule,
  maskEmail,
  PINNED_SUPER_ADMIN_EMAIL,
} from '../../lib/admin-roles';
import {
  checkBruteForceLockout,
  recordFailedAuthAttempt,
  resetAuthAttempts,
  logSecurityThreat,
  INACTIVITY_TIMEOUT_MS,
  BruteForceStatus,
} from '../../lib/security';
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
  Palette,
  Globe,
  LogOut,
  Search,
  ExternalLink,
  X,
  Shield,
  Activity,
  Plus,
  Megaphone,
  ListPlus,
  Sparkles,
  Bell,
  Compass,
  Lock,
  Mail,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldAlert,
  ChevronRight,
  Menu,
  ChevronDown,
} from 'lucide-react';

interface AdminLayoutProps {
  currentTab: string;
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
  children: React.ReactNode;
}

interface NavSubItem {
  id: string;
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavSubItem[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  navigate,
  onShowMessage,
  children,
}) => {
  const { user, isAdmin, loading, logout, signIn } = useAuth();
  const effectiveRole = getAdminRole(user, isAdmin);
  const isSuperAdmin = effectiveRole === 'super_admin' || user?.email?.toLowerCase().trim() === PINNED_SUPER_ADMIN_EMAIL;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [revealedEmail, setRevealedEmail] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Security Login Gateway State
  const [adminEmail, setAdminEmail] = useState(PINNED_SUPER_ADMIN_EMAIL);
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

  // Session Inactivity Auto-Lock for authenticated admins (30 min)
  useEffect(() => {
    if (!user || (!isAdmin && !isSuperAdmin)) return;

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
  }, [user, isAdmin, isSuperAdmin, logout, onShowMessage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsMoreSheetOpen(false);
        setIsNewMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent scroll when mobile "More" sheet is open
  useEffect(() => {
    if (isMoreSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreSheetOpen]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentLock = checkBruteForceLockout();
    if (currentLock.isLocked) {
      setLockoutStatus(currentLock);
      setCountdownSeconds(Math.ceil(currentLock.remainingMs / 1000));
      setLoginError(`Security lockout active. Please wait ${Math.ceil(currentLock.remainingMs / 1000)}s.`);
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

  const handleLogout = async () => {
    await logout();
    onShowMessage('Logged out from admin panel.');
    navigate('/');
  };

  // Simplified 6-group menu specification (Section 2)
  const navSections: NavSection[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      id: 'library',
      title: 'Library',
      icon: Film,
      items: [
        { id: 'anime', title: 'Anime Library', path: '/admin/anime', icon: Film },
        { id: 'episodes', title: 'Episodes', path: '/admin/episodes', icon: Tv },
        { id: 'bulk-episodes', title: 'Bulk Episodes', path: '/admin/episodes/bulk', icon: ListPlus, badge: 'Fast' },
        { id: 'seasons', title: 'Seasons & Sequels', path: '/admin/seasons', icon: Layers },
        { id: 'downloads', title: 'Downloads', path: '/admin/downloads', icon: Download },
        { id: 'schedule', title: 'Schedule', path: '/admin/schedule', icon: Calendar },
        { id: 'taxonomy', title: 'Categories & Taxonomy', path: '/admin/taxonomy', icon: Tag },
      ],
    },
    {
      id: 'homepage',
      title: 'Homepage',
      icon: Sliders,
      items: [
        { id: 'homepage', title: 'Layout & Sections', path: '/admin/homepage', icon: Sliders },
        { id: 'hero', title: 'Hero Banners', path: '/admin/hero', icon: Sparkles },
        { id: 'notice', title: 'Popups & Notices', path: '/admin/notice', icon: Megaphone },
        { id: 'announcements', title: 'Announcements', path: '/admin/announcements', icon: Bell },
        { id: 'avatars', title: 'Avatar Library', path: '/admin/avatars', icon: Users },
      ],
    },
    {
      id: 'community',
      title: 'Community',
      icon: MessageSquare,
      items: [
        { id: 'requests', title: 'Anime Requests', path: '/admin/requests', icon: FileText },
        { id: 'reports', title: 'Reports & Comments', path: '/admin/reports', icon: MessageSquare },
        { id: 'users', title: 'Users & Roles', path: '/admin/users', icon: Users },
      ],
    },
    {
      id: 'site',
      title: 'Site',
      icon: Settings,
      items: [
        { id: 'settings', title: 'Site Settings', path: '/admin/settings', icon: Settings },
        { id: 'branding', title: 'Branding Identity', path: '/admin/branding', icon: Palette },
        { id: 'navigation', title: 'Menus & Footer', path: '/admin/navigation', icon: Compass },
        { id: 'seo', title: 'SEO & Metadata', path: '/admin/seo', icon: Globe },
        { id: 'legal', title: 'Legal Pages', path: '/admin/legal', icon: FileText },
      ],
    },
    {
      id: 'system',
      title: 'System',
      icon: Activity,
      items: [
        { id: 'logs', title: 'Activity Logs', path: '/admin/logs', icon: Activity },
      ],
    },
  ];

  const isTabActive = (itemId: string, tab: string) => {
    if (itemId === tab) return true;
    if (itemId === 'hero' && (tab === 'hero-banners' || tab === 'hero')) return true;
    if (itemId === 'navigation' && (tab === 'navigation-footer' || tab === 'navigation' || tab === 'footer')) return true;
    if (itemId === 'bulk-episodes' && (tab === 'episodes/bulk' || tab === 'bulk-episodes')) return true;
    if (itemId === 'legal' && (tab === 'legal-pages' || tab === 'legal')) return true;
    if (itemId === 'notice' && (tab === 'popup-notice' || tab === 'notice')) return true;
    return false;
  };

  // Filter sections by role
  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessModule(effectiveRole, item.id)),
    }))
    .filter((section) => section.items.length > 0);

  // Security gate check
  if (loading && !authTimedOut && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#050A14] flex flex-col items-center justify-center p-4 space-y-3">
        <RefreshCw className="w-6 h-6 text-[#1E88FF] animate-spin" />
        <div className="text-xs text-[#94A3B8] font-bold tracking-wide uppercase">
          Verifying Administrator Access...
        </div>
      </div>
    );
  }

  if (!user || (!isAdmin && !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0B1324] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center mx-auto text-[#1E88FF] shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ZYNOX Admin Console
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Restricted Access</span>
            </div>
            <p className="text-xs text-[#94A3B8] pt-1">
              {user ? (
                <span>
                  Signed in as <strong className="text-white">{user.email}</strong> (Unauthorized). Switch to verified administrator credentials.
                </span>
              ) : (
                'Sign in with administrator credentials to access management controls.'
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
                  placeholder={PINNED_SUPER_ADMIN_EMAIL}
                  className="w-full h-11 bg-[#050A14] border border-white/10 focus:border-[#1E88FF] rounded-xl pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors"
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
                  className="w-full h-11 bg-[#050A14] border border-white/10 focus:border-[#1E88FF] rounded-xl pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors"
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
              className="w-full h-11 bg-[#1E88FF] hover:bg-[#1873db] text-white font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#1E88FF]/25 cursor-pointer disabled:opacity-50"
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
                Sign out
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
    <div className="h-screen bg-[#050A14] text-white flex flex-col antialiased selection:bg-[#1E88FF] selection:text-white overflow-hidden">
      {/* Top Header Bar (56px h-14, 100% opaque #050A14, no blur, border-b border-white/10, z-30) */}
      <header className="shrink-0 z-30 bg-[#050A14] border-b border-white/10 px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand & Sidebar Collapse Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="hidden lg:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
          >
            <img
              src="/assets/aistudio/file_00000000d05c82118a47e15fb7b4a381_e8184cc9.png"
              alt="ZYNOX ANIME"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white tracking-wider flex items-center gap-1.5 truncate">
                ZYNOX <span className="text-[#1E88FF] text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-[#1E88FF]/15 border border-[#1E88FF]/30">Admin</span>
              </div>
              <div className="text-[10px] text-[#94A3B8] truncate hidden sm:block">Control Panel</div>
            </div>
          </div>
        </div>

        {/* Center: Global Search Trigger (Ctrl + K) */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center justify-between gap-2 px-3.5 h-10 rounded-xl bg-[#050A14] border border-white/10 hover:border-[#1E88FF]/50 text-[#94A3B8] hover:text-white text-xs sm:text-sm transition-all w-48 md:w-64 lg:w-72 cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-[#1E88FF] shrink-0" />
            <span className="truncate">Search admin & anime...</span>
          </div>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white shrink-0">
            Ctrl K
          </kbd>
        </button>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
            title="Search"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-[#1E88FF]" />
          </button>

          {/* "+ New" Dropdown Menu */}
          <div ref={newMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNewMenuOpen((prev) => !prev)}
              className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-[#1E88FF] hover:bg-[#1873db] active:bg-[#1460b8] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm shadow-[#1E88FF]/25 cursor-pointer whitespace-nowrap"
              title="Add New Content"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">New</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isNewMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isNewMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#101A30] border border-white/10 rounded-xl shadow-xl shadow-black/50 py-1.5 z-50 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    navigate('/admin/anime/new');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs sm:text-sm text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                >
                  <Film className="w-4 h-4 text-[#1E88FF] shrink-0" />
                  <span>Anime Series</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    navigate('/admin/episodes');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs sm:text-sm text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                >
                  <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Single Episode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    navigate('/admin/episodes/bulk');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs sm:text-sm text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                >
                  <ListPlus className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Bulk Episodes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    navigate('/admin/hero');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs sm:text-sm text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Hero Banner</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    navigate('/admin/notice');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs sm:text-sm text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Popup Notice</span>
                </button>
              </div>
            )}
          </div>

          {/* View Live Site Button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[#94A3B8] hover:text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="View Live Site"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">View Site</span>
          </button>

          {/* Profile Dropdown */}
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="h-9 sm:h-10 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center gap-2 transition-colors cursor-pointer"
              title="Admin Account"
            >
              <div className="w-6 h-6 rounded-full bg-[#1E88FF]/20 text-[#1E88FF] border border-[#1E88FF]/30 flex items-center justify-center font-bold text-xs shrink-0">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-white truncate max-w-[100px]">
                {revealedEmail ? user.email : maskEmail(user.email)}
              </span>
              <ChevronDown className="hidden lg:inline w-3 h-3 text-[#94A3B8]" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-[#101A30] border border-white/10 rounded-xl shadow-xl shadow-black/50 p-2 z-50 animate-fadeIn space-y-2">
                <div className="px-2.5 py-1.5 border-b border-white/5">
                  <div
                    onClick={() => setRevealedEmail((prev) => !prev)}
                    className="text-xs font-semibold text-white truncate cursor-pointer hover:text-[#1E88FF] transition-colors"
                    title="Click to reveal email"
                  >
                    {revealedEmail ? user.email : maskEmail(user.email)}
                  </div>
                  <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{effectiveRole.replace('_', ' ')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/admin/logs');
                  }}
                  className="w-full px-2.5 py-2 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Activity Logs</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="w-full px-2.5 py-2 text-left text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#94A3B8]" />
                  <span>Site Settings</span>
                </button>

                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-2.5 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Desktop Sidebar (≥ 1024px: 260px or 72px collapsed) & Tablet (768px-1023px: 72px) */}
        <aside
          className={`hidden md:flex flex-col justify-between bg-[#080E1A] border-r border-white/10 shrink-0 transition-all duration-200 overflow-y-auto no-scrollbar ${
            isSidebarCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-3.5 lg:p-4'
          }`}
        >
          <div className="space-y-5">
            {visibleNavSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {!isSidebarCollapsed ? (
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-2.5 py-1">
                    {section.title}
                  </div>
                ) : (
                  <div className="h-px bg-white/5 my-2 mx-1" />
                )}

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isTabActive(item.id, currentTab);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.path)}
                      title={item.title}
                      className={`w-full flex items-center rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        isSidebarCollapsed
                          ? 'h-11 justify-center'
                          : 'h-10 justify-between px-3'
                      } ${
                        isActive
                          ? 'bg-[#1E88FF] text-white shadow-sm shadow-[#1E88FF]/30 font-semibold'
                          : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                        {!isSidebarCollapsed && <span className="truncate">{item.title}</span>}
                      </div>

                      {!isSidebarCollapsed && item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer info */}
          {!isSidebarCollapsed ? (
            <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between px-2 text-[11px] text-[#94A3B8]">
              <span className="truncate">ZYNOX CMS v3</span>
              <span className="text-emerald-400 font-semibold">Protected</span>
            </div>
          ) : (
            <div className="mt-6 pt-2 border-t border-white/5 flex justify-center text-[10px] text-emerald-400">
              ●
            </div>
          )}
        </aside>

        {/* Content Pane (Responsive padding 16px to 32px, max-w 1280px, pb-36 on mobile for nav + save bar + buffer) */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 bg-[#050A14] pb-36 md:pb-24 min-h-0">
          <div className="max-w-7xl mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Phone Bottom Navigation Bar (< 768px: 5 Tabs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080E1A]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'dashboard'
              ? 'text-[#1E88FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/anime')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'anime'
              ? 'text-[#1E88FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Library</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/episodes')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'episodes' || currentTab === 'bulk-episodes'
              ? 'text-[#1E88FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Episodes</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'settings'
              ? 'text-[#1E88FF]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Site</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMoreSheetOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            isMoreSheetOpen ? 'text-[#1E88FF]' : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>

      {/* Phone "More" Bottom Sheet (< 768px) */}
      {isMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreSheetOpen(false)}
          />

          {/* Bottom Sheet Box */}
          <div className="relative w-full max-h-[85dvh] bg-[#0B1324] border-t border-white/10 rounded-t-[20px] shadow-2xl flex flex-col z-10 animate-slideUp">
            {/* Header & Drag Handle */}
            <div className="pt-3 pb-2.5 px-4 flex flex-col items-center border-b border-white/5 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20 mb-2.5" />
              <div className="w-full flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Admin Modules</h3>
                  <p className="text-[11px] text-[#94A3B8]">Browse all CMS control panels</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable list of modules */}
            <div className="p-3 overflow-y-auto space-y-4 max-h-[calc(85dvh-120px)] divide-y divide-white/5 pb-[calc(80px+env(safe-area-inset-bottom))]">
              {visibleNavSections.map((sec) => (
                <div key={sec.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-2">
                    {sec.title}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isTabActive(item.id, currentTab);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            navigate(item.path);
                            setIsMoreSheetOpen(false);
                          }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-[#1E88FF] text-white font-semibold shadow-sm'
                              : 'bg-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#1E88FF]'}`} />
                          <span className="truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Bottom Quick Actions (Live site & Logout) */}
              <div className="pt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    navigate('/');
                  }}
                  className="h-10 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 border border-white/5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Live Site</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    handleLogout();
                  }}
                  className="h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 flex items-center justify-center gap-2 border border-rose-500/20 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Quick Search Modal (Ctrl + K) */}
      <AdminQuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigate={navigate}
      />
    </div>
  );
};
