import React, { useState, useEffect, useRef } from 'react';
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
import { cleanAnimeTitle } from '../lib/firestore/anime';
import {
  getOptimizedImageUrl,
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
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  navigate,
  onShowMessage,
  progressPercentage,
}) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const optimizedPoster = getOptimizedImageUrl(anime.poster, { width: 340, fallbackType: 'poster' });
  const [imageLoaded, setImageLoaded] = useState(() => isImagePreloaded(optimizedPoster));
  const [isHovered, setIsHovered] = useState(false);
  const [popoverAlign, setPopoverAlign] = useState<'left' | 'right'>('right');

  const [fav, setFav] = useState<boolean>(() => {
    return isFavoriteCached(anime.id || anime.slug);
  });
  const [watchlistStatus, setWatchlistStatusState] = useState<WatchlistStatus | null>(() => {
    return getAnimeWatchlistStatusCached(anime.id || anime.slug);
  });

  useEffect(() => {
    if (isImagePreloaded(optimizedPoster)) {
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
  const rawEpisodes = anime.totalEpisodes || (anime as any).episodesCount || (anime.type === 'Movie' ? 'Movie' : '12');
  const epFormatted = typeof rawEpisodes === 'number' ? `EP ${rawEpisodes}` : String(rawEpisodes).startsWith('EP') ? rawEpisodes : `EP ${rawEpisodes}`;

  // Audio label calculation
  const rawAudio = (anime.audioLanguage || '').toLowerCase();
  const hasSub = (anime as any).hasSub !== false;
  const hasDub = Boolean((anime as any).hasDub || rawAudio.includes('dub') || rawAudio.includes('english'));
  const hasHindi = Boolean(
    (anime as any).hasHindiDub ||
    rawAudio.includes('hindi') ||
    anime.languages?.some((l) => l.toLowerCase().includes('hindi'))
  );
  const displayLanguage = (() => {
    if (anime.audioLanguage && anime.audioLanguage.trim()) {
      const trimmed = anime.audioLanguage.trim();
      if (trimmed.toLowerCase() === 'hindi') return 'Hindi Dub';
      if (trimmed.length > 18) {
        if (trimmed.toLowerCase().includes('hindi')) return 'Hindi Dub';
        if (trimmed.toLowerCase().includes('multi')) return 'Multi Audio';
      }
      return trimmed;
    }
    if ((anime as any).language && typeof (anime as any).language === 'string' && (anime as any).language.trim()) {
      const trimmed = (anime as any).language.trim();
      if (trimmed.toLowerCase() === 'hindi') return 'Hindi Dub';
      return trimmed;
    }
    if (anime.audioTags && anime.audioTags.length > 0) {
      return anime.audioTags[0];
    }
    if (hasHindi) return 'Hindi Dub';
    if (hasDub && hasSub) return 'Sub / Dub';
    if (hasDub) return 'Dub';
    return 'Sub';
  })();

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
      className="group relative cursor-pointer flex flex-col select-none transition-transform duration-200 lg:hover:scale-[1.04] will-change-transform"
    >
      {/* Poster Image Container - 2:3 Aspect Ratio */}
      <div className="relative aspect-[2/3] w-full bg-[#0B1324] rounded-xl sm:rounded-2xl overflow-hidden border border-white/5 group-hover:border-[#1E88FF]/50 transition-all duration-200 shadow-md">
        
        {/* Shimmer loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#0B1324] animate-pulse flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-[#1E88FF] animate-spin opacity-50" />
          </div>
        )}

        {/* Poster Image */}
        {anime.poster ? (
          <img
            src={optimizedPoster}
            alt={anime.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoad={() => {
              markImagePreloaded(optimizedPoster);
              setImageLoaded(true);
            }}
            className={`w-full h-full object-cover transition-opacity duration-200 select-none pointer-events-none ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== FALLBACK_ANIME_POSTER) {
                target.src = FALLBACK_ANIME_POSTER;
                setImageLoaded(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#64748B] bg-[#050A14] font-bold text-[10px] tracking-widest uppercase">
            ZYNOX
          </div>
        )}

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-md transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Progress Bar (if provided in Continue Watching) */}
        {progressPercentage !== undefined && progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1E88FF] to-[#00CFFF]"
              style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
            />
          </div>
        )}
      </div>

      {/* Content BELOW the poster: Title + Anime Language & Rating */}
      <div className="pt-1.5 min-w-0 space-y-0.5">
        <h3
          title={cleanAnimeTitle(anime.title)}
          className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#00CFFF] transition-colors leading-tight"
        >
          {cleanAnimeTitle(anime.title)}
        </h3>

        {/* Anime Title ke niche: Language & Rating */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] leading-none min-w-0">
          <span className="text-[#00CFFF] font-semibold truncate">
            {displayLanguage}
          </span>
          <span className="text-white/30 shrink-0">·</span>
          <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold shrink-0">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{ratingValue}</span>
          </span>
        </div>
      </div>

      {/* Desktop Hover Popover (stays inside viewport) */}
      {isHovered && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`hidden lg:block absolute top-0 ${
            popoverAlign === 'left' ? 'right-full mr-3' : 'left-full ml-3'
          } w-[280px] bg-[#0B1324] border border-[#1E88FF]/40 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/80`}
        >
          <div className="space-y-1 pb-2 border-b border-white/10">
            <h4 className="text-sm font-black text-white leading-snug line-clamp-2">
              {cleanAnimeTitle(anime.title)}
            </h4>
            {anime.altTitles?.[0] && (
              <p className="text-[11px] text-[#94A3B8] line-clamp-1 italic">
                {anime.altTitles[0]}
              </p>
            )}
          </div>

          <div className="py-2 flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
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
                  className="px-2 py-0.5 rounded-md bg-[#101A30] text-[#00CFFF] text-[10px] font-medium border border-white/5"
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
