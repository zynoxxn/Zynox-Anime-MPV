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
    <section id={id} className="space-y-2.5 sm:space-y-3 select-none relative group/slider">
      {/* 1. Compact Section Header: height 32px, 16px/700 title, 18px muted icon, 13px primary View All */}
      <div className="h-8 min-h-[32px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="flex items-center text-[#94A3B8] shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]">
              {icon}
            </span>
          )}
          <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
            {title}
          </h2>
          {badge && (
            <span className="text-[11px] font-medium text-[#1E88FF] shrink-0">
              · {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Header Slider Control Arrows (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 bg-[#0B1324] p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => slide('left')}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150 bg-transparent hover:bg-[#1E88FF] text-[#94A3B8] hover:text-white cursor-pointer active:scale-95"
              title={`Slide ${title} Left`}
              aria-label={`Slide ${title} Left`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => slide('right')}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150 bg-transparent hover:bg-[#1E88FF] text-[#94A3B8] hover:text-white cursor-pointer active:scale-95"
              title={`Slide ${title} Right`}
              aria-label={`Slide ${title} Right`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View All Link (13px primary) */}
          {viewAllPath && (
            <button
              type="button"
              onClick={() => navigate(viewAllPath)}
              className="text-[13px] font-semibold text-[#1E88FF] hover:opacity-85 flex items-center gap-0.5 transition-opacity duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Slider Viewport */}
      <div className="relative -mx-4 sm:mx-0">
        {/* Left Floating Arrow on Track */}
        <button
          type="button"
          onClick={() => slide('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#050A14]/90 hover:bg-[#1E88FF] text-white border border-white/15 items-center justify-center transition-opacity duration-150 opacity-0 group-hover/slider:opacity-100 shadow-xl cursor-pointer"
          title="Previous"
          aria-label="Previous items"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right Floating Arrow on Track */}
        <button
          type="button"
          onClick={() => slide('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-[#050A14]/90 hover:bg-[#1E88FF] text-white border border-white/15 items-center justify-center transition-opacity duration-150 opacity-0 group-hover/slider:opacity-100 shadow-xl cursor-pointer"
          title="Next"
          aria-label="Next items"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Left Gradient Edge Fade */}
        {canScrollLeft && (
          <div className="hidden sm:block pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#050A14]/90 to-transparent z-10 transition-opacity duration-150" />
        )}

        {/* Right Gradient Edge Fade */}
        {canScrollRight && (
          <div className="hidden sm:block pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050A14]/90 to-transparent z-10 transition-opacity duration-150" />
        )}

        {/* Sliding Cards Track: 10px gap, 16px horizontal padding, snap-x snap-proximity */}
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
          className={`flex items-start gap-[10px] overflow-x-auto no-scrollbar snap-x snap-proximity pb-1 pt-0.5 px-4 sm:px-0 scroll-pl-4 sm:scroll-pl-0 ${
            isDraggingState ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          onClickCapture={(e) => {
            if (hasDraggedRef.current) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
        >
          {animes.slice(0, 12).map((anime, idx) => (
            <div
              key={`slider-${title.toLowerCase().replace(/\s+/g, '-')}-${anime.id || anime.slug}-${idx}`}
              className="flex-none w-[clamp(96px,26vw,120px)] sm:w-[132px] lg:w-[160px] snap-start"
              draggable={false}
            >
              <AnimeCard
                anime={anime}
                showRankingBadge={showRankingBadge ? idx + 1 : undefined}
                navigate={navigate}
                onShowMessage={onShowMessage}
                priority={idx < 4}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
