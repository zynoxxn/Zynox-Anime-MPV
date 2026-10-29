import React, { useState, useEffect } from 'react';
import type { Anime } from '../types/anime';
import { Star, Play, Heart, Bookmark, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { WatchlistStatus } from '../types/library';
import {
  toggleFavorite,
  setWatchlistStatus as updateWatchlistStatus,
  removeFromWatchlist,
  isFavoriteCached,
  getAnimeWatchlistStatusCached,
} from '../lib/firestore/user-activity';
import { cleanAnimeTitle } from '../lib/firestore/anime';

interface AnimeCardProps {
  anime: Anime;
  navigate: (path: string) => void;
  showRankingBadge?: number;
  onShowMessage?: (msg: string) => void;
  progressPercentage?: number;
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  navigate,
  onShowMessage,
  progressPercentage,
}) => {
  const { user } = useAuth();
  const [fav, setFav] = useState<boolean>(() => {
    return isFavoriteCached(anime.id || anime.slug);
  });
  const [watchlistStatus, setWatchlistStatusState] = useState<WatchlistStatus | null>(() => {
    return getAnimeWatchlistStatusCached(anime.id || anime.slug);
  });

  // Sync state if user changes
  useEffect(() => {
    setFav(isFavoriteCached(anime.id || anime.slug));
    setWatchlistStatusState(getAnimeWatchlistStatusCached(anime.id || anime.slug));
  }, [user?.uid, anime.id, anime.slug]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onShowMessage?.('Please sign in to add to favorites');
      return;
    }
    const nextFav = !fav;
    setFav(nextFav);
    try {
      await toggleFavorite(
        user.uid,
        anime.id || anime.slug,
        anime.slug,
        anime.title,
        anime.poster,
        anime.genres || []
      );
      onShowMessage?.(nextFav ? 'Added to favorites!' : 'Removed from favorites');
    } catch {
      setFav(!nextFav);
      onShowMessage?.('Failed to update favorite status');
    }
  };

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const animeKey = anime.id || anime.slug;
    if (watchlistStatus) {
      // Remove from watchlist
      setWatchlistStatusState(null);
      try {
        await removeFromWatchlist(user?.uid || null, animeKey);
        onShowMessage?.('Removed from Watchlist');
      } catch {
        setWatchlistStatusState(watchlistStatus);
        onShowMessage?.('Failed to update watchlist');
      }
    } else {
      // Add directly to watchlist
      const newStatus: WatchlistStatus = 'watching';
      setWatchlistStatusState(newStatus);
      try {
        await updateWatchlistStatus(
          user?.uid || null,
          animeKey,
          anime.slug,
          anime.title,
          anime.poster,
          newStatus,
          anime.genres || [],
          anime.rating || 0
        );
        onShowMessage?.('Added to Watchlist!');
      } catch {
        setWatchlistStatusState(null);
        onShowMessage?.('Failed to update watchlist');
      }
    }
  };

  const ratingValue = anime.rating ? Number(anime.rating).toFixed(1) : '9.0';
  const releaseYear = anime.year || 2024;
  const isUpcoming = anime.status === 'upcoming' || Boolean(anime.isUpcoming);

  return (
    <div
      id={`anime-card-${anime.slug}${anime.activeSeasonNumber ? `-s${anime.activeSeasonNumber}` : ''}`}
      onClick={() => {
        const targetSlug = (anime.slug || anime.id || '').trim();
        if (!targetSlug) return;
        navigate(
          anime.activeSeasonNumber
            ? `/anime/${encodeURIComponent(targetSlug)}?season=${anime.activeSeasonNumber}`
            : `/anime/${encodeURIComponent(targetSlug)}`
        );
      }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className="group relative cursor-pointer flex flex-col transition-transform duration-200 hover:-translate-y-1 will-change-transform select-none"
    >
      {/* Poster Image Container - 2:3 Aspect Ratio with rounded corners */}
      <div className="relative aspect-[2/3] bg-[#081426] rounded-xl sm:rounded-2xl overflow-hidden border border-white/5 group-hover:border-[#1683FF]/50 transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:shadow-[#1683FF]/10">
        {anime.poster ? (
          <img
            src={anime.poster}
            alt={anime.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out select-none pointer-events-none"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const fallbackUrl = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80';
              if (target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6E7F95] bg-[#050A14] font-bold text-[10px] uppercase">
            ZYNOX
          </div>
        )}

        {/* Season & Upcoming Badge Pills on Poster */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none flex items-center gap-1">
          {anime.activeSeasonNumber && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1683FF] text-[10px] font-black text-white shadow-md leading-none border border-white/20">
              S{anime.activeSeasonNumber}
            </span>
          )}
          {isUpcoming && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-black uppercase shadow-md leading-none">
              <Clock className="w-3 h-3" />
              <span>Upcoming</span>
            </span>
          )}
        </div>

        {/* Subtle Dark Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-40 transition-opacity pointer-events-none" />

        {/* Bottom-Left Star Rating (e.g. ★ 9.4) */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] sm:text-xs font-bold text-amber-400 border border-white/10 shadow-sm leading-none">
            <Star className="w-3 h-3 fill-amber-400 shrink-0" />
            <span className="text-white">{ratingValue}</span>
          </span>
        </div>

        {/* Desktop Quick Action Buttons (Favorite & Watchlist on Hover) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            type="button"
            onClick={handleFavoriteClick}
            className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
              fav
                ? 'bg-rose-500 text-white'
                : 'bg-black/70 text-white hover:bg-[#1683FF] border border-white/10'
            }`}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleWatchlistToggle}
            className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
              watchlistStatus
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/40'
                : 'bg-black/70 text-white hover:bg-[#1683FF] border border-white/10'
            }`}
            title={watchlistStatus ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${watchlistStatus ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#1683FF] text-white flex items-center justify-center shadow-xl shadow-[#1683FF]/50 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Progress Bar (if provided) */}
        {progressPercentage !== undefined && progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1683FF] to-[#00CFFF]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Title & Year Below Poster */}
      <div className="pt-2 flex flex-col gap-0.5">
        <h3 className="font-bold text-xs sm:text-sm md:text-[14px] text-white truncate group-hover:text-[#00CFFF] transition-colors leading-snug">
          {cleanAnimeTitle(anime.title)}
        </h3>
        <span className="text-[11px] sm:text-xs text-[#94A3B8]">
          {releaseYear}
        </span>
      </div>
    </div>
  );
};

export const AnimeCard = React.memo(AnimeCardComponent);
