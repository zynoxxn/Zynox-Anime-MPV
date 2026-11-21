import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Anime } from '../types/anime';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import {
  getOptimizedImageUrl,
  getOptimizedPosterSrcSet,
  POSTER_IMAGE_SIZES,
  FALLBACK_ANIME_POSTER,
} from '../lib/image-optimizer';
import { cleanAnimeTitle, getAnimeUploadTimestamp } from '../lib/firestore/anime';
import { formatCardAudioLabel } from '../lib/format-meta';

interface Top10RankingProps {
  animes: Anime[];
  navigate: (path: string) => void;
}

type Timeframe = 'today' | 'week' | 'month';

export const Top10Ranking: React.FC<Top10RankingProps> = ({
  animes,
  navigate,
}) => {
  const [activeTab, setActiveTab] = useState<Timeframe>('today');
  const trackRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const rankedItems = useMemo(() => {
    if (!animes || animes.length === 0) return [];
    const baseList = [...animes];

    if (activeTab === 'today') {
      return baseList
        .sort((a, b) => ((b.viewsCount || 0) * 1.3 + (b.rating || 0) * 80) - ((a.viewsCount || 0) * 1.3 + (a.rating || 0) * 80))
        .slice(0, 10);
    } else if (activeTab === 'week') {
      return baseList
        .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0))
        .slice(0, 10);
    } else {
      return baseList
        .sort((a, b) => (b.rating || 0) * 100 + (b.viewsCount || 0) - ((a.rating || 0) * 100 + (a.viewsCount || 0)))
        .slice(0, 10);
    }
  }, [animes, activeTab]);

  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollBounds();
    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    window.addEventListener('resize', updateScrollBounds);
    return () => {
      el.removeEventListener('scroll', updateScrollBounds);
      window.removeEventListener('resize', updateScrollBounds);
    };
  }, [updateScrollBounds, rankedItems]);

  const slide = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(220, Math.floor(el.clientWidth * 0.75));
    const target = direction === 'right' ? el.scrollLeft + step : el.scrollLeft - step;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  if (rankedItems.length === 0) return null;

  return (
    <section id="section-top-10" className="space-y-2.5 sm:space-y-3 select-none relative group/top10">
      {/* 1. Compact Section Header: height 32px, 16px/700 title, 18px muted icon */}
      <div className="h-8 min-h-[32px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
          <h2 className="text-[16px] font-bold text-white tracking-tight whitespace-nowrap truncate leading-none">
            Top 10
          </h2>
        </div>

        {/* Timeframe tabs in one line */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[#0B1324] rounded-lg border border-white/10 shrink-0">
          {(['today', 'week', 'month'] as Timeframe[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: 'smooth' });
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors duration-150 cursor-pointer whitespace-nowrap leading-none ${
                activeTab === tab
                  ? 'bg-[#1E88FF] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Horizontal Scroll Row (16px left & right padding so first numeral & last poster never clip) */}
      <div className="relative -mx-4 sm:mx-0">
        {/* Desktop Left Arrow Button */}
        <button
          type="button"
          onClick={() => slide('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#050A14]/90 hover:bg-[#1E88FF] text-white border border-white/15 items-center justify-center transition-opacity duration-150 opacity-0 group-hover/top10:opacity-100 shadow-xl cursor-pointer"
          title="Previous"
          aria-label="Previous Top 10 items"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Desktop Right Arrow Button */}
        <button
          type="button"
          onClick={() => slide('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#050A14]/90 hover:bg-[#1E88FF] text-white border border-white/15 items-center justify-center transition-opacity duration-150 opacity-0 group-hover/top10:opacity-100 shadow-xl cursor-pointer"
          title="Next"
          aria-label="Next Top 10 items"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Gradient Edge Fades */}
        {canScrollLeft && (
          <div className="hidden sm:block pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#050A14] to-transparent z-20 transition-opacity duration-150" />
        )}
        {canScrollRight && (
          <div className="hidden sm:block pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050A14] to-transparent z-20 transition-opacity duration-150" />
        )}

        {/* Track: px-4 (16px) left & right padding, scroll-pl-4 snap-x snap-proximity */}
        <div
          ref={trackRef}
          className="flex items-start gap-[10px] overflow-x-auto no-scrollbar snap-x snap-proximity py-1 px-4 scroll-pl-4"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
          {rankedItems.map((anime, idx) => {
            const rank = idx + 1;
            const isTen = rank === 10;
            const posterUrl = getOptimizedImageUrl(anime.poster, { width: 240, fallbackType: 'poster' });
            const posterSrcSet = getOptimizedPosterSrcSet(anime.poster);
            const ratingValue = anime.rating ? Number(anime.rating).toFixed(1) : '8.5';
            const audioLabel = formatCardAudioLabel(anime);
            const cleanTitle = cleanAnimeTitle(anime.title);
            const uploadTs = getAnimeUploadTimestamp(anime);
            const isNewWithin7Days = uploadTs > 0 && Date.now() - uploadTs <= 7 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={`netflix-top10-${anime.id || anime.slug}-${idx}`}
                onClick={() => navigate(`/anime/${anime.slug || anime.id}`)}
                className={`flex-none snap-start cursor-pointer group flex flex-col ${
                  isTen
                    ? 'w-[calc(clamp(96px,26vw,120px)+42px)] sm:w-[176px] lg:w-[208px]'
                    : 'w-[calc(clamp(96px,26vw,120px)+28px)] sm:w-[160px] lg:w-[188px]'
                }`}
              >
                {/* Poster & Rank Numeral Lockup */}
                <div className="relative w-full flex items-end justify-end">
                  {/* Outlined Numeral: 72px phone / 96px desktop, weight 900, transparent fill, 2px primary stroke, tucked ~30% behind poster */}
                  <span
                    aria-hidden="true"
                    style={{
                      WebkitTextStroke: '2px rgba(30,136,255,0.9)',
                      color: 'transparent',
                      lineHeight: 0.78,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                    className={`absolute left-0 bottom-0 z-0 font-black select-none pointer-events-none tracking-tighter ${
                      isTen
                        ? 'text-[64px] lg:text-[88px]'
                        : 'text-[72px] lg:text-[96px]'
                    }`}
                  >
                    {rank}
                  </span>

                  {/* 2:3 Poster (same clamp as slider cards, radius 10px, z-10 overlapping numeral ~30%) */}
                  <div className="relative z-10 w-[clamp(96px,26vw,120px)] sm:w-[132px] lg:w-[160px] aspect-[2/3] rounded-[10px] overflow-hidden bg-[#0B1324] border border-white/10 group-hover:border-[#1E88FF]/60 transition-colors duration-150">
                    {anime.poster ? (
                      <img
                        src={posterUrl}
                        srcSet={posterSrcSet}
                        sizes={posterSrcSet ? POSTER_IMAGE_SIZES : undefined}
                        alt=""
                        width={160}
                        height={240}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.srcset = '';
                          if (target.src !== FALLBACK_ANIME_POSTER) {
                            target.src = FALLBACK_ANIME_POSTER;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#94A3B8] bg-[#0B1324] font-bold text-[10px] tracking-widest uppercase">
                        ZYNOX
                      </div>
                    )}

                    {isNewWithin7Days && (
                      <span
                        aria-label="New release"
                        title="New"
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1E88FF] ring-2 ring-[#050A14] pointer-events-none"
                      />
                    )}
                  </div>
                </div>

                {/* Below Poster: ONLY 2 compact lines aligned directly under the poster */}
                <div className="ml-auto w-[clamp(96px,26vw,120px)] sm:w-[132px] lg:w-[160px] mt-[6px] space-y-0.5 min-w-0">
                  <h4
                    title={cleanTitle}
                    className="text-[12px] font-semibold leading-[16px] text-white truncate group-hover:text-[#1E88FF] transition-colors duration-150"
                  >
                    {cleanTitle}
                  </h4>
                  <p className="text-[11px] leading-[15px] text-[#94A3B8] font-normal truncate flex items-center gap-1 min-w-0">
                    <span className="truncate">{audioLabel}</span>
                    <span className="shrink-0">·</span>
                    <Star className="w-2.5 h-2.5 text-[#F59E0B] fill-[#F59E0B] shrink-0" />
                    <span className="shrink-0 tabular-nums">{ratingValue}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
