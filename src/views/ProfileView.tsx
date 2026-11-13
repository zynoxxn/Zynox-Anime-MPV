import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import {
  getWatchlist,
  getFavorites,
  getWatchHistory,
  getContinueWatching,
  removeFromWatchlist,
  removeFavorite,
  clearWatchHistory,
} from '../lib/firestore/user-activity';
import { calculateUserBadges } from '../lib/badges';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import type {
  UserBadge,
  WatchProgress,
  WatchHistoryItem,
  WatchlistItem,
  FavoriteItem,
} from '../types/library';
import { ANIME_AVATARS, DEFAULT_AVATAR } from '../data/avatars';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { ChangePasswordModal } from '../components/profile/ChangePasswordModal';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import {
  NotificationSettingsModal,
  PrivacySettingsModal,
} from '../components/profile/SettingsModals';
import { LeftSidebar } from '../components/LeftSidebar';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  Shield,
  LogOut,
  Bookmark,
  Heart,
  History as HistoryIcon,
  Sparkles,
  Bell,
  Edit3,
  Trash2,
  Camera,
  Play,
  ChevronRight,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ProfileViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
  onOpenLegal?: (tab: 'about' | 'dmca' | 'disclaimer') => void;
}

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

export const ProfileView: React.FC<ProfileViewProps> = ({
  navigate,
  onShowMessage,
  onOpenLegal,
}) => {
  const { user, userProfile, isAdmin, logout, signIn, signUp, updateUserAvatar, loading } =
    useAuth();

  const [activeTab, setActiveTab] = useState<'watchlist' | 'history' | 'favorites' | 'settings'>(
    'watchlist'
  );

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [continueWatchingList, setContinueWatchingList] = useState<WatchProgress[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [avatarUpdating, setAvatarUpdating] = useState(false);

  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authAvatar, setAuthAvatar] = useState<string>(DEFAULT_AVATAR);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  usePageSeo({
    title: 'My Profile | ZYNOX ANIME',
    description: 'Manage your ZYNOX ANIME watchlist, watch history, favorites, and settings.',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['watchlist', 'history', 'favorites', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setDataError(null);
      const [wList, fList, hList, cList] = await Promise.all([
        getWatchlist(user?.uid || null),
        getFavorites(user?.uid || null),
        getWatchHistory(user?.uid || null),
        getContinueWatching(user?.uid || null),
      ]);

      setWatchlist(wList);
      setFavorites(fList);
      setHistory(hList);
      setContinueWatchingList(cList);

      const computedBadges = calculateUserBadges({
        watchlistCount: wList.length,
        completedCount: wList.filter((w) => w.status === 'completed').length,
        favoritesCount: fList.length,
        historyCount: hList.length,
        commentsCount: 0,
        role: userProfile?.role,
        createdAt: userProfile?.createdAt,
      });
      setBadges(computedBadges);
    } catch (e) {
      console.warn('Failed to load user stats:', e);
      setDataError('Could not load your saved profile library.');
    }
  }, [user?.uid, userProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleAvatarSelect = async (newUrl: string) => {
    if (!user) {
      setAuthAvatar(newUrl);
      return;
    }
    setAvatarUpdating(true);
    const res = await updateUserAvatar(newUrl);
    setAvatarUpdating(false);
    if (res.success) {
      onShowMessage('Avatar updated successfully!');
    } else {
      onShowMessage(res.error || 'Failed to update avatar.');
    }
  };

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      onShowMessage('Signed out successfully.');
      navigate('/');
    }
  };

  const handleRemoveFromWatchlist = async (animeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFromWatchlist(user?.uid || null, animeId);
    setWatchlist((prev) => prev.filter((item) => item.animeId !== animeId));
    onShowMessage('Removed from Watchlist.');
  };

  const handleRemoveFromFavorites = async (animeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFavorite(user?.uid || null, animeId);
    setFavorites((prev) => prev.filter((item) => item.animeId !== animeId));
    onShowMessage('Removed from Favorites.');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const email = authEmail.trim();
    if (!email) {
      setAuthError('Email address is required.');
      return;
    }
    if (!authPassword) {
      setAuthError('Password is required.');
      return;
    }

    if (authTab === 'signup') {
      const name = authDisplayName.trim();
      if (!name) {
        setAuthError('Display name is required.');
        return;
      }
      if (authPassword.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }

      setAuthSubmitting(true);
      const res = await signUp(name, email, authPassword, authAvatar);
      setAuthSubmitting(false);

      if (res.success) {
        onShowMessage('Account created and logged in!');
      } else {
        setAuthError(res.error || 'Failed to create account.');
      }
    } else {
      setAuthSubmitting(true);
      const res = await signIn(email, authPassword);
      setAuthSubmitting(false);

      if (res.success) {
        onShowMessage('Signed in successfully!');
      } else {
        setAuthError(res.error || 'Failed to sign in.');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center text-[#94A3B8] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E88FF]" />
        <span className="text-xs">Loading profile information...</span>
      </div>
    );
  }

  const currentAvatarUrl = userProfile?.avatar || user?.photoURL || DEFAULT_AVATAR;
  const displayName = user
    ? userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Member'
    : 'Guest Viewer';
  const userEmail = user?.email || 'Local device library (not synced)';
  const roleLabel = isAdmin ? 'Administrator' : user ? 'Member' : 'Guest';

  const getJoinedMeta = () => {
    if (!user) return { joined: 'Guest Session', duration: 'Sign in to sync across devices' };
    try {
      const rawDate =
        userProfile?.createdAt ||
        (user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date());
      const dateObj = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
      if (isNaN(dateObj.getTime())) {
        return { joined: 'Member', duration: 'Active account' };
      }
      const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const now = new Date();
      const diffMonths = Math.max(
        1,
        Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24 * 30))
      );
      return {
        joined: `Joined ${monthYear}`,
        duration: `Member for ${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`,
      };
    } catch {
      return { joined: 'Member', duration: 'Active account' };
    }
  };

  const joinedMeta = getJoinedMeta();
  const bioContent =
    userProfile?.bio ||
    (user
      ? 'Anime lover and collector.'
      : 'Sign in or create a free account to sync your anime watchlist and watch history across devices.');

  const animeWatchedCount = new Set(history.map((h) => h.animeId)).size;
  const episodesWatchedCount = history.length;
  const watchlistStatsCount = watchlist.length;
  const favoritesStatsCount = favorites.length;

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex gap-4 xl:gap-6 items-start">
        <LeftSidebar
          currentPath="/profile"
          navigate={navigate}
          isAdmin={isAdmin}
          onOpenLegal={onOpenLegal}
        />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Profile Header Card */}
          <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 sm:p-7 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 min-w-0">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#1E88FF] p-0.5 bg-[#050A14] overflow-hidden">
                    <img
                      src={currentAvatarUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>

                  {user && (
                    <button
                      type="button"
                      onClick={() => setIsAvatarModalOpen(true)}
                      disabled={avatarUpdating}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1E88FF] hover:bg-[#3B9BFF] text-white flex items-center justify-center border-2 border-[#0B1324] cursor-pointer transition-colors"
                      aria-label="Change avatar"
                    >
                      {avatarUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                      {displayName}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30 shrink-0">
                      <Sparkles className="w-3 h-3" />
                      <span>{roleLabel}</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] truncate">{userEmail}</p>

                  <p className="text-xs text-[#64748B] font-medium">
                    {joinedMeta.joined} <span className="mx-1">&bull;</span> {joinedMeta.duration}
                  </p>

                  <p className="text-xs sm:text-sm text-[#CBD5E1] pt-1 leading-relaxed max-w-xl break-words">
                    {bioContent}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0">
                {user ? (
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="h-10 px-4 bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#1E88FF]" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="h-10 px-4 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="p-2.5 rounded-xl bg-[#101A30] hover:bg-[#16223D] border border-white/5 transition-colors cursor-pointer"
              >
                <div className="text-lg sm:text-2xl font-bold text-white">{animeWatchedCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Anime Watched</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="p-2.5 rounded-xl bg-[#101A30] hover:bg-[#16223D] border border-white/5 transition-colors cursor-pointer"
              >
                <div className="text-lg sm:text-2xl font-bold text-white">{episodesWatchedCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Episodes Watched</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('watchlist')}
                className="p-2.5 rounded-xl bg-[#101A30] hover:bg-[#16223D] border border-white/5 transition-colors cursor-pointer"
              >
                <div className="text-lg sm:text-2xl font-bold text-white">{watchlistStatsCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Watchlist</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('favorites')}
                className="p-2.5 rounded-xl bg-[#101A30] hover:bg-[#16223D] border border-white/5 transition-colors cursor-pointer"
              >
                <div className="text-lg sm:text-2xl font-bold text-white">{favoritesStatsCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Favorites</div>
              </button>
            </div>
          </div>

          {dataError && (
            <ErrorState
              title="Library Sync Issue"
              message={dataError}
              onRetry={fetchStats}
            />
          )}

          {/* Navigation Tabs Bar */}
          <div className="flex border-b border-white/10 text-xs font-semibold overflow-x-auto no-scrollbar gap-4 sm:gap-6">
            {(['watchlist', 'history', 'favorites', 'settings'] as const).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`pb-3 px-1 transition-colors border-b-2 whitespace-nowrap cursor-pointer capitalize ${
                  activeTab === tabKey
                    ? 'border-[#1E88FF] text-white font-bold'
                    : 'border-transparent text-[#94A3B8] hover:text-white'
                }`}
              >
                {tabKey}
              </button>
            ))}
          </div>

          {/* TAB 1: WATCHLIST */}
          {activeTab === 'watchlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">
                  Watchlist ({watchlist.length})
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/watchlist')}
                  className="text-xs font-semibold text-[#1E88FF] hover:text-[#3B9BFF] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Open Full Watchlist
                </button>
              </div>

              {watchlist.length === 0 ? (
                <EmptyState
                  icon={<Bookmark className="w-7 h-7 text-[#1E88FF]" />}
                  title="Your watchlist is empty"
                  description="Save anime series from the catalog so you can track and resume them quickly."
                  actionLabel="Discover Anime"
                  onAction={() => navigate('/browse')}
                />
              ) : (
                <div className="space-y-2.5">
                  {watchlist.map((item, idx) => (
                    <div
                      key={`profile-wl-${item.animeId || item.id || idx}-${idx}`}
                      onClick={() => navigate(`/anime/${item.animeSlug}`)}
                      className="group bg-[#0B1324] hover:bg-[#101A30] border border-white/10 hover:border-[#1E88FF]/40 p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-12 h-16 bg-[#050A14] rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <img
                            src={item.animePoster || FALLBACK_POSTER}
                            alt={item.animeTitle}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#1E88FF] truncate transition-colors">
                            {item.animeTitle}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="text-[#94A3B8]">Series</span>
                            <span className="text-[#64748B]">&bull;</span>
                            <span className="text-[#1E88FF] capitalize font-medium">
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/anime/${item.animeSlug}/episode/1`);
                          }}
                          className="w-9 h-9 rounded-xl bg-[#1E88FF]/15 hover:bg-[#1E88FF] text-[#1E88FF] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          aria-label={`Watch ${item.animeTitle}`}
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromWatchlist(item.animeId, e)}
                          className="w-9 h-9 rounded-xl text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          aria-label={`Remove ${item.animeTitle} from watchlist`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">
                  Watch History ({history.length})
                </h2>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearHistoryModalOpen(true)}
                    className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {continueWatchingList.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#94A3B8]">Continue Watching</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {continueWatchingList.slice(0, 4).map((cw) => (
                      <div
                        key={`${cw.animeId}-${cw.episodeNumber}`}
                        onClick={() =>
                          navigate(`/anime/${cw.animeSlug}/episode/${cw.episodeNumber || 1}`)
                        }
                        className="bg-[#0B1324] hover:bg-[#101A30] border border-white/10 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors min-w-0"
                      >
                        <div className="w-10 h-14 rounded-lg bg-[#050A14] overflow-hidden shrink-0">
                          <img
                            src={cw.animePoster || FALLBACK_POSTER}
                            alt={cw.animeTitle}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold text-white truncate">
                            {cw.animeTitle}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Episode {cw.episodeNumber}
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1E88FF]"
                              style={{ width: `${Math.min(100, Math.max(5, cw.percentage || 0))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {history.length === 0 ? (
                <EmptyState
                  icon={<HistoryIcon className="w-7 h-7 text-[#1E88FF]" />}
                  title="No watch history yet"
                  description="Start streaming anime episodes to record your playback checkpoints."
                  actionLabel="Browse Anime"
                  onAction={() => navigate('/browse')}
                />
              ) : (
                <div className="space-y-2.5">
                  {history.map((item, idx) => (
                    <div
                      key={`profile-hist-${item.animeId || item.id || idx}-${item.episodeNumber || idx}-${idx}`}
                      onClick={() =>
                        navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber || 1}`)
                      }
                      className="group bg-[#0B1324] hover:bg-[#101A30] border border-white/10 hover:border-[#1E88FF]/40 p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-12 h-16 bg-[#050A14] rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <img
                            src={item.animePoster || FALLBACK_POSTER}
                            alt={item.animeTitle}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#1E88FF] truncate transition-colors">
                            {item.animeTitle}
                          </h4>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">
                            Episode {item.episodeNumber || 1}
                          </p>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-[#1E88FF]/15 group-hover:bg-[#1E88FF] text-[#1E88FF] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">
                  Favorite Animes ({favorites.length})
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/browse')}
                  className="text-xs font-semibold text-[#1E88FF] hover:text-[#3B9BFF] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Explore More
                </button>
              </div>

              {favorites.length === 0 ? (
                <EmptyState
                  icon={<Heart className="w-7 h-7 text-rose-400" />}
                  title="No favorites yet"
                  description="Tap the heart icon on any series detail page to add it here."
                  actionLabel="Browse Anime"
                  onAction={() => navigate('/browse')}
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {favorites.map((item, idx) => (
                    <div
                      key={`profile-fav-${item.animeId || item.id || idx}-${idx}`}
                      onClick={() => navigate(`/anime/${item.animeSlug}`)}
                      className="group bg-[#0B1324] hover:bg-[#101A30] border border-white/10 hover:border-[#1E88FF]/40 rounded-xl overflow-hidden cursor-pointer transition-colors min-w-0"
                    >
                      <div className="relative aspect-[2/3] w-full bg-[#050A14] overflow-hidden">
                        <img
                          src={item.animePoster || FALLBACK_POSTER}
                          alt={item.animeTitle}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromFavorites(item.animeId, e)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          aria-label={`Remove ${item.animeTitle} from favorites`}
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>

                      <div className="p-2.5">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-[#1E88FF] transition-colors">
                          {item.animeTitle}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS & GUEST AUTH */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {user ? (
                <div className="space-y-5">
                  <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-white">Profile Customization</h3>

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#101A30] rounded-xl border border-white/5">
                      <div className="relative group shrink-0">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#1E88FF] p-0.5 bg-[#050A14]">
                          <img
                            src={currentAvatarUrl}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAvatarModalOpen(true)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      <div className="space-y-1 text-center sm:text-left min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{displayName}</div>
                        <p className="text-xs text-[#94A3B8]">
                          Choose from official anime avatars
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAvatarModalOpen(true)}
                          className="text-xs text-[#1E88FF] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Browse Avatar Catalog ({ANIME_AVATARS.length})</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditProfileModalOpen(true)}
                        className="h-10 px-4 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Edit Name &amp; Bio
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsChangePasswordModalOpen(true)}
                        className="h-10 px-4 bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 space-y-3">
                    <h3 className="text-base font-bold text-white">Preferences &amp; Security</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsNotificationModalOpen(true)}
                        className="p-4 bg-[#101A30] hover:bg-[#16223D] border border-white/10 rounded-xl text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Bell className="w-5 h-5 text-[#1E88FF] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">Notifications</div>
                            <div className="text-[11px] text-[#94A3B8] truncate">
                              Episode releases &amp; alerts
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPrivacyModalOpen(true)}
                        className="p-4 bg-[#101A30] hover:bg-[#16223D] border border-white/10 rounded-xl text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Shield className="w-5 h-5 text-[#1E88FF] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">Privacy Settings</div>
                            <div className="text-[11px] text-[#94A3B8] truncate">
                              Public profile visibility
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">Account Session</div>
                      <div className="text-[11px] text-[#94A3B8] truncate">
                        Signed in as {user.email}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="h-9 px-4 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-white">
                        Sign In or Create Account
                      </h2>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Sync your anime watchlist and history across all devices.
                      </p>
                    </div>

                    <div className="flex bg-[#050A14] p-1 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setAuthError(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          authTab === 'login'
                            ? 'bg-[#1E88FF] text-white'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('signup');
                          setAuthError(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          authTab === 'signup'
                            ? 'bg-[#1E88FF] text-white'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Create Account
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5 max-w-lg">
                    {authTab === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={authDisplayName}
                          onChange={(e) => setAuthDisplayName(e.target.value)}
                          placeholder="e.g. AnimeOtaku"
                          disabled={authSubmitting}
                          className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-white text-xs sm:text-sm outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="user@example.com"
                        disabled={authSubmitting}
                        className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-white text-xs sm:text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Enter password"
                        disabled={authSubmitting}
                        className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-white text-xs sm:text-sm outline-none"
                      />
                    </div>

                    {authTab === 'signup' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={authConfirmPassword}
                            onChange={(e) => setAuthConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            disabled={authSubmitting}
                            className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-white text-xs sm:text-sm outline-none"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-[#CBD5E1]">
                              Starting Anime Avatar
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsAvatarModalOpen(true)}
                              className="text-xs font-semibold text-[#1E88FF] hover:underline cursor-pointer"
                            >
                              Browse All ({ANIME_AVATARS.length})
                            </button>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {ANIME_AVATARS.slice(0, 8).map((av) => (
                              <button
                                key={av.id}
                                type="button"
                                onClick={() => setAuthAvatar(av.url)}
                                className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                  authAvatar === av.url
                                    ? 'border-[#1E88FF] scale-105'
                                    : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                                }`}
                                title={av.name}
                              >
                                <img
                                  src={av.url}
                                  alt={av.name}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full h-10 px-4 bg-[#1E88FF] hover:bg-[#3B9BFF] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {authSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : authTab === 'login' ? (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Sign In</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Create Account</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user ? currentAvatarUrl : authAvatar}
        onSelectAvatar={handleAvatarSelect}
        isAdmin={isAdmin}
        onNavigateAdmin={navigate}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onOpenAvatarPicker={() => {
          setIsEditProfileModalOpen(false);
          setIsAvatarModalOpen(true);
        }}
        onShowMessage={onShowMessage}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        userEmail={user?.email || null}
        onShowMessage={onShowMessage}
      />

      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onShowMessage={onShowMessage}
      />

      <PrivacySettingsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onShowMessage={onShowMessage}
      />

      <ConfirmModal
        isOpen={isClearHistoryModalOpen}
        title="Clear Watch History?"
        message={`This will clear all ${history.length} watched episode checkpoints from your account. This action cannot be undone.`}
        confirmLabel="Clear All"
        isDestructive
        onConfirm={async () => {
          try {
            await clearWatchHistory(user?.uid || null);
            setHistory([]);
            setContinueWatchingList([]);
            setIsClearHistoryModalOpen(false);
            onShowMessage?.('Watch history cleared.');
          } catch (err) {
            console.error('Failed to clear watch history:', err);
            onShowMessage?.('Failed to clear history. Please try again.');
          }
        }}
        onCancel={() => setIsClearHistoryModalOpen(false)}
      />
    </div>
  );
};
