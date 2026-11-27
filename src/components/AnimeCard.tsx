import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Anime } from '../types/anime';
import { Star, Play, Heart, Bookmark, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { WatchlistStatus } from '../types/library';
import {
  toggleFavorite,
  setWatchlistStatus as updateWatchlistStatus,
  removeFromWatchlist,
  isFavoriteCached,
  getAnimeWatchlistStatusCached,
} from '../lib/firestore/user-activity';
import { cleanAnimeTitle, getAnimeUploadTimestamp } from '../lib/firestore/anime';
import { formatCardAudioLabel, formatCardEpisodesBadge } from '../lib/format-meta';
import {
  getOptimizedImageUrl,
  getOptimizedPosterSrcSet,
  POSTER_IMAGE_SIZES,
  FALLBACK_ANIME_POSTER,
  isImagePreloaded,
  markImagePreloaded,
} from '../lib/image-optimizer';

interface AnimeCardProps {
  anime: Anime;
  navigate: (path: string) => void;
  showRankingBadge?: number;
  onShowMessage?: (msg: string) => void;
  progressPercentage?: number;
  priority?: boolean;
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  navigate,
  onShowMessage,
  progressPercentage,
  priority = false,
}) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const optimizedPoster = getOptimizedImageUrl(anime.poster, { width: 240, fallbackType: 'poster' });
  const posterSrcSet = getOptimizedPosterSrcSet(anime.poster);
  const [imageLoaded, setImageLoaded] = useState(() => isImagePreloaded(optimizedPoster));
  const [isHovered, setIsHovered] = useState(false);
  const [popoverAlign, setPopoverAlign] = useState<'left' | 'right'>('right');

  const [fav, setFav] = useState<boolean>(() => {
    return isFavoriteCached(anime.id || anime.slug);
  });
  const [watchlistStatus, setWatchlistStatusState] = useState<WatchlistStatus | null>(() => {
    return getAnimeWatchlistStatusCached(anime.id || anime.slug);
  });

  useLayoutEffect(() => {
    if (isImagePreloaded(optimizedPoster) || (imgRef.current?.complete && imgRef.current.naturalWidth > 0)) {
      markImagePreloaded(optimizedPoster);
      setImageLoaded(true);
    } else {
      setImageLoaded(false);
    }
  }, [optimizedPoster]);

  useEffect(() => {
    setFav(isFavoriteCached(anime.id || anime.slug));
    setWatchlistStatusState(getAnimeWatchlistStatusCached(anime.id || anime.slug));
  }, [user?.uid, anime.id, anime.slug]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

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
      setWatchlistStatusState(null);
      try {
        await removeFromWatchlist(user?.uid || null, animeKey);
        onShowMessage?.('Removed from Watchlist');
      } catch {
        setWatchlistStatusState(watchlistStatus);
        onShowMessage?.('Failed to update watchlist');
      }
    } else {
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

  const handleMouseEnter = () => {
    if (cardRef.current && window.innerWidth >= 1024) {
      const rect = cardRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      if (rect.right + popoverWidth > window.innerWidth - 20) {
        setPopoverAlign('left');
      } else {
        setPopoverAlign('right');
      }
    }
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 240);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(false);
  };

  const handleCardClick = () => {
    const targetSlug = (anime.slug || anime.id || '').trim();
    if (!targetSlug) return;
    navigate(
      anime.activeSeasonNumber
        ? `/anime/${encodeURIComponent(targetSlug)}?season=${anime.activeSeasonNumber}`
        : `/anime/${encodeURIComponent(targetSlug)}`
    );
  };

  const ratingValue = anime.rating ? Number(anime.rating).toFixed(1) : '8.5';
  const releaseYear = anime.year || 2026;
  const animeType = anime.type || 'TV';
  const epBadge = formatCardEpisodesBadge(anime);
  const epFormatted = epBadge.fullLabel;
  const displayLanguage = formatCardAudioLabel(anime);
  const cleanTitle = cleanAnimeTitle(anime.title);
  const uploadTs = getAnimeUploadTimestamp(anime);
  const isNewWithin7Days = uploadTs > 0 && Date.now() - uploadTs <= 7 * 24 * 60 * 60 * 1000;

  return (
    <div
      ref={cardRef}
      id={`anime-card-${anime.slug}${anime.activeSeasonNumber ? `-s${anime.activeSeasonNumber}` : ''}`}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => {
        if (!imageLoaded) markImagePreloaded(optimizedPoster);
      }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className="group relative cursor-pointer flex flex-col select-none transition-transform duration-150 lg:hover:scale-[1.03] will-change-transform min-w-0"
    >
      {/* Poster Image Container - 2:3 Aspect Ratio, 10px radius */}
      <div className="relative aspect-[2/3] w-full bg-[#0B1324] rounded-[10px] overflow-hidden border border-white/10 group-hover:border-[#1E88FF]/60 transition-colors duration-150">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#0B1324] animate-pulse" />
        )}

        {/* Poster Image (<= 240px width, lazy, async) */}
        {anime.poster ? (
          <img
            ref={imgRef}
            src={optimizedPoster}
            srcSet={posterSrcSet}
            sizes={posterSrcSet ? POSTER_IMAGE_SIZES : undefined}
            alt={cleanTitle}
            width={160}
            height={240}
            loading="lazy"
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoad={() => {
              markImagePreloaded(optimizedPoster);
              setImageLoaded(true);
            }}
            className="relative w-full h-full object-cover select-none pointer-events-none"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.srcset = '';
              if (target.src !== FALLBACK_ANIME_POSTER) {
                target.src = FALLBACK_ANIME_POSTER;
                setImageLoaded(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#94A3B8] bg-[#0B1324] font-bold text-[10px] tracking-widest uppercase">
            ZYNOX
          </div>
        )}

        {/* Minimal 8px NEW dot top-right ONLY for items added within 7 days */}
        {isNewWithin7Days && (
          <span
            aria-label="New release"
            title="New"
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1E88FF] ring-2 ring-[#050A14] pointer-events-none"
          />
        )}

        {/* Total Episodes Badge at Bottom-Right Corner */}
        <span
          aria-label={epBadge.prefix ? `${epBadge.count} total episodes` : epBadge.fullLabel}
          className={`absolute ${
            progressPercentage !== undefined && progressPercentage > 0 ? 'bottom-2' : 'bottom-1.5'
          } right-1.5 z-10 inline-flex items-center gap-[3px] px-1.5 py-[2px] rounded-[5px] bg-[#050A14] border border-[#243B61] text-[10px] font-bold leading-[13px] tracking-tight text-white shadow-[0_2px_6px_rgba(0,0,0,0.85)] pointer-events-none`}
        >
          {epBadge.prefix && <span className="text-[#3B9BFF]">{epBadge.prefix}</span>}
          <span className="tabular-nums">{epBadge.count}</span>
        </span>

        {/* Progress Bar (only when provided) */}
        {progressPercentage !== undefined && progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/60 overflow-hidden">
            <div
              className="h-full bg-[#1E88FF]"
              style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
            />
          </div>
        )}
      </div>

      {/* ONLY 2 compact lines below poster: Line 1 = 12px/600 lh 16px, Line 2 = 11px muted "Hindi Dub · ★ 8.5" */}
      <div className="mt-[6px] min-w-0 space-y-0.5">
        <h3
          title={cleanTitle}
          className="text-[12px] font-semibold leading-[16px] text-white truncate group-hover:text-[#1E88FF] transition-colors duration-150"
        >
          {cleanTitle}
        </h3>

        <p className="text-[11px] leading-[15px] text-[#94A3B8] font-normal truncate flex items-center gap-1 min-w-0">
          <span className="truncate">{displayLanguage}</span>
          <span className="shrink-0">·</span>
          <Star className="w-2.5 h-2.5 text-[#F59E0B] fill-[#F59E0B] shrink-0" />
          <span className="shrink-0 tabular-nums">{ratingValue}</span>
        </p>
      </div>

      {/* Desktop Hover Popover (stays inside viewport) */}
      {isHovered && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`hidden lg:block absolute top-0 ${
            popoverAlign === 'left' ? 'right-full mr-3' : 'left-full ml-3'
          } w-[280px] bg-[#0B1324] border border-white/15 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/80`}
        >
          <div className="space-y-1 pb-2 border-b border-white/10">
            <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
              {cleanTitle}
            </h4>
            {anime.altTitles?.[0] && (
              <p className="text-[11px] text-[#94A3B8] line-clamp-1 italic">
                {anime.altTitles[0]}
              </p>
            )}
          </div>

          <div className="py-2 flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              <span>{ratingValue}</span>
            </span>
            <span>{animeType}</span>
            <span>{epFormatted}</span>
            <span>{releaseYear}</span>
          </div>

          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-2">
              {anime.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-md bg-[#101A30] text-[#CBD5E1] text-[10px] font-medium border border-white/5"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-[#94A3B8] line-clamp-3 leading-relaxed pb-3">
            {anime.description || (anime as any).synopsis || 'Stream this high definition anime series on ZYNOX ANIME with multi-audio dubbed and subbed.'}
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleCardClick}
              className="flex-1 h-9 px-3 bg-[#1E88FF] hover:bg-[#1570d8] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch Now</span>
            </button>

            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`p-2 rounded-xl border transition-all ${
                fav
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
              title={fav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleWatchlistToggle}
              className={`p-2 rounded-xl border transition-all ${
                watchlistStatus
                  ? 'bg-[#1E88FF] border-[#1E88FF] text-white'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
              title={watchlistStatus ? 'In Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${watchlistStatus ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AnimeCard = React.memo(AnimeCardComponent);
