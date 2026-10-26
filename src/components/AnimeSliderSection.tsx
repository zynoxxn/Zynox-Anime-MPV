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
  icon?: React.ReactNode;
  badge?: string;
}

export const AnimeSliderSection: React.FC<AnimeSliderSectionProps> = ({
  id,
  title,
  animes,
  navigate,
  viewAllPath,
  onShowMessage,
  showRankingBadge = false,
  icon,
  badge,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  // Mouse / Pointer drag state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Animation lock & target accumulator for rapid clicking
  const targetScrollLeftRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // Scroll limit boundary states for arrows
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update bounds
  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    const hasOverflow = scrollWidth > clientWidth + 6;
    setCanScrollRight(!hasOverflow ? false : scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateScrollBounds();

    const t1 = setTimeout(updateScrollBounds, 80);
    const t2 = setTimeout(updateScrollBounds, 400);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateScrollBounds())
        : null;
    if (ro) ro.observe(el);

    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    window.addEventListener('resize', updateScrollBounds);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      el.removeEventListener('scroll', updateScrollBounds);
      window.removeEventListener('resize', updateScrollBounds);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [animes, updateScrollBounds]);

  if (!animes || animes.length === 0) return null;

  // Custom animation fallback that works 100% in all environments (including iframes)
  const animateScroll = (el: HTMLElement, targetLeft: number, duration = 300) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const startLeft = el.scrollLeft;
    const change = targetLeft - startLeft;
    if (Math.abs(change) < 2) {
      el.scrollLeft = targetLeft;
      updateScrollBounds();
      return;
    }

    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      el.scrollLeft = startLeft + change * ease;

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        el.scrollLeft = targetLeft;
        isAnimatingRef.current = false;
        rafIdRef.current = null;
        updateScrollBounds();
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  };

  // Slide navigation with loop support & rapid click queuing
  const slide = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;

    const clientW = el.clientWidth || 320;
    const scrollW = el.scrollWidth || clientW;
    const maxScroll = Math.max(0, scrollW - clientW);
    if (maxScroll <= 0) return;

    // Card width approximately: step is 75% of viewport width
    const scrollStep = Math.max(220, Math.floor(clientW * 0.75));

    // Base on currently active animated target or instantaneous scrollLeft
    const currentBase = isAnimatingRef.current ? targetScrollLeftRef.current : el.scrollLeft;
    let nextTarget = direction === 'right' ? currentBase + scrollStep : currentBase - scrollStep;

    // Boundary wrap / loop
    if (direction === 'right') {
      if (currentBase >= maxScroll - 10) {
        nextTarget = 0; // Wrap back to beginning
      } else {
        nextTarget = Math.min(maxScroll, nextTarget);
      }
    } else {
      if (currentBase <= 10) {
        nextTarget = maxScroll; // Wrap to end
      } else {
        nextTarget = Math.max(0, nextTarget);
      }
    }

    targetScrollLeftRef.current = nextTarget;
    isAnimatingRef.current = true;

    // Execute smooth scroll
    animateScroll(el, nextTarget, 320);
  };

  // Pointer drag events for desktop mouse dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button (left click) for mouse; allow native gestures for touch
    if (e.pointerType === 'touch') {
      return;
    }
    if (e.button !== 0) return;

    const el = trackRef.current;
    if (!el) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isAnimatingRef.current = false;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = el.scrollLeft;
    setIsDraggingState(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 4) {
      hasDraggedRef.current = true;
      trackRef.current.scrollLeft = startScrollLeftRef.current - delta;
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignored
      }
      isDraggingRef.current = false;
      setIsDraggingState(false);
      setTimeout(() => {
        hasDraggedRef.current = false;
        updateScrollBounds();
      }, 80);
    }
  };

  return (
    <section id={id} className="space-y-3 sm:space-y-4 select-none relative group/slider">
      {/* 1. Header with Title, Slider Navigation Controls & View All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF] rounded-full inline-block shrink-0" />
          {icon && <span className="flex items-center shrink-0">{icon}</span>}
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {title}
          </h2>
          {badge && (
            <span className="px-1.5 py-0.2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-[#1683FF]/20 text-[#00CFFF] border border-[#1683FF]/30">
              {badge}
            </span>
          )}
          <span className="text-[11px] text-[#64748B] font-medium hidden sm:inline-block ml-0.5">
            ({animes.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Header Slider Control Arrows (Always visible and easily clickable) */}
          <div className="flex items-center gap-1.5 bg-[#081426] p-0.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => slide('left')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-transparent hover:bg-[#1683FF] text-[#A1A1AA] hover:text-white cursor-pointer active:scale-90"
              title={`Slide ${title} Left`}
              aria-label={`Slide ${title} Left`}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              onClick={() => slide('right')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-transparent hover:bg-[#1683FF] text-[#A1A1AA] hover:text-white cursor-pointer active:scale-90"
              title={`Slide ${title} Right`}
              aria-label={`Slide ${title} Right`}
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* View All Link */}
          {viewAllPath && (
            <button
              type="button"
              onClick={() => navigate(viewAllPath)}
              className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors ml-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Slider Viewport */}
      <div className="relative">
        {/* Left Floating Arrow on Track */}
        <button
          type="button"
          onClick={() => slide('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-[#050A14]/90 hover:bg-[#1683FF] text-white border border-white/15 items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 shadow-2xl backdrop-blur-md hover:scale-110 active:scale-90 cursor-pointer"
          title="Previous"
          aria-label="Previous items"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Floating Arrow on Track */}
        <button
          type="button"
          onClick={() => slide('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-[#050A14]/90 hover:bg-[#1683FF] text-white border border-white/15 items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 shadow-2xl backdrop-blur-md hover:scale-110 active:scale-90 cursor-pointer"
          title="Next"
          aria-label="Next items"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onDragStart={(e) => e.preventDefault()}
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            overscrollBehaviorX: 'contain',
          }}
          className={`flex items-start gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1 px-1 ${
            isDraggingState ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          onClickCapture={(e) => {
            if (hasDraggedRef.current) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
        >
          {animes.map((anime, idx) => (
            <div
              key={`slider-${title.toLowerCase().replace(/\s+/g, '-')}-${anime.id || anime.slug}-${idx}`}
              className="w-[125px] sm:w-[150px] md:w-[175px] lg:w-[200px] xl:w-[215px] shrink-0"
              draggable={false}
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
