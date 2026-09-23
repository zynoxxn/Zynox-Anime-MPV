import React, { useState, useEffect } from 'react';
import type { Anime } from '../types/anime';
import { Star, Play, Heart, Bookmark } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { WatchlistStatus } from '../types/library';
import {
  toggleFavorite,
  setWatchlistStatus as updateWatchlistStatus,
  removeFromWatchlist,
  isFavoriteCached,
  getAnimeWatchlistStatusCached,
} from '../lib/firestore/user-activity';

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

  return (
    <div
      id={`anime-card-${anime.slug}${anime.activeSeasonNumber ? `-s${anime.activeSeasonNumber}` : ''}`}
      onClick={() =>
        navigate(
          anime.activeSeasonNumber
            ? `/anime/${anime.slug}?season=${anime.activeSeasonNumber}`
            : `/anime/${anime.slug}`
        )
      }
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className="group relative cursor-pointer flex flex-col transition-transform duration-200 hover:-translate-y-1 will-change-transform select-none"
    >
      {/* Poster Image Container - 2:3 Aspect Ratio with compact rounded corners */}
      <div className="relative aspect-[2/3] bg-[#081426] rounded-lg sm:rounded-xl overflow-hidden border border-white/5 group-hover:border-[#1683FF]/40 transition-colors shadow-sm">
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
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6E7F95] bg-[#050A14] font-bold text-[9px] uppercase">
            ZYNOX
          </div>
        )}

        {/* Season Badge Pill (if season-specific result) */}
        {anime.activeSeasonNumber && (
          <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1683FF] text-[9px] font-black text-white shadow-md leading-none border border-white/20">
              S{anime.activeSeasonNumber}
            </span>
          </div>
        )}

        {/* Subtle Dark Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 opacity-80 group-hover:opacity-40 transition-opacity pointer-events-none" />

        {/* Bottom-Left Star Rating (e.g. ★ 9.4) - Compact */}
        <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] sm:text-[10px] font-bold text-amber-400 border border-white/10 shadow-sm leading-none">
            <Star className="w-2.5 h-2.5 fill-amber-400 shrink-0" />
            <span className="text-white">{ratingValue}</span>
          </span>
        </div>

        {/* Desktop Quick Action Buttons (Favorite & Watchlist on Hover) */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            type="button"
            onClick={handleFavoriteClick}
            className={`p-1 rounded-md backdrop-blur-md transition-all ${
              fav
                ? 'bg-rose-500 text-white'
                : 'bg-black/60 text-white hover:bg-[#1683FF] border border-white/10'
            }`}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-2.5 h-2.5 ${fav ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleWatchlistToggle}
            className={`p-1 rounded-md backdrop-blur-md transition-all ${
              watchlistStatus
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/40'
                : 'bg-black/60 text-white hover:bg-[#1683FF] border border-white/10'
            }`}
            title={watchlistStatus ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Bookmark className={`w-2.5 h-2.5 ${watchlistStatus ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-[#1683FF] text-white flex items-center justify-center shadow-md shadow-[#1683FF]/40 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200">
            <Play className="w-3 h-3 fill-white ml-0.5" />
          </div>
        </div>

        {/* Progress Bar (if provided) */}
        {progressPercentage !== undefined && progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1683FF] to-[#00CFFF]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Title & Year Below Poster - Compact typography */}
      <div className="pt-1.5 flex flex-col gap-0.5">
        <h3 className="font-bold text-[11px] sm:text-xs text-white truncate group-hover:text-[#00CFFF] transition-colors leading-snug">
          {anime.title}
        </h3>
        <span className="text-[10px] text-[#94A3B8]">
          {releaseYear}
        </span>
      </div>
    </div>
  );
};

export const AnimeCard = React.memo(AnimeCardComponent);
