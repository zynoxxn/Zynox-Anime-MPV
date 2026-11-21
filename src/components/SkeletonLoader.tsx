import React from 'react';
import { HERO_BLUR_PLACEHOLDER_BASE64 } from '../lib/image-optimizer';

/**
 * Single Portrait Anime Card Skeleton with Shimmer Wave Animation
 * (used in Trending, Popular, Explore, Browse, and Related grids)
 */
export const AnimeCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col select-none group/skel min-w-0 ${className}`}>
    {/* 2:3 Aspect Ratio Poster with shimmer wave */}
    <div className="relative aspect-[2/3] bg-[#0B1324] rounded-[10px] border border-white/5 overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none" />
    </div>

    {/* Compact 2 lines below poster (mt-6px, 12px title + 11px meta) */}
    <div className="mt-[6px] space-y-1">
      <div className="relative h-3 bg-white/10 rounded w-4/5 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <div className="relative h-2.5 bg-white/5 rounded w-1/2 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  </div>
);

/**
 * Grid of Anime Card Skeletons
 */
export const AnimeGridSkeleton: React.FC<{
  count?: number;
  columns?: 'home' | 'browse' | 'default';
  className?: string;
}> = ({
  count = 12,
  className = '',
}) => {
  const gridColsClass =
    className ||
    'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-[10px] sm:gap-3';

  return (
    <div className={gridColsClass}>
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={`anime-card-skel-${i}`} />
      ))}
    </div>
  );
};

/**
 * Compact Episode Row Skeleton (64px height, 88x50 thumbnail)
 */
export const LandscapeCardSkeleton: React.FC = () => (
  <div className="h-[64px] flex items-center gap-2.5 px-2 rounded-[10px] bg-[#0B1324] border border-white/5 animate-pulse select-none">
    <div className="w-[88px] h-[50px] bg-[#050A14] rounded-[6px] shrink-0 border border-white/5" />
    <div className="flex-1 space-y-1.5 min-w-0">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2.5 bg-white/5 rounded w-1/3" />
    </div>
  </div>
);

/**
 * Mobile Episode Row Skeleton (matches 64px height, 88x50 thumbnail)
 */
export const MobileEpisodeRowSkeleton: React.FC = () => (
  <div className="h-[64px] flex items-center gap-2.5 px-2 rounded-[10px] bg-[#0B1324] border border-white/5 animate-pulse select-none">
    <div className="w-[88px] h-[50px] bg-[#050A14] rounded-[6px] shrink-0 border border-white/5" />
    <div className="flex-1 space-y-1.5 min-w-0">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2.5 bg-white/5 rounded w-1/3" />
    </div>
  </div>
);

/**
 * Full-Bleed Edge-to-Edge Hero Banner Skeleton (zero border, zero radius, exact height)
 */
export const HeroSkeleton: React.FC = () => (
  <div
    className="relative w-full h-[clamp(400px,62dvh,540px)] md:h-[560px] lg:h-[clamp(520px,72vh,720px)] bg-[#050A14] overflow-hidden animate-pulse select-none"
    style={{
      background:
        'radial-gradient(circle at 75% 25%, rgba(30, 136, 255, 0.2) 0%, rgba(11, 22, 44, 0.92) 48%, #050A14 100%)',
    }}
  >
    {/* Immediate base64 blurry background */}
    <img
      src={HERO_BLUR_PLACEHOLDER_BASE64}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-80 pointer-events-none"
    />
    {/* Seamless bottom blend gradient */}
    <div
      className="absolute inset-0 z-10 pointer-events-none"
      style={{
        background:
          'linear-gradient(to top, #050A14 0%, rgba(5,10,20,0.92) 18%, rgba(5,10,20,0.5) 45%, transparent 75%)',
      }}
    />

    <div className="relative z-20 max-w-[1600px] mx-auto w-full h-full flex flex-col justify-end gap-[10px] px-4 md:px-8 lg:px-10 pt-20 pb-[28px]">
      {/* Title placeholder */}
      <div className="space-y-2 max-w-xl">
        <div className="h-8 sm:h-11 bg-white/15 rounded-lg w-4/5" />
        <div className="h-7 sm:h-9 bg-white/10 rounded-lg w-3/5" />
      </div>

      {/* Genres line placeholder */}
      <div className="h-3.5 bg-white/10 rounded w-48" />

      {/* Buttons + right-aligned dots placeholder */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-[44px] w-[108px] bg-[#1E88FF]/40 rounded-full" />
          <div className="h-[44px] w-[118px] bg-white/10 border border-white/20 rounded-full" />
        </div>
        <div className="flex items-center gap-[6px]">
          <div className="w-[18px] h-[6px] bg-[#1E88FF]/50 rounded-full" />
          <div className="w-[6px] h-[6px] bg-white/25 rounded-full" />
          <div className="w-[6px] h-[6px] bg-white/25 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Section Header Skeleton (32px height, 16px title + view all link)
 */
export const SectionHeaderSkeleton: React.FC<{ titleWidth?: string }> = ({
  titleWidth = 'w-28 sm:w-36',
}) => (
  <div className="h-8 min-h-[32px] flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-2">
      <div className="w-[18px] h-[18px] bg-white/10 rounded" />
      <div className={`h-4 bg-white/10 rounded ${titleWidth}`} />
    </div>
    <div className="h-3 bg-white/5 rounded w-14" />
  </div>
);

export const AnimeSliderSkeleton: React.FC<{ titleWidth?: string }> = ({
  titleWidth = 'w-32',
}) => (
  <section className="space-y-2.5 sm:space-y-3">
    <SectionHeaderSkeleton titleWidth={titleWidth} />
    <div className="-mx-4 sm:mx-0">
      <div className="flex items-start gap-[10px] overflow-hidden px-4 sm:px-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`slider-skel-${i}`}
            className="flex-none w-[clamp(96px,26vw,120px)] sm:w-[132px] lg:w-[160px]"
          >
            <AnimeCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  </section>
);

/**
 * Comprehensive HomeView Sections Skeleton (placed directly below full-bleed Hero Banner)
 */
export const HomeSectionsSkeleton: React.FC = () => (
  <div className="space-y-5 sm:space-y-8">
    {/* 1. Trending Now Skeleton (Slider) */}
    <AnimeSliderSkeleton titleWidth="w-32" />

    {/* 2. Latest Episodes Skeleton */}
    <section className="space-y-2.5 sm:space-y-3">
      <SectionHeaderSkeleton titleWidth="w-36" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <LandscapeCardSkeleton key={`ep-skel-${i}`} />
        ))}
      </div>
    </section>

    {/* 3. Popular Anime Skeleton (Slider) */}
    <AnimeSliderSkeleton titleWidth="w-32" />

    {/* 4. Recently Added Skeleton (Slider) */}
    <AnimeSliderSkeleton titleWidth="w-36" />

    {/* 5. Explore Anime Skeleton */}
    <section className="space-y-2.5 sm:space-y-3">
      <SectionHeaderSkeleton titleWidth="w-36" />
      <AnimeGridSkeleton columns="home" count={12} />
    </section>
  </div>
);

/**
 * RightSidebar Top Anime Skeleton Rows
 */
export const RightSidebarTopAnimeSkeleton: React.FC = () => (
  <div className="space-y-2.5 animate-pulse">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={`rs-skel-${i}`} className="flex items-center gap-2.5 p-1.5 rounded-xl">
        <div className="w-5 h-4 bg-white/10 rounded shrink-0" />
        <div className="w-9 h-12 rounded-lg bg-[#050A14] border border-white/5 shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3 bg-white/10 rounded w-3/4" />
          <div className="h-2 bg-white/5 rounded w-1/2" />
        </div>
        <div className="w-7 h-3.5 bg-amber-400/20 rounded shrink-0" />
      </div>
    ))}
  </div>
);

/**
 * Episode List Item Skeleton (used inside AnimeDetailView EpisodeSelector)
 */
export const EpisodeListSkeleton: React.FC = () => (
  <div className="space-y-2.5 animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={`ep-item-skel-${i}`}
        className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl bg-[#081426]/60 border border-white/5"
      >
        <div className="relative w-24 sm:w-32 aspect-video bg-[#050A14] rounded-xl shrink-0 border border-white/5 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-white/10" />
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3 bg-[#1683FF]/30 rounded w-20" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-2.5 bg-white/5 rounded w-4/5 hidden sm:block" />
        </div>
        <div className="w-8 h-8 rounded-xl bg-white/5 shrink-0" />
      </div>
    ))}
  </div>
);

/**
 * Full Page Skeleton for AnimeDetailView
 */
export const AnimeDetailSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 animate-pulse select-none">
    {/* Top Breadcrumb Navigation Placeholder */}
    <div className="flex items-center justify-between gap-2">
      <div className="h-4 bg-white/10 rounded w-28" />
      <div className="w-8 h-8 bg-[#07111F] rounded-xl border border-white/5" />
    </div>

    {/* 1. Header / Hero Details Card Skeleton */}
    <div className="bg-[#07111F] border border-white/[0.06] rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
        {/* Large Poster Container (2:3 aspect) */}
        <div className="relative w-44 sm:w-56 md:w-64 aspect-[2/3] shrink-0 rounded-2xl bg-[#050A14] border border-[#1683FF]/20 shadow-2xl overflow-hidden flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-white/5" />
        </div>

        {/* Info Column */}
        <div className="flex-1 text-center md:text-left space-y-4 w-full">
          {/* Metadata Badges Row */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <div className="h-6 w-12 bg-white/10 rounded-lg" />
            <div className="h-6 w-14 bg-white/5 rounded-lg" />
            <div className="h-6 w-16 bg-white/5 rounded-lg" />
            <div className="h-6 w-20 bg-emerald-500/15 border border-emerald-500/20 rounded-lg" />
            <div className="h-6 w-24 bg-[#1683FF]/15 border border-[#1683FF]/20 rounded-lg" />
          </div>

          {/* Title & Alternate Title */}
          <div className="space-y-2">
            <div className="h-8 sm:h-11 md:h-12 bg-white/15 rounded-xl w-4/5 mx-auto md:mx-0" />
            <div className="h-4 bg-white/5 rounded w-1/3 mx-auto md:mx-0" />
          </div>

          {/* Rating & Studio Line */}
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="h-4 w-14 bg-amber-400/20 rounded" />
            <div className="h-4 w-32 bg-white/5 rounded" />
          </div>

          {/* Synopsis lines */}
          <div className="space-y-2 max-w-2xl mx-auto md:mx-0 pt-1">
            <div className="h-3.5 bg-white/10 rounded w-full" />
            <div className="h-3.5 bg-white/10 rounded w-5/6" />
            <div className="h-3.5 bg-white/5 rounded w-3/4" />
          </div>

          {/* Genre Chips */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
            <div className="h-6 w-16 bg-[#050A14] border border-white/5 rounded-xl" />
            <div className="h-6 w-20 bg-[#050A14] border border-white/5 rounded-xl" />
            <div className="h-6 w-16 bg-[#050A14] border border-white/5 rounded-xl" />
            <div className="h-6 w-24 bg-[#050A14] border border-white/5 rounded-xl" />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
            <div className="h-11 sm:h-12 w-36 sm:w-40 bg-[#1683FF]/40 rounded-xl" />
            <div className="h-11 sm:h-12 w-32 bg-emerald-500/20 border border-emerald-500/30 rounded-xl" />
            <div className="h-11 sm:h-12 w-28 bg-white/10 rounded-xl" />
            <div className="h-11 sm:h-12 w-12 bg-white/10 rounded-xl" />
            <div className="h-11 sm:h-12 w-12 bg-white/10 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    {/* 2. Episode Selector Container Skeleton */}
    <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#1683FF]/50 rounded-full" />
          <div className="h-5 bg-white/10 rounded w-28" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-40 sm:w-56 bg-[#050A14] rounded-xl border border-white/5" />
          <div className="h-9 w-24 bg-[#050A14] rounded-xl border border-white/5" />
        </div>
      </div>
      <EpisodeListSkeleton />
    </div>

    {/* 3. Related Anime Skeleton */}
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <div className="w-4 h-4 bg-[#1683FF]/30 rounded" />
        <div className="h-5 bg-white/10 rounded w-32" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-[10px] sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AnimeCardSkeleton key={`detail-rel-skel-${i}`} />
        ))}
      </div>
    </div>
  </div>
);


