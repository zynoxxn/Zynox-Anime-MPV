import React from 'react';

/**
 * Single Portrait Anime Card Skeleton (used in Trending, Popular, Explore, Related grids)
 */
export const AnimeCardSkeleton: React.FC = () => (
  <div className="flex flex-col animate-pulse select-none">
    {/* 2:3 Aspect Ratio Poster */}
    <div className="relative aspect-[2/3] bg-[#081426] rounded-lg sm:rounded-xl border border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      {/* Top right type tag placeholder */}
      <div className="absolute top-1.5 right-1.5 w-7 h-3.5 bg-white/10 rounded" />
    </div>
    {/* Title & Metadata below poster */}
    <div className="pt-2 space-y-1.5">
      <div className="h-3 sm:h-3.5 bg-white/10 rounded w-4/5" />
      <div className="h-2 sm:h-2.5 bg-white/5 rounded w-1/2" />
    </div>
  </div>
);

/**
 * Landscape Episode Card Skeleton (Desktop 16:9 card used in Latest Episodes & Scheduled Anime)
 */
export const LandscapeCardSkeleton: React.FC = () => (
  <div className="flex flex-col animate-pulse select-none">
    {/* 16:9 Landscape Thumbnail */}
    <div className="relative aspect-video bg-[#081426] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
      {/* Center play button circle placeholder */}
      <div className="w-9 h-9 rounded-full bg-white/10 border border-white/5" />
      {/* Top right ep badge placeholder */}
      <div className="absolute top-2 right-2 w-12 h-4 bg-white/10 rounded" />
    </div>
    {/* Title & info below thumbnail */}
    <div className="pt-2 space-y-1.5">
      <div className="h-3.5 bg-white/10 rounded w-3/4" />
      <div className="h-2.5 bg-white/5 rounded w-1/3" />
    </div>
  </div>
);

/**
 * Mobile Episode Row Skeleton (Stacked horizontal row for small screens)
 */
export const MobileEpisodeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-2 rounded-xl bg-[#081426]/70 border border-white/5 animate-pulse select-none">
    <div className="relative w-28 sm:w-32 aspect-video bg-[#050A14] rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
      <div className="w-7 h-7 rounded-full bg-white/10" />
    </div>
    <div className="flex-1 space-y-2 min-w-0">
      <div className="h-3.5 bg-white/10 rounded w-3/4" />
      <div className="h-2.5 bg-white/5 rounded w-1/3" />
    </div>
  </div>
);

/**
 * Full Hero Carousel Banner Skeleton
 */
export const HeroSkeleton: React.FC = () => (
  <div className="w-full h-[360px] sm:h-[440px] md:h-[500px] bg-[#07111F] border border-white/10 rounded-2xl sm:rounded-3xl animate-pulse p-5 sm:p-8 md:p-12 flex flex-col justify-end relative overflow-hidden shadow-2xl">
    {/* Ambient radial glow background effect */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/70 to-transparent z-10" />

    <div className="relative z-20 space-y-4 max-w-xl">
      {/* Spotlight badge */}
      <div className="h-5 bg-[#1683FF]/25 border border-[#1683FF]/30 rounded-full w-28" />

      {/* Main Title */}
      <div className="space-y-2">
        <div className="h-8 sm:h-11 bg-white/15 rounded-xl w-4/5" />
        <div className="h-6 sm:h-8 bg-white/10 rounded-xl w-3/5" />
      </div>

      {/* Synopsis teaser */}
      <div className="space-y-1.5 pt-1">
        <div className="h-3 sm:h-3.5 bg-white/10 rounded w-full" />
        <div className="h-3 sm:h-3.5 bg-white/5 rounded w-2/3" />
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-3 pt-3">
        <div className="h-11 bg-[#1683FF]/40 rounded-xl w-32 sm:w-36" />
        <div className="h-11 bg-white/10 rounded-xl w-28 sm:w-32" />
      </div>
    </div>

    {/* Carousel dots indicators placeholder */}
    <div className="absolute bottom-4 right-6 z-20 flex gap-1.5">
      <div className="w-6 h-1.5 bg-[#1683FF]/50 rounded-full" />
      <div className="w-2 h-1.5 bg-white/20 rounded-full" />
      <div className="w-2 h-1.5 bg-white/20 rounded-full" />
    </div>
  </div>
);

/**
 * Section Header Skeleton (Title pill + title text + view all link)
 */
export const SectionHeaderSkeleton: React.FC<{ titleWidth?: string }> = ({
  titleWidth = 'w-32 sm:w-40',
}) => (
  <div className="flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-2">
      <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF]/50 rounded-full inline-block" />
      <div className={`h-4 sm:h-5 bg-white/10 rounded ${titleWidth}`} />
    </div>
    <div className="h-3 bg-white/5 rounded w-16" />
  </div>
);

export const AnimeSliderSkeleton: React.FC<{ titleWidth?: string }> = ({
  titleWidth = 'w-32',
}) => (
  <section className="space-y-3 sm:space-y-4">
    <SectionHeaderSkeleton titleWidth={titleWidth} />
    <div className="flex items-center gap-2.5 sm:gap-3.5 overflow-hidden">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={`slider-skel-${i}`} className="w-[115px] sm:w-[135px] md:w-[155px] lg:w-[170px] xl:w-[180px] shrink-0">
          <AnimeCardSkeleton />
        </div>
      ))}
    </div>
  </section>
);

/**
 * Comprehensive HomeView Sections Skeleton (placed directly below Hero Banner)
 */
export const HomeSectionsSkeleton: React.FC = () => (
  <div className="space-y-7 sm:space-y-9">
    {/* 1. Trending Now Skeleton (Slider) */}
    <AnimeSliderSkeleton titleWidth="w-32" />

    {/* 2. Latest Episodes Skeleton (Landscape cards on desktop, rows on mobile) */}
    <section className="space-y-3 sm:space-y-4">
      <SectionHeaderSkeleton titleWidth="w-36" />
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LandscapeCardSkeleton key={`ep-skel-desk-${i}`} />
        ))}
      </div>
      <div className="md:hidden space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <MobileEpisodeRowSkeleton key={`ep-skel-mob-${i}`} />
        ))}
      </div>
    </section>

    {/* 3. Latest Anime Skeleton (Slider) */}
    <AnimeSliderSkeleton titleWidth="w-36" />

    {/* 4. Popular Anime Skeleton (Slider) */}
    <AnimeSliderSkeleton titleWidth="w-32" />

    {/* 5. Scheduled Anime Skeleton */}
    <section className="space-y-3 sm:space-y-4 pt-1">
      <SectionHeaderSkeleton titleWidth="w-36" />
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LandscapeCardSkeleton key={`sched-skel-desk-${i}`} />
        ))}
      </div>
      <div className="md:hidden space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <MobileEpisodeRowSkeleton key={`sched-skel-mob-${i}`} />
        ))}
      </div>
    </section>

    {/* 6. Explore Anime Skeleton with Category Pills */}
    <section className="space-y-3 sm:space-y-4 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-pulse">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF]/50 rounded-full inline-block" />
          <div className="h-4 sm:h-5 bg-white/10 rounded w-32" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`filter-skel-${i}`} className="h-7 w-16 bg-[#07111F] rounded-full border border-white/5 shrink-0" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <AnimeCardSkeleton key={`explore-skel-${i}`} />
        ))}
      </div>
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AnimeCardSkeleton key={`detail-rel-skel-${i}`} />
        ))}
      </div>
    </div>
  </div>
);


