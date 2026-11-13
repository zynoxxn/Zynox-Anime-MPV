import React, { useEffect, useState, useCallback } from 'react';
import type { UserProfile } from '../types/user';
import type { AnimeFollowItem, UserBadge } from '../types/library';
import { getUserProfileById } from '../lib/firestore/admin-users';
import { getUserFollowedAnimes } from '../lib/firestore/follows';
import { calculateUserBadges } from '../lib/badges';
import { UserBadgePill } from '../components/community/UserBadgePill';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowLeft,
  Bell,
  Award,
} from 'lucide-react';

interface PublicProfileViewProps {
  userId: string;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  userId,
  navigate,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followedAnimes, setFollowedAnimes] = useState<AnimeFollowItem[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    profile?.displayName || profile?.email?.split('@')[0] || 'Zynox Member';

  usePageSeo({
    title: profile ? `${displayName} | ZYNOX ANIME` : 'User Profile | ZYNOX ANIME',
    description: profile?.bio || `Community profile for ${displayName} on ZYNOX ANIME.`,
  });

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const fetchPublicData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profData, follows] = await Promise.all([
        getUserProfileById(userId),
        getUserFollowedAnimes(userId),
      ]);

      if (!profData) {
        setError('User profile not found.');
        return;
      }

      setProfile(profData);
      setFollowedAnimes(follows);

      const computedBadges = calculateUserBadges({
        watchlistCount: follows.length,
        completedCount: 0,
        favoritesCount: 0,
        historyCount: 0,
        commentsCount: 0,
        role: profData.role,
        createdAt: profData.createdAt,
      });
      setBadges(computedBadges);
    } catch (err) {
      console.error('Error fetching public user profile:', err);
      setError('Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8 space-y-6">
        <div className="h-44 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse" />
        <div className="h-56 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-4">
        <ErrorState
          title={error === 'User profile not found.' ? 'User Not Found' : 'Profile Unavailable'}
          message={error || 'User profile not found.'}
          onRetry={error !== 'User profile not found.' ? fetchPublicData : undefined}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoBack}
            className="h-10 px-4 bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  const initial = (profile.displayName || profile.email || 'U').charAt(0).toUpperCase();

  const formatJoinDate = (ts: any) => {
    if (!ts) return 'Member';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(date.getTime())) return 'Member';
      return `Joined ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Member';
    }
  };

  const roleStr = String(profile.role || 'user').toLowerCase();
  const isStaff =
    roleStr === 'super_admin' ||
    roleStr === 'superadmin' ||
    roleStr === 'admin' ||
    roleStr === 'editor' ||
    roleStr === 'moderator';

  const roleBadgeText =
    roleStr === 'super_admin' || roleStr === 'superadmin'
      ? 'Super Admin'
      : roleStr === 'admin'
      ? 'Admin'
      : roleStr === 'editor'
      ? 'Editor'
      : 'Moderator';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Profile Card */}
      <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#101A30] border-2 border-[#1E88FF] overflow-hidden flex items-center justify-center text-[#1E88FF] text-2xl font-black shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {displayName}
              </h1>

              {isStaff && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#1E88FF]/15 border border-[#1E88FF]/30 rounded-full text-[11px] text-[#1E88FF] font-semibold shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{roleBadgeText}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatJoinDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-[#101A30] border border-white/5 rounded-xl p-4 text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
          {profile.bio ? (
            profile.bio
          ) : (
            <span className="text-[#64748B] italic">No bio provided yet.</span>
          )}
        </div>

        {/* Community Badges */}
        {badges.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Award className="w-4 h-4 text-[#1E88FF]" />
              <span>Community Badges</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <UserBadgePill key={b.id} badge={b} size="md" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Followed Anime Section */}
      <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-[#1E88FF] shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              Followed Anime
            </h2>
          </div>
          <span className="text-xs text-[#94A3B8] font-mono shrink-0">
            {followedAnimes.length} titles
          </span>
        </div>

        {followedAnimes.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-[#1E88FF]" />}
            title="No followed anime"
            description="This user has not followed any anime series yet."
            className="p-6 sm:p-8"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {followedAnimes.map((fa) => (
              <div
                key={fa.id || fa.animeId}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/anime/${fa.animeSlug}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/anime/${fa.animeSlug}`);
                  }
                }}
                className="bg-[#101A30] border border-white/10 hover:border-[#1E88FF]/50 rounded-xl overflow-hidden cursor-pointer group transition-colors min-w-0"
              >
                <div className="aspect-[2/3] bg-[#050A14] relative overflow-hidden">
                  <img
                    src={fa.animePoster || FALLBACK_POSTER}
                    alt={fa.animeTitle}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-semibold text-white group-hover:text-[#1E88FF] truncate transition-colors">
                    {fa.animeTitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
