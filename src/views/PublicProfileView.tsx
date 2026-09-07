import React, { useEffect, useState } from 'react';
import type { UserProfile } from '../types/user';
import type { AnimeFollowItem, UserBadge } from '../types/library';
import { getUserProfileById } from '../lib/firestore/admin-users';
import { getUserFollowedAnimes } from '../lib/firestore/follows';
import { calculateUserBadges } from '../lib/badges';
import { UserBadgePill } from '../components/community/UserBadgePill';
import {
  User,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Bell,
  Award,
} from 'lucide-react';

interface PublicProfileViewProps {
  userId: string;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  userId,
  navigate,
  onShowMessage,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followedAnimes, setFollowedAnimes] = useState<AnimeFollowItem[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPublicData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profData, follows] = await Promise.all([
          getUserProfileById(userId),
          getUserFollowedAnimes(userId),
        ]);

        if (!profData) {
          if (isMounted) setError('User profile not found.');
          return;
        }

        if (isMounted) {
          setProfile(profData);
          setFollowedAnimes(follows);

          const computedBadges = calculateUserBadges({
            watchlistCount: 3,
            completedCount: 1,
            favoritesCount: 2,
            historyCount: 5,
            commentsCount: 3,
            role: profData.role,
            createdAt: profData.createdAt,
          });
          setBadges(computedBadges);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching public user profile:', err);
          setError('Failed to load user profile.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPublicData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-[#A9B8CC] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A8FF]" />
        <p className="text-xs font-semibold">Loading community profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-6 rounded-2xl">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h2 className="text-base font-bold mb-1">{error || 'User Not Found'}</h2>
          <button
            type="button"
            onClick={() => navigate(-1 as any)}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
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
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return `Joined ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1 as any)}
        className="inline-flex items-center gap-2 text-xs font-bold text-[#A9B8CC] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Profile Header Card */}
      <div className="bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#0066FF]/20 border border-[#00A8FF]/40 overflow-hidden flex items-center justify-center text-[#00D9FF] text-2xl font-black shadow-lg shadow-[#00A8FF]/20 shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName || 'User avatar'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#F5F9FF]">
                  {profile.displayName || profile.email?.split('@')[0] || 'Zynox Member'}
                </h1>

                {profile.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#00A8FF]/20 border border-[#00A8FF]/40 rounded-full text-[10px] text-[#00D9FF] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                )}
                {profile.role === 'moderator' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded-full text-[10px] text-blue-400 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Moderator</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#A9B8CC] mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatJoinDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio ? (
          <div className="bg-[#0D1B2E] border border-white/5 rounded-2xl p-4 text-xs text-[#A9B8CC] leading-relaxed">
            {profile.bio}
          </div>
        ) : (
          <div className="bg-[#0D1B2E] border border-white/5 rounded-2xl p-4 text-xs text-[#6E7F95] italic">
            No bio provided yet.
          </div>
        )}

        {/* Earned Community Badges */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#F5F9FF] uppercase tracking-wider">
            <Award className="w-4 h-4 text-[#00A8FF]" />
            <span>Community Badges &amp; Achievements</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <UserBadgePill key={b.id} badge={b} size="md" />
            ))}
          </div>
        </div>
      </div>

      {/* Followed Anime Section */}
      <div className="bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#00A8FF]" />
            <h2 className="text-base font-bold text-[#F5F9FF]">Followed Anime Series</h2>
          </div>
          <span className="text-xs text-[#A9B8CC] font-mono">
            {followedAnimes.length} titles
          </span>
        </div>

        {followedAnimes.length === 0 ? (
          <p className="text-xs text-[#6E7F95] py-4 text-center">
            This user hasn&apos;t followed any anime series yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {followedAnimes.map((fa) => (
              <div
                key={fa.id || fa.animeId}
                onClick={() => navigate(`/anime/${fa.animeSlug}`)}
                className="bg-[#0D1B2E] border border-white/5 hover:border-[#00A8FF]/50 rounded-2xl overflow-hidden cursor-pointer group transition-all shadow-lg hover:bg-[#11243C]"
              >
                <div className="aspect-[3/4] bg-[#06101F] relative overflow-hidden">
                  {fa.animePoster ? (
                    <img
                      src={fa.animePoster}
                      alt={fa.animeTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6E7F95]">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-xs font-bold text-[#F5F9FF] group-hover:text-[#00D9FF] truncate transition-colors">
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
