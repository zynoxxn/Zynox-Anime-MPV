import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { searchAndFilterAnimes } from '../lib/firestore/anime';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/firestore/notifications';
import type { Anime } from '../types/anime';
import type { AppNotification } from '../types/library';
import {
  Search,
  Bookmark,
  History,
  Heart,
  Bell,
  Menu,
  X,
  Compass,
  CheckCheck,
  Film,
  Star,
  Layers,
  LogOut,
  User as UserIcon,
  Flame,
  Calendar,
  Settings,
} from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, navigate, onShowMessage }) => {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Live search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener ('/' or 'Cmd/Ctrl+K')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase() || '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape') {
          setSearchOpen(false);
          setMobileSearchOpen(false);
        }
        return;
      }

      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileSearchOpen(true);
          setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
        } else {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchAndFilterAnimes({ query: searchQuery.trim() });
        setSearchResults(results.slice(0, 6));
        setSearchOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications for logged-in user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    getUserNotifications(user.uid)
      .then((data) => {
        if (isMounted) setNotifications(data);
      })
      .catch((err) => console.warn('Failed to load notifications:', err));

    return () => {
      isMounted = false;
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectAnime = (slug: string, seasonNumber?: number) => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery('');
    navigate(seasonNumber ? `/anime/${slug}?season=${seasonNumber}` : `/anime/${slug}`);
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onShowMessage('All notifications marked as read');
    } catch {
      onShowMessage('Failed to mark notifications');
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read && user) {
      await markNotificationRead(notif.id || '', user.uid);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    setNotifOpen(false);
    if (notif.link) {
      if (notif.link.startsWith('http://') || notif.link.startsWith('https://')) {
        window.open(notif.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(notif.link);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setProfileDropdownOpen(false);
      onShowMessage('Signed out successfully');
      navigate('/');
    } catch {
      onShowMessage('Failed to sign out');
    }
  };

  const displayName = user
    ? userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'User'
    : 'Sign In';

  // Desktop navigation links
  const centerNavLinks = [
    { label: 'Home', path: '/', isActive: currentPath === '/' },
    { label: 'Anime', path: '/browse', isActive: currentPath === '/browse' && !window.location.search },
    { label: 'Movies', path: '/browse?type=Movie', isActive: currentPath.includes('type=Movie') },
    { label: 'TV Series', path: '/browse?type=TV', isActive: currentPath.includes('type=TV') },
    { label: 'Genres', path: '/browse', isActive: currentPath.includes('genre') },
    { label: 'Schedule', path: '/browse?sort=schedule', isActive: currentPath.includes('schedule') },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-[#050A14]/95 border-b border-white/5 backdrop-blur-xl transition-all select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 md:h-[72px] flex items-center justify-between gap-3 sm:gap-6">
          
          {/* 1. LEFT: Hamburger Menu (Mobile) + zynox anime Branding */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Menu Toggle (Section 28) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-[#CBD5E1] hover:text-white rounded-lg hover:bg-[#07111F] transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo: ZYNOX ANIME */}
            <button
              id="btn-header-home"
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setMobileSearchOpen(false);
                navigate('/');
              }}
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <span className="font-extrabold text-lg sm:text-xl md:text-2xl text-white tracking-wider uppercase">
                ZYNOX
              </span>
              <span className="font-extrabold text-lg sm:text-xl md:text-2xl text-[#1683FF] tracking-wider uppercase">
                ANIME
              </span>
            </button>
          </div>

          {/* 2. CENTER: Desktop Clean Navigation Links (Section 08) */}
          <nav className="hidden lg:flex items-center gap-6 text-[14px] font-semibold">
            {centerNavLinks.map((link) => {
              const active = link.isActive;
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`relative py-1 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#1683FF] font-bold'
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1683FF] rounded-full shadow-sm shadow-[#1683FF]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 3. RIGHT: Search Bar + Notifications + Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Direct Search Input (Section 09) */}
            <div ref={searchRef} className="relative hidden md:block w-56 lg:w-72">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id="header-search-bar"
                  type="text"
                  placeholder="Search anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setSearchOpen(true);
                  }}
                  className="w-full h-10 bg-[#07111F] hover:bg-[#081426] focus:bg-[#081426] border border-[#2196FF]/25 focus:border-[#1683FF] text-xs text-white rounded-xl pl-9 pr-8 focus:outline-none transition-all placeholder:text-[#94A3B8]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-white rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Desktop Live Search Dropdown */}
              {searchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#081426] border border-[#1683FF]/30 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in backdrop-blur-2xl">
                  {searchLoading ? (
                    <div className="p-4 text-center text-xs text-[#CBD5E1] flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-[#1683FF] border-t-transparent rounded-full animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                      {searchResults.map((anime, idx) => (
                        <div
                          key={`hdr-sr-${anime.id || anime.slug}-${idx}`}
                          onClick={() => handleSelectAnime(anime.slug, anime.activeSeasonNumber)}
                          className="p-2.5 flex items-center gap-3 hover:bg-[#0B1B32] cursor-pointer transition-colors group"
                        >
                          <div className="w-9 h-12 rounded-lg bg-[#050A14] shrink-0 overflow-hidden border border-white/10 group-hover:border-[#1683FF]/50 transition-colors">
                            {anime.poster ? (
                              <img
                                src={anime.poster}
                                alt={anime.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Film className="w-4 h-4 m-auto mt-4 text-[#94A3B8]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white group-hover:text-[#00CFFF] truncate transition-colors">
                                {anime.title}
                              </span>
                              {anime.activeSeasonNumber && (
                                <span className="px-1.5 py-0.2 rounded bg-[#1683FF]/20 text-[#00CFFF] text-[10px] font-black border border-[#1683FF]/30">
                                  S{anime.activeSeasonNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                              {anime.rating && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                                  <span>{anime.rating}</span>
                                </span>
                              )}
                              <span>• {anime.year || 2024}</span>
                              {anime.totalEpisodes && <span>• {anime.totalEpisodes} Eps</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
                        }}
                        className="w-full py-2 bg-[#050A14] hover:bg-[#1683FF]/20 text-xs font-bold text-[#1683FF] text-center transition-colors border-t border-white/5"
                      >
                        View all results &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-[#94A3B8]">
                      No anime found for &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Search Toggle Icon */}
            <button
              type="button"
              onClick={() => {
                const next = !mobileSearchOpen;
                setMobileSearchOpen(next);
                if (next) setTimeout(() => mobileSearchInputRef.current?.focus(), 80);
              }}
              className="md:hidden p-2 rounded-xl text-[#CBD5E1] hover:text-white hover:bg-[#07111F] transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications Bell */}
            {user && (
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative p-2 rounded-xl text-[#CBD5E1] hover:text-white hover:bg-[#07111F] border border-transparent hover:border-white/10 transition-all"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1683FF] rounded-full ring-2 ring-[#050A14]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#081426] border border-[#1683FF]/30 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-2xl space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          className="text-[10px] text-[#1683FF] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#94A3B8]">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-2 rounded-xl cursor-pointer transition-colors ${
                              n.read
                                ? 'text-[#94A3B8] hover:bg-white/5'
                                : 'bg-[#1683FF]/10 text-white hover:bg-[#1683FF]/20 border border-[#1683FF]/20'
                            }`}
                          >
                            <div className="text-xs font-bold text-white flex items-center justify-between">
                              <span>{n.title}</span>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#1683FF]" />}
                            </div>
                            <p className="text-[10px] text-[#CBD5E1] mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Circular Profile Button (Section 10) */}
            <div ref={profileDropdownRef} className="relative">
              <button
                id="btn-header-profile"
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                  } else {
                    setProfileDropdownOpen((prev) => !prev);
                  }
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#07111F] hover:bg-[#081426] border border-white/10 hover:border-[#1683FF]/50 flex items-center justify-center text-[#CBD5E1] hover:text-white transition-all shadow-md cursor-pointer overflow-hidden p-0.5"
                title={user ? displayName : 'Sign In'}
              >
                {user ? (
                  userProfile?.avatar || user.photoURL ? (
                    <img
                      src={userProfile?.avatar || user.photoURL || ''}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1683FF] to-[#00CFFF] p-[2px]">
                      <div className="w-full h-full rounded-full bg-[#07111F] flex items-center justify-center text-xs font-bold text-[#00CFFF]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )
                ) : (
                  <UserIcon className="w-4 h-4 text-[#CBD5E1]" />
                )}
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && user && (
                <div className="absolute right-0 mt-2 w-56 bg-[#081426] border border-[#1683FF]/30 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#1683FF]/50 shrink-0 bg-[#050A14]">
                      {userProfile?.avatar || user.photoURL ? (
                        <img
                          src={userProfile?.avatar || user.photoURL || ''}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1683FF]/20 flex items-center justify-center font-bold text-[#00CFFF]">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate">{displayName}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{user.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#CBD5E1] hover:text-white hover:bg-[#0B1B32] transition-colors text-left"
                  >
                    <UserIcon className="w-4 h-4 text-[#1683FF]" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/watchlist');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#CBD5E1] hover:text-white hover:bg-[#0B1B32] transition-colors text-left"
                  >
                    <Bookmark className="w-4 h-4 text-[#1683FF]" />
                    <span>Watchlist</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/history');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#CBD5E1] hover:text-white hover:bg-[#0B1B32] transition-colors text-left"
                  >
                    <History className="w-4 h-4 text-[#1683FF]" />
                    <span>Watch History</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/admin');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#1683FF] font-bold hover:bg-[#1683FF]/15 transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-[#1683FF]" />
                      <span>Admin Dashboard</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Live Search Overlay (Expanded when search icon is clicked) */}
        {mobileSearchOpen && (
          <div className="md:hidden px-3 pb-3 pt-1 border-t border-white/5 bg-[#050A14]">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-[#07111F] border border-[#2196FF]/30 text-xs text-white rounded-xl pl-9 pr-9 focus:outline-none focus:border-[#1683FF]"
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8]"
              >
                <X className="w-4 h-4" />
              </button>
            </form>

            {/* Mobile Dropdown Search Results */}
            {searchQuery.trim() && (
              <div className="mt-2 bg-[#081426] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/5">
                {searchResults.map((anime, idx) => (
                  <div
                    key={`mob-sr-${anime.id || anime.slug}-${idx}`}
                    onClick={() => handleSelectAnime(anime.slug, anime.activeSeasonNumber)}
                    className="p-2.5 flex items-center gap-2.5 hover:bg-[#0B1B32] cursor-pointer"
                  >
                    <div className="w-8 h-10 rounded bg-[#050A14] shrink-0 overflow-hidden border border-white/10">
                      <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">{anime.title}</span>
                        {anime.activeSeasonNumber && (
                          <span className="px-1.5 py-0.2 rounded bg-[#1683FF]/20 text-[#00CFFF] text-[9px] font-black border border-[#1683FF]/30">
                            S{anime.activeSeasonNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">
                        {anime.year || 2024}
                        {anime.totalEpisodes ? ` • ${anime.totalEpisodes} Eps` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Slide-Out Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="relative w-64 max-w-[80vw] h-full bg-[#050A14] border-r border-white/5 p-4 flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-white uppercase">ZYNOX</span>
                  <span className="font-extrabold text-lg text-[#1683FF] uppercase">ANIME</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                {[
                  { label: 'Home', path: '/', icon: Film },
                  { label: 'Explore Anime', path: '/browse', icon: Compass },
                  { label: 'Trending', path: '/browse?sort=popular', icon: Flame },
                  { label: 'Schedule', path: '/browse?sort=schedule', icon: Calendar },
                  { label: 'Watchlist', path: '/watchlist', icon: Bookmark },
                  { label: 'Watch History', path: '/history', icon: History },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = currentPath === item.path;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate(item.path);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                        active
                          ? 'bg-[#1683FF] text-white font-bold'
                          : 'text-[#CBD5E1] hover:bg-[#07111F]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1683FF] bg-[#1683FF]/10 rounded-xl"
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin Panel</span>
                </button>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full py-2 bg-[#1683FF] text-white text-xs font-bold rounded-xl text-center shadow-lg shadow-[#1683FF]/25"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
