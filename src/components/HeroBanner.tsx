import React, { useState, useEffect, useRef } from 'react';
import type { Anime } from '../types/anime';
import type { CmsHeroBanner } from '../types/cms';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';

export type HeroItem = Anime | CmsHeroBanner | Record<string, any>;

interface HeroBannerProps {
  featuredAnimes: HeroItem[];
  navigate: (path: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ featuredAnimes, navigate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isSwipingRef = useRef(false);

  // Filter out any invalid items
  const validSlides = (featuredAnimes || []).filter(Boolean);
  const activeItem = validSlides[currentIndex] || validSlides[0] || null;

  // Auto rotate every 6 seconds
  useEffect(() => {
    if (validSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [validSlides.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (validSlides.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? validSlides.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (validSlides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validSlides.length);
  };

  // Touch swipe support
  const minSwipeDistance = 40;
  const onTouchStart = (e: React.TouchEvent) => {
    isSwipingRef.current = false;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    if (touchStart && Math.abs(currentX - touchStart) > 10) {
      isSwipingRef.current = true;
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
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

  const displayList = validSlides.slice(0, 6);
  const rawItem = activeItem as any;

  // Normalize image and links for either Anime or CmsHeroBanner
  const bannerImage =
    rawItem.backgroundImage ||
    rawItem.banner ||
    rawItem.posterImage ||
    rawItem.poster ||
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=85';

  const title = activeItem.title || 'Featured Anime Spotlight';
  const subtitle =
    rawItem.subtitle ||
    (rawItem.rating
      ? `★ ${rawItem.rating} • ${rawItem.status || 'HD'} • ${rawItem.type || 'Series'}`
      : 'Trending Spotlight');

  const description =
    activeItem.description ||
    'Stream latest high definition anime episodes in multi-audio dubbed and subbed.';

  const getTargetUrl = (item: any): string => {
    if (item?.buttonUrl && typeof item.buttonUrl === 'string' && item.buttonUrl.trim() !== '') {
      return item.buttonUrl.trim();
    }
    const slug = item?.animeSlug || item?.slug || item?.id;
    if (!slug) return '/browse';
    return `/anime/${slug}`;
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
    return `/anime/${slug}`;
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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[440px] xl:h-[480px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#050A14] group select-none cursor-pointer transition-all duration-300 hover:border-[#1683FF]/40"
      role="button"
      tabIndex={0}
      aria-label={`View ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(primaryTargetUrl);
        }
      }}
    >
      {/* Background Image with optimized vivid contrast & localized text gradient */}
      <div className="absolute inset-0">
        <img
          key={rawItem.id || rawItem.slug || bannerImage}
          src={bannerImage}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center md:object-top transition-transform duration-700 group-hover:scale-[1.03] brightness-[1.02] contrast-[1.05]"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Soft bottom edge blend */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#050A14] via-[#050A14]/50 to-transparent pointer-events-none" />

        {/* Localized left text-readability fade - keeps right & center anime artwork bright & visible */}
        <div className="absolute inset-y-0 left-0 w-full sm:w-4/5 md:w-3/5 lg:w-1/2 bg-gradient-to-r from-[#050A14]/95 via-[#050A14]/60 to-transparent pointer-events-none" />

        {/* Subtle top edge vignette */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Prev / Next Navigation Arrows */}
      {validSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/60 hover:bg-[#1683FF] text-white border border-white/15 flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-md shadow-lg cursor-pointer hover:scale-110 active:scale-95"
            title="Previous slide"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/60 hover:bg-[#1683FF] text-white border border-white/15 flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-md shadow-lg cursor-pointer hover:scale-110 active:scale-95"
            title="Next slide"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Hero Content on Left */}
      <div className="relative h-full flex flex-col justify-end p-5 sm:p-7 md:p-10 lg:p-12 space-y-3 z-10 max-w-xl lg:max-w-3xl">
        {/* Small Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 bg-[#1683FF]/30 text-[#00CFFF] border border-[#1683FF]/50 rounded-lg text-xs font-bold tracking-wide uppercase shadow-sm backdrop-blur-sm">
            #{currentIndex + 1} SPOTLIGHT
          </span>
          {subtitle && (
            <span className="text-xs md:text-sm text-white/90 font-medium hidden sm:inline-block drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {subtitle}
            </span>
          )}
        </div>

        {/* Hero Title */}
        <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-wide line-clamp-1 sm:line-clamp-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] group-hover:text-[#00CFFF] transition-colors">
          {title}
        </h1>

        {/* Description / Synopsis */}
        <p className="text-xs sm:text-sm md:text-base text-white/85 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-lg lg:max-w-2xl hidden sm:block drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {description}
        </p>

        {/* Action Buttons & Indicator Dots */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <button
              id="hero-btn-watch"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(primaryTargetUrl);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#1683FF] hover:bg-[#2196FF] text-white font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-[#1683FF]/25 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{rawItem.buttonText || 'Watch Now'}</span>
            </button>

            <button
              id="hero-btn-info"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(infoTargetUrl);
              }}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#07111F]/80 hover:bg-[#07111F] text-white text-xs sm:text-sm font-semibold rounded-lg transition-all border border-white/10 backdrop-blur-md flex items-center gap-1.5 cursor-pointer hover:border-white/30"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{rawItem.secondaryButtonText || 'Details'}</span>
            </button>
          </div>

          {/* Indicator Dots */}
          {validSlides.length > 1 && (
            <div className="flex items-center gap-1.5">
              {displayList.map((_, i) => (
                <button
                  key={`hero-dot-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === i
                      ? 'w-5 sm:w-6 bg-[#1683FF]'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`Slide ${i + 1}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
