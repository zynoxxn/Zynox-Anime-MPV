import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Anime } from '../types/anime';
import type { CmsHeroBanner } from '../types/cms';
import type { WatchProgress } from '../types/library';
import { Play, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getAnimeWatchlistStatusCached,
  setWatchlistStatus as updateWatchlistStatus,
  removeFromWatchlist,
} from '../lib/firestore/user-activity';
import { cleanAnimeTitle } from '../lib/firestore/anime';
import {
  getOptimizedImageUrl,
  FALLBACK_ANIME_BANNER,
  getHeroBlurPlaceholder,
  getHeroBannerWidth,
  isImagePreloaded,
  markImagePreloaded,
  preloadImages,
} from '../lib/image-optimizer';

export type HeroItem = Anime | CmsHeroBanner | Record<string, any>;

interface HeroBannerProps {
  featuredAnimes: HeroItem[];
  navigate: (path: string) => void;
  catalogAnimes?: Anime[];
  continueWatching?: WatchProgress[];
  onShowMessage?: (msg: string) => void;
}

const SLIDE_DURATION = 6000;

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredAnimes,
  navigate,
  catalogAnimes = [],
  continueWatching = [],
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(() => new Set([0]));
  const [loadedUrls, setLoadedUrls] = useState<Record<string, boolean>>({});
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [watchlistPending, setWatchlistPending] = useState(false);

  // Touch swipe tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const displaySlides = useMemo(
    () => (featuredAnimes || []).filter(Boolean).slice(0, 8),
    [featuredAnimes]
  );

  // Clamp index if slide count changes
  useEffect(() => {
    if (displaySlides.length > 0 && currentIndex >= displaySlides.length) {
      setCurrentIndex(0);
    }
  }, [displaySlides.length, currentIndex]);

  const heroWidth = getHeroBannerWidth();

  // Build lookup map for catalog metadata (genres, synopsis, poster, id)
  const catalogLookup = useMemo(() => {
    const map = new Map<string, Anime>();
    for (const a of catalogAnimes) {
      if (a.id) map.set(a.id.toLowerCase(), a);
      if (a.slug) map.set(a.slug.toLowerCase(), a);
      if (a.title) map.set(cleanAnimeTitle(a.title).toLowerCase(), a);
    }
    return map;
  }, [catalogAnimes]);

  // Build continue watching lookup by animeId / animeSlug
  const progressLookup = useMemo(() => {
    const map = new Map<string, WatchProgress>();
    for (const p of continueWatching) {
      if (p.animeId) map.set(p.animeId.toLowerCase(), p);
      if (p.animeSlug) map.set(p.animeSlug.toLowerCase(), p);
    }
    return map;
  }, [continueWatching]);

  const resolveSlideBannerUrl = useCallback(
    (item: any): string => {
      const rawUrl =
        item?.backgroundImage ||
        item?.banner ||
        item?.bannerUrl ||
        item?.posterImage ||
        item?.poster ||
        FALLBACK_ANIME_BANNER;

      return getOptimizedImageUrl(rawUrl, {
        width: heroWidth,
        quality: 80,
        fallbackType: 'banner',
      });
    },
    [heroWidth]
  );

  const activeItem = (displaySlides[currentIndex] || displaySlides[0] || null) as any;

  const matchedCatalogAnime = useMemo(() => {
    if (!activeItem) return undefined;
    const keys = [
      activeItem.animeId,
      activeItem.animeSlug,
      activeItem.id,
      activeItem.slug,
      activeItem.title ? cleanAnimeTitle(activeItem.title) : '',
    ]
      .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.toLowerCase());

    for (const key of keys) {
      const found = catalogLookup.get(key);
      if (found) return found;
    }
    return undefined;
  }, [activeItem, catalogLookup]);

  const activeAnimeKey = String(
    activeItem?.animeId ||
      matchedCatalogAnime?.id ||
      activeItem?.animeSlug ||
      activeItem?.slug ||
      activeItem?.id ||
      ''
  ).trim();

  const [inWatchlist, setInWatchlist] = useState<boolean>(() =>
    activeAnimeKey ? Boolean(getAnimeWatchlistStatusCached(activeAnimeKey)) : false
  );

  useEffect(() => {
    if (!activeAnimeKey) {
      setInWatchlist(false);
      return;
    }
    setInWatchlist(Boolean(getAnimeWatchlistStatusCached(activeAnimeKey)));
  }, [activeAnimeKey, user?.uid]);

  // Mark current slide as visited so its <img> mounts cleanly
  useEffect(() => {
    setVisitedSlides((prev) => {
      if (prev.has(currentIndex)) return prev;
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  // Lazy preload next slide once current slide is active
  useEffect(() => {
    if (displaySlides.length <= 1) return;
    const nextIdx = (currentIndex + 1) % displaySlides.length;
    const nextItem = displaySlides[nextIdx] as any;
    if (!nextItem) return;
    const nextRawUrl =
      nextItem.backgroundImage ||
      nextItem.banner ||
      nextItem.bannerUrl ||
      nextItem.posterImage ||
      nextItem.poster;
    if (nextRawUrl) {
      preloadImages([nextRawUrl], { width: heroWidth, quality: 80, fallbackType: 'banner' });
    }
  }, [currentIndex, displaySlides, heroWidth]);

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (displaySlides.length <= 1) return;
      setCurrentIndex((prev) => (prev === 0 ? displaySlides.length - 1 : prev - 1));
    },
    [displaySlides.length]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (displaySlides.length <= 1) return;
      setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
    },
    [displaySlides.length]
  );

  // Pause auto-slide when browser tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-slide every 6s
  useEffect(() => {
    if (displaySlides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [displaySlides.length, isPaused, currentIndex]);

  const minSwipeDistance = 40;
  const onTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    isSwipingRef.current = false;
    touchEndXRef.current = null;
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentX = e.targetTouches[0].clientX;
    touchEndXRef.current = currentX;
    if (touchStartXRef.current !== null && Math.abs(currentX - touchStartXRef.current) > 10) {
      isSwipingRef.current = true;
    }
  };

  const onTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 50);
  };

  if (!activeItem) return null;

  const title = cleanAnimeTitle(activeItem.title || matchedCatalogAnime?.title || 'Featured Anime');
  const rawGenres: string[] = Array.isArray(activeItem.genres) && activeItem.genres.length > 0
    ? activeItem.genres
    : Array.isArray(matchedCatalogAnime?.genres)
    ? matchedCatalogAnime.genres
    : [];
  const genresLine = rawGenres.filter(Boolean).slice(0, 3).join(', ');

  const synopsis =
    activeItem.description ||
    activeItem.synopsis ||
    matchedCatalogAnime?.description ||
    (matchedCatalogAnime as any)?.synopsis ||
    '';

  const slug = String(
    activeItem.animeSlug || matchedCatalogAnime?.slug || activeItem.slug || activeItem.id || ''
  ).trim();

  // Detail URL (tapping title or background)
  const detailUrl = (() => {
    if (
      typeof activeItem.secondaryButtonUrl === 'string' &&
      activeItem.secondaryButtonUrl.trim() !== ''
    ) {
      return activeItem.secondaryButtonUrl.trim();
    }
    return slug ? `/anime/${encodeURIComponent(slug)}` : '/browse';
  })();

  // Play URL (continue episode if watch history exists, otherwise watch ep 1 or admin watch url)
  const playUrl = (() => {
    const existingProgress =
      (activeAnimeKey && progressLookup.get(activeAnimeKey.toLowerCase())) ||
      (slug && progressLookup.get(slug.toLowerCase())) ||
      null;

    if (existingProgress && existingProgress.episodeNumber) {
      const targetSlug = existingProgress.animeSlug || slug;
      if (targetSlug) {
        return `/anime/${encodeURIComponent(targetSlug)}/episode/${existingProgress.episodeNumber}`;
      }
    }

    if (
      typeof activeItem.buttonUrl === 'string' &&
      activeItem.buttonUrl.trim() !== '' &&
      activeItem.buttonUrl.includes('/episode/')
    ) {
      return activeItem.buttonUrl.trim();
    }

    if (slug) {
      return `/anime/${encodeURIComponent(slug)}/episode/1`;
    }

    if (typeof activeItem.buttonUrl === 'string' && activeItem.buttonUrl.trim() !== '') {
      return activeItem.buttonUrl.trim();
    }

    return '/browse';
  })();

  // Respect custom admin button label while keeping compact "Play" for default labels
  const rawBtnText = typeof activeItem.buttonText === 'string' ? activeItem.buttonText.trim() : '';
  const playButtonLabel =
    rawBtnText &&
    rawBtnText.toLowerCase() !== 'watch now' &&
    rawBtnText.toLowerCase() !== 'watch episode 1'
      ? rawBtnText
      : 'Play';

  const handleToggleMyList = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onShowMessage?.('Please sign in to save anime to My List');
      navigate('/login');
      return;
    }
    if (!activeAnimeKey || watchlistPending) return;

    const nextState = !inWatchlist;
    setInWatchlist(nextState);
    setWatchlistPending(true);

    try {
      if (nextState) {
        await updateWatchlistStatus(
          user.uid,
          activeAnimeKey,
          slug || activeAnimeKey,
          title,
          activeItem.posterImage || matchedCatalogAnime?.poster || activeItem.poster || '',
          'plan_to_watch',
          rawGenres,
          Number(activeItem.rating || matchedCatalogAnime?.rating || 0)
        );
        onShowMessage?.('Added to My List');
      } else {
        await removeFromWatchlist(user.uid, activeAnimeKey);
        onShowMessage?.('Removed from My List');
      }
    } catch {
      setInWatchlist(!nextState);
      onShowMessage?.('Failed to update My List');
    } finally {
      setWatchlistPending(false);
    }
  };

  const handleHeroSurfaceClick = () => {
    if (isSwipingRef.current) return;
    navigate(detailUrl);
  };

  const placeholderSeed = String(activeItem.id || activeItem.slug || title || currentIndex);
  const blurPlaceholderSrc =
    (typeof activeItem.blurDataURL === 'string' && activeItem.blurDataURL.startsWith('data:image/')
      ? activeItem.blurDataURL
      : null) || getHeroBlurPlaceholder(placeholderSeed);

  const activeBannerUrl = resolveSlideBannerUrl(activeItem);
  const activeEffectiveUrl = failedUrls[activeBannerUrl] ? FALLBACK_ANIME_BANNER : activeBannerUrl;
  const activeSlideLoaded =
    Boolean(loadedUrls[activeEffectiveUrl]) || isImagePreloaded(activeEffectiveUrl);

  return (
    <section
      onClick={handleHeroSurfaceClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="relative w-full h-[clamp(400px,62svh,540px)] md:h-[560px] lg:h-[clamp(520px,72vh,720px)] overflow-hidden bg-[#050A14] select-none cursor-pointer group"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Anime Spotlight"
    >
      {/* 1. Full-Bleed Crossfade Background Stack */}
      <div
        className="absolute inset-0 pointer-events-none"
        data-banner-state={activeSlideLoaded ? 'loaded' : 'placeholder'}
        style={{
          background:
            'radial-gradient(circle at 75% 25%, rgba(30, 136, 255, 0.22) 0%, rgba(11, 22, 44, 0.92) 45%, #050A14 100%)',
        }}
      >
        {/* Immediate Base64 Blurry Placeholder Layer */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-300 ease-out ${
            activeSlideLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={blurPlaceholderSrc}
            alt=""
            decoding="sync"
            className="w-full h-full object-cover scale-110 blur-xl"
          />
        </div>

        {/* Crossfade Slide Images (300ms opacity-only transition) */}
        {displaySlides.map((slideItem, idx) => {
          const itemObj = slideItem as Record<string, any>;
          const isCurrent = idx === currentIndex;
          const shouldMount = idx === 0 || isCurrent || visitedSlides.has(idx);
          if (!shouldMount) return null;

          const url = resolveSlideBannerUrl(itemObj);
          const effectiveSrc = failedUrls[url] ? FALLBACK_ANIME_BANNER : url;
          const isLoaded = Boolean(loadedUrls[effectiveSrc]) || isImagePreloaded(effectiveSrc);

          return (
            <img
              key={`hero-slide-img-${itemObj.id || itemObj.slug || itemObj.animeSlug || idx}`}
              src={effectiveSrc}
              alt=""
              loading={idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={idx === 0 ? 'high' : 'auto'}
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => {
                markImagePreloaded(effectiveSrc);
                setLoadedUrls((prev) => (prev[effectiveSrc] ? prev : { ...prev, [effectiveSrc]: true }));
              }}
              onError={() => {
                if (!failedUrls[url] && url !== FALLBACK_ANIME_BANNER) {
                  setFailedUrls((prev) => ({ ...prev, [url]: true }));
                }
              }}
              className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ease-out ${
                isCurrent && isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          );
        })}

        {/* Bottom seamless blend gradient into #050A14 page canvas */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, #050A14 0%, rgba(5,10,20,0.92) 18%, rgba(5,10,20,0.5) 45%, transparent 75%)',
          }}
        />

        {/* Desktop Left Scrim */}
        <div
          className="hidden lg:block absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(5,10,20,0.85) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* 2. Desktop-only Navigation Arrows (40px circle ghost buttons at vertical center) */}
      {displaySlides.length > 1 && (
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/35 hover:bg-black/65 text-white border border-white/20 flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 backdrop-blur-sm cursor-pointer"
            title="Previous slide"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/35 hover:bg-black/65 text-white border border-white/20 flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 backdrop-blur-sm cursor-pointer"
            title="Next slide"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 3. Content Column (single flex column, justify-end, 16px phone / 32px+ desktop, bottom 28px, gap 10px) */}
      <div className="relative z-20 max-w-[1600px] mx-auto w-full h-full flex flex-col justify-end gap-[10px] px-4 md:px-8 lg:px-10 pt-20 pb-[28px]">
        {/* 1) Title */}
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 3.6vw, 3.25rem)',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}
          className="font-bold text-white tracking-tight leading-[1.12] line-clamp-2 max-w-2xl break-words"
        >
          {title}
        </h1>

        {/* 2) Genres Line (plain text, first 3 genres, single line truncate) */}
        {genresLine && (
          <p className="text-[14px] text-[#CBD5E1] truncate max-w-xl leading-snug">
            {genresLine}
          </p>
        )}

        {/* Desktop-only Synopsis (2-line max, max-width 560px) */}
        {synopsis && (
          <p className="hidden lg:line-clamp-2 max-w-[560px] text-sm text-[#CBD5E1]/90 leading-relaxed">
            {synopsis}
          </p>
        )}

        {/* 3) Buttons Row + 4) Right-aligned Dots (drops cleanly below on <360px or tight space) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 w-full pt-0.5">
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="hero-btn-watch"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(playUrl);
              }}
              className="h-[44px] px-6 rounded-full bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white shrink-0" />
              <span>{playButtonLabel}</span>
            </button>

            <button
              id="hero-btn-mylist"
              type="button"
              disabled={watchlistPending}
              onClick={handleToggleMyList}
              className={`h-[44px] px-5 sm:px-6 rounded-full border-[1.5px] font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer ${
                inWatchlist
                  ? 'border-white bg-white/15 text-white hover:bg-white/20'
                  : 'border-white/70 bg-transparent hover:bg-white/10 text-white'
              }`}
            >
              {inWatchlist ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>My List</span>
                </>
              )}
            </button>
          </div>

          {/* Slide Dots — right-aligned on same row, or own right-aligned row below if <360px */}
          {displaySlides.length > 1 && (
            <div
              className="flex items-center gap-[6px] ml-auto shrink-0 max-[359px]:w-full max-[359px]:justify-end"
              role="tablist"
              aria-label="Hero slides"
            >
              {displaySlides.map((_, i) => {
                const isActive = i === currentIndex;
                return (
                  <button
                    key={`hero-dot-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(i);
                    }}
                    className={`h-[6px] rounded-full transition-all duration-300 cursor-pointer shrink-0 ${
                      isActive
                        ? 'w-[18px] bg-[#1E88FF]'
                        : 'w-[6px] bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Slide ${i + 1}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
