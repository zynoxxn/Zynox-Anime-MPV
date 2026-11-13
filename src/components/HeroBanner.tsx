import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Anime } from '../types/anime';
import type { CmsHeroBanner } from '../types/cms';
import { Play, Info, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getOptimizedImageUrl, FALLBACK_ANIME_BANNER } from '../lib/image-optimizer';

export type HeroItem = Anime | CmsHeroBanner | Record<string, any>;

interface HeroBannerProps {
  featuredAnimes: HeroItem[];
  navigate: (path: string) => void;
}

const SLIDE_DURATION = 6000;

export const HeroBanner: React.FC<HeroBannerProps> = ({ featuredAnimes, navigate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Touch swipe support
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const validSlides = (featuredAnimes || []).filter(Boolean);
  const activeItem = validSlides[currentIndex] || validSlides[0] || null;

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (validSlides.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? validSlides.length - 1 : prev - 1));
    setProgress(0);
  }, [validSlides.length]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (validSlides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validSlides.length);
    setProgress(0);
  }, [validSlides.length]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (validSlides.length <= 1 || isPaused) return;
    const intervalTime = 50;
    const step = (intervalTime / SLIDE_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [validSlides.length, isPaused, handleNext]);

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

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
    if (touchStartXRef.current && Math.abs(currentX - touchStartXRef.current) > 10) {
      isSwipingRef.current = true;
    }
  };

  const onTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartXRef.current || !touchEndXRef.current) return;
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

  const displayList = validSlides.slice(0, 8);
  const rawItem = activeItem as any;

  const rawBannerUrl =
    rawItem.backgroundImage ||
    rawItem.banner ||
    rawItem.bannerUrl ||
    rawItem.posterImage ||
    rawItem.poster ||
    FALLBACK_ANIME_BANNER;

  const bannerImage = getOptimizedImageUrl(rawBannerUrl, {
    width: 1400,
    quality: 85,
    fallbackType: 'banner',
  });

  const title = activeItem.title || 'Featured Anime';
  const ratingValue = rawItem.rating ? Number(rawItem.rating).toFixed(1) : '8.5';
  const releaseYear = rawItem.year || 2026;
  const animeType = rawItem.type || 'TV';

  const description =
    rawItem.description ||
    rawItem.synopsis ||
    '';

  const getTargetUrl = (item: any): string => {
    if (item?.buttonUrl && typeof item.buttonUrl === 'string' && item.buttonUrl.trim() !== '') {
      return item.buttonUrl.trim();
    }
    const slug = item?.animeSlug || item?.slug || item?.id;
    if (!slug) return '/browse';
    return `/anime/${encodeURIComponent(slug)}`;
  };

  const getInfoUrl = (item: any): string => {
    if (
      item?.secondaryButtonUrl &&
      typeof item.secondaryButtonUrl === 'string' &&
      item.secondaryButtonUrl.trim() !== ''
    ) {
      return item.secondaryButtonUrl.trim();
    }
    const slug = item?.animeSlug || item?.slug || item?.id;
    if (!slug) return '/browse';
    return `/anime/${encodeURIComponent(slug)}`;
  };

  const primaryTargetUrl = getTargetUrl(activeItem);
  const infoTargetUrl = getInfoUrl(activeItem);

  const handleBannerCardClick = () => {
    if (isSwipingRef.current) return;
    navigate(primaryTargetUrl);
  };

  return (
    <div
      onClick={handleBannerCardClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="relative w-full aspect-[16/10] sm:aspect-video min-h-[300px] sm:min-h-[360px] md:min-h-[440px] lg:min-h-[500px] max-h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#050A14] select-none cursor-pointer group transition-all"
      role="region"
      aria-roledescription="carousel"
      aria-label="Spotlight Anime Banner"
    >
      {/* 1. Background Image with Absolute Scrims */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          key={rawItem.id || rawItem.slug || bannerImage}
          src={bannerImage}
          alt=""
          decoding="async"
          fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-[center_top]"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== FALLBACK_ANIME_BANNER) {
              target.src = FALLBACK_ANIME_BANNER;
            }
          }}
        />

        {/* Strong Bottom Gradient Overlay for contrast on bright posters */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(5,10,20,0.98) 0%, rgba(5,10,20,0.85) 45%, rgba(5,10,20,0.2) 80%, transparent 100%)',
          }}
        />

        {/* Left Gradient on Desktop */}
        <div
          className="hidden md:block absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, rgba(5,10,20,0.95) 0%, rgba(5,10,20,0.6) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* 2. Desktop Navigation Arrows (hidden on phone) */}
      {validSlides.length > 1 && (
        <div className="hidden md:block">
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-[#1E88FF] text-white border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
            title="Previous slide"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-[#1E88FF] text-white border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
            title="Next slide"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. ONE Content Container (Relative, h-full, justify-end, 16:9 proportioned spacing) */}
      <div className="relative h-full flex flex-col justify-end gap-1.5 sm:gap-2.5 p-3 sm:p-5 lg:p-7 z-20 max-w-xl lg:max-w-2xl">
        {/* Child 1: Small "#N SPOTLIGHT" tag */}
        <div>
          <span className="inline-flex items-center px-2 py-0.5 bg-[#1E88FF]/30 text-[#00CFFF] border border-[#1E88FF]/40 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
            #{currentIndex + 1} SPOTLIGHT
          </span>
        </div>

        {/* Child 2: Plain text meta line: "★ 8.5 · TV · 2026" */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-[#CBD5E1] leading-none">
          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{ratingValue}</span>
          </span>
          <span className="text-white/40">·</span>
          <span>{animeType}</span>
          <span className="text-white/40">·</span>
          <span>{releaseYear}</span>
        </div>

        {/* Child 3: Title (proportional clamp) */}
        <h1
          style={{
            fontSize: 'clamp(1.2rem, 3vw, 2.25rem)',
            textShadow: '0 2px 8px rgba(0,0,0,0.85)',
          }}
          className="font-black text-white tracking-tight leading-snug line-clamp-1 sm:line-clamp-2 break-words group-hover:text-[#00CFFF] transition-colors"
        >
          {title}
        </h1>

        {/* Child 4: Synopsis ONLY on desktop (>=1024px, 2-line max), hidden on phones */}
        {description && (
          <p
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
            className="hidden md:line-clamp-1 lg:line-clamp-2 text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-xl min-w-0 break-words"
          >
            {description}
          </p>
        )}

        {/* Child 5: Buttons [Watch Now] [Details] - height 40-44px */}
        <div className="flex items-center gap-2.5 pt-0.5 shrink-0">
          <button
            id="hero-btn-watch"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(primaryTargetUrl);
            }}
            className="h-10 sm:h-11 px-4 sm:px-6 bg-[#1E88FF] hover:bg-[#1570d8] text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white shrink-0" />
            <span>{rawItem.buttonText || 'Watch Now'}</span>
          </button>

          <button
            id="hero-btn-info"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(infoTargetUrl);
            }}
            className="h-10 sm:h-11 px-4 sm:px-6 bg-[#0B1324]/85 hover:bg-[#101A30] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer hover:border-white/30 whitespace-nowrap shrink-0"
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{rawItem.secondaryButtonText || 'Details'}</span>
          </button>
        </div>

        {/* Child 6: Dots Row (small, centered under buttons, static in flow) */}
        {validSlides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-1 sm:mt-1.5 shrink-0">
            {displayList.map((_, i) => (
              <button
                key={`hero-dot-${i}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`relative h-1.5 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                  currentIndex === i
                    ? 'w-6 bg-white/25'
                    : 'w-1.5 bg-white/30 hover:bg-white/50'
                }`}
                title={`Go to slide ${i + 1}`}
                aria-label={`Go to slide ${i + 1}`}
              >
                {currentIndex === i && (
                  <span
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#1E88FF] to-[#00CFFF] transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
