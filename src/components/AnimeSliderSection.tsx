import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Anime } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AnimeSliderSectionProps {
  id?: string;
  title: string;
  animes: Anime[];
  navigate: (path: string) => void;
  viewAllPath?: string;
  onShowMessage?: (msg: string) => void;
  showRankingBadge?: boolean;
}

export const AnimeSliderSection: React.FC<AnimeSliderSectionProps> = ({
  id,
  title,
  animes,
  navigate,
  viewAllPath,
  onShowMessage,
  showRankingBadge = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  // Mouse drag-to-scroll states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Scroll limit boundary states for arrows & fade masks
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll boundary
  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    window.addEventListener('resize', updateScrollBounds);

    return () => {
      el.removeEventListener('scroll', updateScrollBounds);
      window.removeEventListener('resize', updateScrollBounds);
    };
  }, [animes, updateScrollBounds]);

  // Global mouseup to cancel dragging anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setTimeout(() => setHasDragged(false), 80);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!animes || animes.length === 0) return null;

  // Slide navigation
  const slide = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const scrollStep = Math.max(300, Math.floor(el.clientWidth * 0.75));
    const targetScroll = direction === 'left' ? -scrollStep : scrollStep;
    el.scrollBy({ left: targetScroll, behavior: 'smooth' });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    const el = trackRef.current;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      setHasDragged(true);
      el.scrollLeft = scrollLeftState - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setTimeout(() => setHasDragged(false), 80);
  };

  return (
    <section id={id} className="space-y-3 sm:space-y-4 select-none relative group/slider">
      {/* 1. Header with Title, Slider Navigation Controls & View All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF] rounded-full inline-block shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {title}
          </h2>
          <span className="text-[11px] text-[#64748B] font-medium hidden sm:inline-block ml-1">
            ({animes.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Header Slider Control Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => slide('left')}
              disabled={!canScrollLeft}
              className={`w-7 h-7 rounded-lg border border-white/5 flex items-center justify-center transition-all ${
                canScrollLeft
                  ? 'bg-white/5 hover:bg-[#1683FF] text-[#A1A1AA] hover:text-white cursor-pointer shadow-sm active:scale-95'
                  : 'bg-white/[0.02] text-[#475569] cursor-not-allowed opacity-40'
              }`}
              title={`Slide ${title} Left`}
              aria-label={`Slide ${title} Left`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => slide('right')}
              disabled={!canScrollRight}
              className={`w-7 h-7 rounded-lg border border-white/5 flex items-center justify-center transition-all ${
                canScrollRight
                  ? 'bg-white/5 hover:bg-[#1683FF] text-[#A1A1AA] hover:text-white cursor-pointer shadow-sm active:scale-95'
                  : 'bg-white/[0.02] text-[#475569] cursor-not-allowed opacity-40'
              }`}
              title={`Slide ${title} Right`}
              aria-label={`Slide ${title} Right`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View All Link */}
          {viewAllPath && (
            <button
              type="button"
              onClick={() => navigate(viewAllPath)}
              className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors ml-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Slider Viewport with Drag, Smooth Touch Scroll & Desktop Floating Nav */}
      <div className="relative">
        {/* Left Floating Arrow on Desktop Hover */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => slide('left')}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-[#050A14]/90 hover:bg-[#1683FF] text-white border border-white/15 items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 shadow-2xl backdrop-blur-md hover:scale-110 active:scale-95 cursor-pointer"
            title="Previous"
            aria-label="Previous items"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Floating Arrow on Desktop Hover */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => slide('right')}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-[#050A14]/90 hover:bg-[#1683FF] text-white border border-white/15 items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 shadow-2xl backdrop-blur-md hover:scale-110 active:scale-95 cursor-pointer"
            title="Next"
            aria-label="Next items"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Left Gradient Edge Fade */}
        {canScrollLeft && (
          <div className="hidden sm:block pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#030712]/90 to-transparent z-10 transition-opacity" />
        )}

        {/* Right Gradient Edge Fade */}
        {canScrollRight && (
          <div className="hidden sm:block pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#030712]/90 to-transparent z-10 transition-opacity" />
        )}

        {/* Sliding Cards Track */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ touchAction: 'pan-y' }}
          className={`flex items-start gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 px-0.5 cursor-grab active:cursor-grabbing ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
          onClickCapture={(e) => {
            if (hasDragged) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
        >
          {animes.map((anime, idx) => (
            <div
              key={`slider-${title.toLowerCase().replace(/\s+/g, '-')}-${anime.id || anime.slug}-${idx}`}
              className="w-[115px] sm:w-[135px] md:w-[155px] lg:w-[170px] xl:w-[180px] shrink-0"
            >
              <AnimeCard
                anime={anime}
                showRankingBadge={showRankingBadge ? idx + 1 : undefined}
                navigate={navigate}
                onShowMessage={onShowMessage}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
