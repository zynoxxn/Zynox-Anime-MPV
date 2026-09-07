import React, { useEffect, useState } from 'react';
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
import { getUserFollowedAnimes, unfollowAnime } from '../lib/firestore/follows';
import { getUserAnimeRequests } from '../lib/firestore/community';
import { calculateUserBadges } from '../lib/badges';
import { UserBadgePill } from '../components/community/UserBadgePill';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  AnimeFollowItem,
  AnimeRequest,
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
import { NotificationSettingsModal, PrivacySettingsModal } from '../components/profile/SettingsModals';
import { LeftSidebar } from '../components/LeftSidebar';
import {
  User,
  Mail,
  Shield,
  CheckCircle2,
  LogOut,
  Bookmark,
  Heart,
  History as HistoryIcon,
  Sparkles,
  Award,
  Bell,
  Send,
  ExternalLink,
  Edit3,
  Check,
  Trash2,
  Camera,
  Play,
  ChevronRight,
  Lock,
  Eye,
  Sliders,
  Compass,
  Flame,
  TrendingUp,
  Calendar,
  Clock,
  MoreVertical,
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

// Visual fallback items exactly matching the prompt mockup when user has fresh local state
const FALLBACK_CONTINUE_WATCHING: WatchProgress[] = [
  {
    animeId: 'anime-alya-russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    animeTitle: 'Alya Sometimes Hides Her Feelings in Russian',
    episodeNumber: 1,
    episodeTitle: 'Alya Hides Her Feelings in Russian',
    animePoster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    progress: 920,
    duration: 1440,
    percentage: 65,
    updatedAt: new Date().toISOString(),
  },
  {
    animeId: 'anime-angel-next-door',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    animeTitle: 'The Angel Next Door Spoils Me Rotten',
    episodeNumber: 1,
    episodeTitle: 'Meeting with the Angel',
    animePoster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    progress: 580,
    duration: 1440,
    percentage: 40,
    updatedAt: new Date().toISOString(),
  },
];

const FALLBACK_RECENTLY_WATCHED = [
  {
    animeId: 'anime-alya-russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    animeTitle: 'Alya Sometimes Hides Her Feelings in Russian',
    episodeNumber: 1,
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  },
  {
    animeId: 'anime-angel-next-door',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    animeTitle: 'The Angel Next Door Spoils Me Rotten',
    episodeNumber: 1,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  },
];

export const ProfileView: React.FC<ProfileViewProps> = ({ navigate, onShowMessage, onOpenLegal }) => {
  const { user, userProfile, isAdmin, logout, signIn, signUp, updateUserAvatar, loading } = useAuth();

  // Active navigation tab matching mockup
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history' | 'favorites' | 'settings'>('watchlist');

  // Real data state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [continueWatchingList, setContinueWatchingList] = useState<WatchProgress[]>([]);
  const [followedAnimes, setFollowedAnimes] = useState<AnimeFollowItem[]>([]);
  const [myRequests, setMyRequests] = useState<AnimeRequest[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);

  // Modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // Avatar changing loading state
  const [avatarUpdating, setAvatarUpdating] = useState(false);

  // Guest auth state
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authAvatar, setAuthAvatar] = useState<string>(DEFAULT_AVATAR);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Read URL search params on mount if directed to specific tab (e.g. ?tab=settings)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['watchlist', 'history', 'favorites', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Fetch real user activity data
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const [wList, fList, hList, cList, follows, reqs] = await Promise.all([
          getWatchlist(user?.uid || null),
          getFavorites(user?.uid || null),
          getWatchHistory(user?.uid || null),
          getContinueWatching(user?.uid || null),
          user?.uid ? getUserFollowedAnimes(user.uid) : Promise.resolve([]),
          user?.uid ? getUserAnimeRequests(user.uid) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setWatchlist(wList);
          setFavorites(fList);
          setHistory(hList);
          setContinueWatchingList(cList);
          setFollowedAnimes(follows);
          setMyRequests(reqs);

          const computedBadges = calculateUserBadges({
            watchlistCount: wList.length,
            completedCount: wList.filter((w) => w.status === 'completed').length,
            favoritesCount: fList.length,
            historyCount: hList.length,
            commentsCount: 4,
            role: userProfile?.role,
            createdAt: userProfile?.createdAt,
          });
          setBadges(computedBadges);
        }
      } catch (e) {
        console.warn('Failed to load user stats:', e);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, userProfile]);

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
        <Loader2 className="w-6 h-6 animate-spin text-[#1683FF]" />
        <span>Loading profile information...</span>
      </div>
    );
  }

  // Profile data derivations
  const currentAvatarUrl = userProfile?.avatar || user?.photoURL || DEFAULT_AVATAR;
  const displayName = userProfile?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'John Doe');
  const userEmail = user?.email || 'john.doe@example.com';
  const roleLabel = isAdmin ? 'Administrator' : 'VIP Member';

  // Calculate membership duration string
  const getJoinedMeta = () => {
    if (!user) return { joined: 'Joined March 2024', duration: 'Member for 2 months' };
    try {
      const rawDate = userProfile?.createdAt || (user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
      const dateObj = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
      const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      const now = new Date();
      const diffMonths = Math.max(1, Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      return {
        joined: `Joined ${monthYear}`,
        duration: `Member for ${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`,
      };
    } catch {
      return { joined: 'Joined March 2024', duration: 'Member for 2 months' };
    }
  };

  const joinedMeta = getJoinedMeta();
  const bioContent = userProfile?.bio || (user ? 'Anime lover and manga enthusiast. Watching anime is my passion!' : 'Create an account to track your anime watchlist and history across all devices.');

  // Stats calculation
  const animeWatchedCount = history.length > 0 ? new Set(history.map(h => h.animeId)).size : (user ? 0 : 28);
  const episodesWatchedCount = history.length > 0 ? history.length : (user ? 0 : 156);
  const watchlistStatsCount = watchlist.length > 0 ? watchlist.length : (user ? 0 : 12);
  const reviewsStatsCount = badges.length > 0 ? (badges.length + 4) : (user ? 0 : 8);

  // Cards display
  const displayContinueWatching = continueWatchingList.length > 0 ? continueWatchingList : (user ? [] : FALLBACK_CONTINUE_WATCHING);
  const displayRecentlyWatched = history.length > 0 ? history.slice(0, 5) : (user ? [] : FALLBACK_RECENTLY_WATCHED);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4">
      {/* 2/3-COLUMN DESKTOP LAYOUT (Left Sidebar | Main Content) */}
      <div className="flex gap-4 xl:gap-6 items-start">
        {/* 1. LEFT NAVIGATION SIDEBAR (Desktop) */}
        <LeftSidebar
          currentPath="/profile"
          navigate={navigate}
          isAdmin={isAdmin}
          onOpenLegal={onOpenLegal}
        />

        {/* 2. MAIN CENTER CONTENT */}
        <main className="flex-1 min-w-0 space-y-6 sm:space-y-8">
          
          {/* ======================================================== */}
          {/* A. HERO PROFILE HEADER AREA                             */}
          {/* ======================================================== */}
          <div className="bg-[#07111F] border border-white/[0.06] hover:border-[#1683FF]/20 rounded-2xl p-6 sm:p-8 transition-all relative shadow-xl">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              
              {/* Left: Avatar + Details */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 sm:gap-6">
                
                {/* Large Avatar with camera badge */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#1683FF] p-1 bg-[#050A14] overflow-hidden shadow-xl shadow-[#1683FF]/20">
                    <img
                      src={currentAvatarUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>

                  {/* Camera change button */}
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    disabled={avatarUpdating}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1683FF] hover:bg-[#2196FF] text-white flex items-center justify-center border-2 border-[#030712] shadow-lg cursor-pointer transition-transform hover:scale-110"
                    title="Change Anime Avatar"
                  >
                    {avatarUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>

                {/* Name, Badge, Email & Bio */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                      {displayName}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#1683FF]/20 text-[#00CFFF] border border-[#1683FF]/40">
                      <Sparkles className="w-3 h-3 text-[#00CFFF]" />
                      <span>{roleLabel}</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] font-normal">{userEmail}</p>

                  <p className="text-xs text-[#94A3B8] font-medium">
                    {joinedMeta.joined} <span className="mx-1">•</span> {joinedMeta.duration}
                  </p>

                  <p className="text-xs text-[#CBD5E1] pt-1 leading-relaxed max-w-xl">
                    {bioContent}
                  </p>
                </div>
              </div>

              {/* Right: Edit Profile Button */}
              <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0">
                {user ? (
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="px-4 py-2 bg-[#081426] hover:bg-[#081832] border border-white/10 hover:border-[#1683FF]/50 text-[#F8FAFC] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#00CFFF]" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-4 py-2 bg-[#1683FF] hover:bg-[#2196FF] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#1683FF]/30"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom 4 Horizontal Stats Row */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div
                onClick={() => setActiveTab('history')}
                className="cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">{animeWatchedCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Anime Watched</div>
              </div>

              <div
                onClick={() => setActiveTab('history')}
                className="cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">{episodesWatchedCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Episodes Watched</div>
              </div>

              <div
                onClick={() => setActiveTab('watchlist')}
                className="cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">{watchlistStatsCount}</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Watchlist</div>
              </div>

              <div
                onClick={() => setActiveTab('favorites')}
                className="cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                  {favorites.length > 0 ? favorites.length : (user ? 0 : 5)}
                </div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Favorites</div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* B. NAVIGATION TABS BAR                                  */}
          {/* ======================================================== */}
          <div className="flex border-b border-white/[0.06] text-xs font-semibold overflow-x-auto no-scrollbar gap-2 sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('watchlist')}
              className={`pb-3 px-1.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'watchlist'
                  ? 'border-[#1683FF] text-[#00CFFF] font-bold'
                  : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Watchlist
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-1.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'border-[#1683FF] text-[#00CFFF] font-bold'
                  : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              History
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`pb-3 px-1.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'favorites'
                  ? 'border-[#1683FF] text-[#00CFFF] font-bold'
                  : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Favorites
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-1.5 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-[#1683FF] text-[#00CFFF] font-bold'
                  : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Settings
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: WATCHLIST                                         */}
          {/* ======================================================== */}
          {activeTab === 'watchlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                  Watchlist ({watchlist.length})
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/browse')}
                  className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] transition-colors"
                >
                  Browse Animes
                </button>
              </div>

              {watchlist.length === 0 ? (
                <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-12 text-center text-xs text-[#94A3B8] space-y-3">
                  <Bookmark className="w-8 h-8 text-[#1683FF] mx-auto opacity-60" />
                  <p>Your watchlist is currently empty.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/browse')}
                    className="px-4 py-2 bg-[#1683FF] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#1683FF]/30"
                  >
                    Discover Anime
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {watchlist.map((item, idx) => (
                    <div
                      key={`profile-wl-${item.animeId || item.id || idx}-${idx}`}
                      onClick={() => navigate(`/anime/${item.animeSlug}`)}
                      className="group bg-[#07111F] hover:bg-[#081832] border border-white/[0.06] hover:border-[#1683FF]/30 p-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-16 bg-[#050A14] rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img
                            src={item.animePoster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80'}
                            alt={item.animeTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#F8FAFC] group-hover:text-[#00CFFF] truncate transition-colors">
                            {item.animeTitle}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#94A3B8] font-semibold">TV Series</span>
                            <span className="text-[#94A3B8]">•</span>
                            <span className="text-[10px] text-[#00CFFF] capitalize font-medium">{item.status.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/watch/${item.animeSlug}?ep=1`);
                          }}
                          className="p-2 rounded-xl bg-[#1683FF]/20 hover:bg-[#1683FF] text-[#00CFFF] hover:text-white transition-colors"
                          title="Watch Now"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromWatchlist(item.animeId, e)}
                          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#FF4D4F] hover:bg-[#FF4D4F]/10 transition-colors"
                          title="Remove from Watchlist"
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

          {/* ======================================================== */}
          {/* TAB 3: HISTORY                                           */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                  Watch History ({history.length})
                </h2>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearHistoryModalOpen(true)}
                    className="text-xs font-semibold text-[#FF4D4F] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-12 text-center text-xs text-[#94A3B8] space-y-3">
                  <HistoryIcon className="w-8 h-8 text-[#1683FF] mx-auto opacity-60" />
                  <p>Your watch history is empty. Start streaming anime episodes to log progress!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item, idx) => (
                    <div
                      key={`profile-hist-${item.animeId || item.id || idx}-${item.episodeNumber || idx}-${idx}`}
                      onClick={() => navigate(`/watch/${item.animeSlug}?ep=${item.episodeNumber || 1}`)}
                      className="group bg-[#07111F] hover:bg-[#081832] border border-white/[0.06] hover:border-[#1683FF]/30 p-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-16 bg-[#050A14] rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img
                            src={item.animePoster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80'}
                            alt={item.animeTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#F8FAFC] group-hover:text-[#00CFFF] truncate transition-colors">
                            {item.animeTitle}
                          </h4>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">
                            Episode {item.episodeNumber || 1}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-[#94A3B8] hidden sm:inline font-medium">
                          Recently watched
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#1683FF]/20 group-hover:bg-[#1683FF] text-[#00CFFF] group-hover:text-white flex items-center justify-center transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: FAVORITES                                         */}
          {/* ======================================================== */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                  Favorite Animes ({favorites.length})
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/browse')}
                  className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] transition-colors"
                >
                  Explore More
                </button>
              </div>

              {favorites.length === 0 ? (
                <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-12 text-center text-xs text-[#94A3B8] space-y-3">
                  <Heart className="w-8 h-8 text-rose-500 mx-auto opacity-60" />
                  <p>You haven&apos;t added any anime to your favorites yet. Click the heart icon on any series page!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  {favorites.map((item, idx) => (
                    <div
                      key={`profile-fav-${item.animeId || item.id || idx}-${idx}`}
                      onClick={() => navigate(`/anime/${item.animeSlug}`)}
                      className="group bg-[#07111F] hover:bg-[#081832] border border-white/[0.06] hover:border-[#1683FF]/30 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
                    >
                      <div className="relative aspect-[3/4] w-full bg-[#050A14] overflow-hidden">
                        <img
                          src={item.animePoster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'}
                          alt={item.animeTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromFavorites(item.animeId, e)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center transition-colors"
                          title="Remove from favorites"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>

                      <div className="p-3">
                        <h4 className="text-xs font-bold text-[#F8FAFC] truncate group-hover:text-[#00CFFF] transition-colors">
                          {item.animeTitle}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: SETTINGS & GUEST AUTH                             */}
          {/* ======================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {user ? (
                <div className="space-y-6">
                  {/* Profile Settings */}
                  <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-4">
                    <h3 className="text-base font-bold text-[#F8FAFC]">Profile Customization</h3>

                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-[#030712] rounded-xl border border-white/5">
                      <div className="relative group shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#1683FF] p-0.5 bg-[#050A14]">
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

                      <div className="space-y-1.5 text-center sm:text-left">
                        <div className="text-sm font-bold text-[#F8FAFC]">{displayName}</div>
                        <p className="text-xs text-[#94A3B8]">Choose from official Crunchyroll-style anime avatars</p>
                        <button
                          type="button"
                          onClick={() => setIsAvatarModalOpen(true)}
                          className="text-xs text-[#00CFFF] hover:underline font-semibold flex items-center gap-1 mx-auto sm:mx-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Open Anime Avatar Catalog ({ANIME_AVATARS.length} characters)</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditProfileModalOpen(true)}
                        className="px-4 py-2.5 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#1683FF]/30"
                      >
                        Edit Name & Bio
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsChangePasswordModalOpen(true)}
                        className="px-4 py-2.5 bg-[#081426] hover:bg-[#081832] border border-white/10 text-[#F8FAFC] text-xs font-semibold rounded-xl transition-all"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>

                  {/* Notification & Privacy triggers */}
                  <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-3">
                    <h3 className="text-base font-bold text-[#F8FAFC]">Preferences & Security</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsNotificationModalOpen(true)}
                        className="p-4 bg-[#030712] hover:bg-[#081832] border border-white/5 hover:border-[#1683FF]/30 rounded-xl text-left transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-[#1683FF]" />
                          <div>
                            <div className="text-xs font-bold text-[#F8FAFC]">Notifications</div>
                            <div className="text-[11px] text-[#94A3B8]">Episode releases & alerts</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPrivacyModalOpen(true)}
                        className="p-4 bg-[#030712] hover:bg-[#081832] border border-white/5 hover:border-[#1683FF]/30 rounded-xl text-left transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-[#00CFFF]" />
                          <div>
                            <div className="text-xs font-bold text-[#F8FAFC]">Privacy Settings</div>
                            <div className="text-[11px] text-[#94A3B8]">Public profile visibility</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                      </button>
                    </div>
                  </div>

                  {/* Sign Out Card */}
                  <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl p-5 sm:p-6 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">Account Session</div>
                      <div className="text-[11px] text-[#94A3B8]">Currently signed in as {user.email}</div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 bg-[#FF4D4F]/10 hover:bg-[#FF4D4F] text-[#FF4D4F] hover:text-white border border-[#FF4D4F]/30 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Guest sign in / sign up card */
                <div className="bg-[#07111F] border border-[#1683FF]/30 rounded-2xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#00CFFF]" />
                        <span>Sign In or Create Account</span>
                      </h2>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Sync your anime watchlist and history across all devices.
                      </p>
                    </div>

                    <div className="flex bg-[#030712] p-1 rounded-xl border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setAuthError(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          authTab === 'login'
                            ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          authTab === 'signup'
                            ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Create Account
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5 max-w-lg">
                    {authTab === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Display Name</label>
                        <input
                          type="text"
                          value={authDisplayName}
                          onChange={(e) => setAuthDisplayName(e.target.value)}
                          placeholder="e.g. John Doe"
                          disabled={authSubmitting}
                          className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-[#F8FAFC] text-xs outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Email Address</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="john.doe@example.com"
                        disabled={authSubmitting}
                        className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-[#F8FAFC] text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Password</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={authSubmitting}
                        className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-[#F8FAFC] text-xs outline-none"
                      />
                    </div>

                    {authTab === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Confirm Password</label>
                        <input
                          type="password"
                          value={authConfirmPassword}
                          onChange={(e) => setAuthConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={authSubmitting}
                          className="w-full bg-[#030712] border border-white/10 focus:border-[#1683FF] rounded-xl px-3.5 py-2.5 text-[#F8FAFC] text-xs outline-none"
                        />
                      </div>
                    )}

                    {authTab === 'signup' && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-[#CBD5E1]">
                            Starting Anime Avatar
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAvatarModalOpen(true)}
                            className="text-xs font-semibold text-[#00CFFF] hover:underline"
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
                              className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 transition-all p-0.5 ${
                                authAvatar === av.url
                                  ? 'border-[#00CFFF] scale-110 shadow-md shadow-[#00CFFF]/50'
                                  : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                              }`}
                              title={av.name}
                            >
                              <img
                                src={av.url}
                                alt={av.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover rounded-full"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-3 px-4 bg-[#1683FF] hover:bg-[#2196FF] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1683FF]/30"
                    >
                      {authSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : authTab === 'login' ? (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Sign In to Profile</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Create Profile Account</span>
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

      {/* ======================================================== */}
      {/* MODALS & OVERLAYS                                        */}
      {/* ======================================================== */}
      
      {/* Crunchyroll Anime Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user ? currentAvatarUrl : authAvatar}
        onSelectAvatar={handleAvatarSelect}
        isAdmin={isAdmin}
        onNavigateAdmin={navigate}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onOpenAvatarPicker={() => {
          setIsEditProfileModalOpen(false);
          setIsAvatarModalOpen(true);
        }}
        onShowMessage={onShowMessage}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        userEmail={user?.email || null}
        onShowMessage={onShowMessage}
      />

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onShowMessage={onShowMessage}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onShowMessage={onShowMessage}
      />

      {/* Clear History Confirmation Modal */}
      {isClearHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A1628] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-[#F5F9FF]">Clear Watch History?</h3>
              <p className="text-xs text-[#A9B8CC] leading-relaxed">
                This will clear all {history.length} watched episode checkpoints from your account. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearHistoryModalOpen(false)}
                disabled={clearingHistory}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-[#CBD5E1] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setClearingHistory(true);
                    await clearWatchHistory(user?.uid || null);
                    setHistory([]);
                    setContinueWatchingList([]);
                    setIsClearHistoryModalOpen(false);
                    onShowMessage?.('Watch history cleared.');
                  } catch (err) {
                    console.error('Failed to clear watch history:', err);
                    onShowMessage?.('Failed to clear history. Please try again.');
                  } finally {
                    setClearingHistory(false);
                  }
                }}
                disabled={clearingHistory}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
              >
                {clearingHistory ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
