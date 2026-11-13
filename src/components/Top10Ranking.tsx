import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Anime } from '../types/anime';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import { getOptimizedImageUrl, FALLBACK_ANIME_POSTER } from '../lib/image-optimizer';
import { cleanAnimeTitle } from '../lib/firestore/anime';

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

  return (
    <section id="section-top-10" className="space-y-3 select-none relative group/top10">
      {/* 1. Header with 18px Bold Title & Compact Segmented Control */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-1 h-4 bg-[#1E88FF] rounded-full inline-block shrink-0" />
          <Flame className="w-4 h-4 text-orange-400 shrink-0" />
          <h2 className="text-[18px] font-bold text-white tracking-wide whitespace-nowrap">
            Top 10
          </h2>
        </div>

        {/* Small tabs in one line */}
        <div className="flex items-center gap-1 p-0.5 bg-[#0B1324] rounded-lg border border-white/5">
          {(['today', 'week', 'month'] as Timeframe[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: 'smooth' });
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer whitespace-nowrap leading-none ${
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

      {/* 2. Horizontal Netflix-Style Scroll Row */}
      <div className="relative">
        {/* Desktop Left Arrow Button */}
        <button
          type="button"
          onClick={() => slide('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#050A14]/90 hover:bg-[#1E88FF] text-white border border-white/15 items-center justify-center transition-all opacity-0 group-hover/top10:opacity-100 shadow-xl cursor-pointer"
          title="Previous"
          aria-label="Previous Top 10 items"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Desktop Right Arrow Button */}
        <button
          type="button"
          onClick={() => slide('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#050A14]/90 hover:bg-[#1E88FF] text-white border border-white/15 items-center justify-center transition-all opacity-0 group-hover/top10:opacity-100 shadow-xl cursor-pointer"
          title="Next"
          aria-label="Next Top 10 items"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Gradient Edge Fades */}
        {canScrollLeft && (
          <div className="hidden sm:block pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#050A14] to-transparent z-20 transition-opacity" />
        )}
        {canScrollRight && (
          <div className="hidden sm:block pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050A14] to-transparent z-20 transition-opacity" />
        )}

        {/* Track: Netflix Style Cards */}
        <div
          ref={trackRef}
          className="flex items-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 pl-2 pr-4 sm:pr-6 md:pr-8"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
          {rankedItems.map((anime, idx) => {
            const rank = idx + 1;
            const isTen = rank === 10;
            const posterUrl = getOptimizedImageUrl(anime.poster, { width: 280, fallbackType: 'poster' });

            return (
              <div
                key={`netflix-top10-${anime.id || anime.slug}-${idx}`}
                onClick={() => navigate(`/anime/${anime.slug || anime.id}`)}
                className="shrink-0 snap-start cursor-pointer group flex flex-col transition-transform duration-200 hover:-translate-y-1"
              >
                {/* Poster & Rank Number Lockup */}
                <div className="relative flex items-end justify-start">
                  {/* Huge Outlined Numeral (Left of poster, height ~70% of poster, partially behind) */}
                  <span
                    style={{
                      WebkitTextStroke: '2px #1E88FF',
                      color: 'transparent',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                    className={`font-black select-none pointer-events-none leading-none tracking-tighter shrink-0 z-0 ${
                      isTen
                        ? 'text-[4.2rem] sm:text-[5.2rem] -mr-6 sm:-mr-8'
                        : 'text-[4.8rem] sm:text-[5.8rem] -mr-4 sm:-mr-6'
                    }`}
                  >
                    {rank}
                  </span>

                  {/* 2:3 Poster (110px phone / 140px desktop) */}
                  <div className="relative z-10 w-[110px] md:w-[140px] aspect-[2/3] rounded-xl overflow-hidden bg-[#0B1324] border border-white/10 group-hover:border-[#1E88FF]/60 shadow-md transition-all">
                    <img
                      src={posterUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== FALLBACK_ANIME_POSTER) {
                          target.src = FALLBACK_ANIME_POSTER;
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Below Poster: Title + Language & Rating */}
                <div className="pt-1.5 pl-1 min-w-0 max-w-[130px] md:max-w-[160px] space-y-0.5">
                  <h4
                    title={cleanAnimeTitle(anime.title)}
                    className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00CFFF] transition-colors leading-tight"
                  >
                    {cleanAnimeTitle(anime.title)}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] leading-none min-w-0">
                    <span className="text-[#00CFFF] font-semibold truncate">
                      {anime.audioLanguage || (anime as any).language || 'Hindi Dub'}
                    </span>
                    <span className="text-white/30 shrink-0">·</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold shrink-0">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      <span>{anime.rating ? Number(anime.rating).toFixed(1) : '8.5'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
