import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { isFollowingAnime, followAnime, unfollowAnime } from '../lib/firestore/follows';
import type { Anime } from '../types/anime';
import { Bell, BellRing, Check, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  anime: Anime;
  onShowMessage: (msg: string) => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  anime,
  onShowMessage,
  className = '',
}) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user?.uid && anime?.id) {
      isFollowingAnime(user.uid, anime.id).then((isF) => {
        if (isMounted) setFollowing(isF);
      });
    } else {
      setFollowing(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user?.uid, anime?.id]);

  const handleToggle = async () => {
    if (!user) {
      onShowMessage('Please sign in to follow this anime for new episode releases.');
      return;
    }
    if (!anime.id) return;

    setLoading(true);
    const nextFollowing = !following;
    setFollowing(nextFollowing);

    try {
      if (nextFollowing) {
        await followAnime({
          userId: user.uid,
          animeId: anime.id,
          animeTitle: anime.title,
          animeSlug: anime.slug,
          animePoster: anime.poster,
        });
        onShowMessage(`Following "${anime.title}". You'll receive alerts on new episodes!`);
      } else {
        await unfollowAnime(user.uid, anime.id);
        onShowMessage(`Unfollowed "${anime.title}".`);
      }
    } catch (err: any) {
      setFollowing(!nextFollowing);
      onShowMessage('Failed to update follow status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id={`btn-follow-anime-${anime.slug}`}
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all select-none shadow-md ${
        following
          ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-white hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300'
          : 'bg-[#171720] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10'
      } ${className}`}
      title={following ? 'Click to unfollow' : 'Follow for new episode notifications'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
      ) : following ? (
        <>
          <BellRing className="w-4 h-4 text-[#8B5CF6]" />
          <span>Following</span>
          <Check className="w-3 h-3 text-[#8B5CF6]" />
        </>
      ) : (
        <>
          <Bell className="w-4 h-4 text-zinc-400" />
          <span>Follow Anime</span>
        </>
      )}
    </button>
  );
};
