import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import type { Anime } from '../types/anime';
import type { WatchProgress } from '../types/library';
import type { LatestEpisodeItem } from '../lib/firestore/episodes';
import type { CmsScheduleItem } from '../types/cms';
import {
  getPublishedAnimes,
  getTrendingAnimes,
  getPopularAnimes,
  getFeaturedAnimes,
  isAnimeDeleted,
  getAnimeUploadTimestamp,
} from '../lib/firestore/anime';
import { getCmsHeroBanners, getCmsSchedule } from '../lib/firestore/cms';
import { getLatestReleasedEpisodes } from '../lib/firestore/episodes';
import { getContinueWatching } from '../lib/firestore/user-activity';
import { HeroSkeleton, HomeSectionsSkeleton } from '../components/SkeletonLoader';
import { LeftSidebar } from '../components/LeftSidebar';
import { RightSidebar } from '../components/RightSidebar';
import { HeroBanner } from '../components/HeroBanner';
import { AnimeSliderSection } from '../components/AnimeSliderSection';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeGrid } from '../components/AnimeGrid';
import { EpisodeCard } from '../components/EpisodeCard';
import { ScheduledCard } from '../components/ScheduledCard';
import { usePageSeo } from '../hooks/usePageSeo';
import { ChevronLeft, ChevronRight, Play, Calendar, Clock, Compass, Sparkles } from 'lucide-react';

interface HomeViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
  onOpenLegal?: (tab: 'about' | 'dmca' | 'disclaimer') => void;
}

// Fallback high-quality latest episodes
const EXPLORE_FILTERS = ['All', 'Action', 'Romance', 'Fantasy', 'Comedy', 'Drama', 'Sci-Fi', 'Top Rated'];

const FALLBACK_LATEST_EPISODES: LatestEpisodeItem[] = [
  {
    animeTitle: 'The Angel Next Door Spoils Me Rotten',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    animePoster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    episode: {
      id: 'ep-anime-angel-next-door-1',
      animeId: 'anime-angel-next-door',
      episodeNumber: 1,
      title: 'Episode 1: Meeting the Angel',
      thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      duration: 1440,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    } as any,
  },
  {
    animeTitle: 'Alya Sometimes Hides Her Feelings in Russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    animePoster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    episode: {
      id: 'ep-anime-alya-russian-1',
      animeId: 'anime-alya-russian',
      episodeNumber: 1,
      title: 'Episode 1: Secret Whispers in Russian',
      thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      duration: 1440,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    } as any,
  },
];

export const HomeView: React.FC<HomeViewProps> = ({ navigate, onShowMessage, onOpenLegal }) => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [featuredAnimes, setFeaturedAnimes] = useState<Anime[]>([]);
  const [trending, setTrending] = useState<Anime[]>([]);
  const [popular, setPopular] = useState<Anime[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Anime[]>([]);
  const [latestEpisodes, setLatestEpisodes] = useState<LatestEpisodeItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [scheduledAnime, setScheduledAnime] = useState<CmsScheduleItem[]>([]);
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [exploreFilter, setExploreFilter] = useState<string>('All');
  const [isFilterTransitioning, setIsFilterTransitioning] = useState<boolean>(false);
  const filterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleExploreFilterChange = (filter: string) => {
    if (filter === exploreFilter) return;
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    setIsFilterTransitioning(true);
    setExploreFilter(filter);
    filterTimerRef.current = setTimeout(() => {
      setIsFilterTransitioning(false);
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    };
  }, []);

  // Dynamic Homepage SEO
  usePageSeo({
    title: 'ZYNOX ANIME — Watch & Download Anime in Hindi Dub & English Sub 1080p HD',
    description: 'Stream and download your favorite anime series and movies in Hindi Dub and English Sub. High speed streaming, zero ads, and 720p/1080p batch zip downloads on ZYNOX ANIME.',
    keywords: 'anime hindi dub, download anime in hindi, watch anime online, hindi anime download, 1080p anime, anime batch zip download, ZYNOX ANIME',
    ogType: 'website',
  });

  // Continue Watching slide & drag state
  const continueWatchingRef = useRef<HTMLDivElement>(null);
  const [isDraggingCW, setIsDraggingCW] = useState(false);
  const [startXCW, setStartXCW] = useState(0);
  const [scrollLeftCW, setScrollLeftCW] = useState(0);
  const [hasDraggedCW, setHasDraggedCW] = useState(false);

  const scrollContinueWatching = (direction: 'left' | 'right') => {
    const el = continueWatchingRef.current;
    if (!el) return;
    const scrollStep = Math.max(260, Math.floor(el.clientWidth * 0.7));
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (maxScroll <= 0) return;

    let target = direction === 'right' ? el.scrollLeft + scrollStep : el.scrollLeft - scrollStep;
    if (direction === 'right' && el.scrollLeft >= maxScroll - 10) {
      target = 0;
    } else if (direction === 'left' && el.scrollLeft <= 10) {
      target = maxScroll;
    } else {
      target = Math.max(0, Math.min(maxScroll, target));
    }

    try {
      el.scrollTo({ left: target, behavior: 'smooth' });
    } catch {
      el.scrollLeft = target;
    }
  };

  const handleMouseDownCW = (e: React.MouseEvent) => {
    const el = continueWatchingRef.current;
    if (!el) return;
    setIsDraggingCW(true);
    setHasDraggedCW(false);
    setStartXCW(e.clientX);
    setScrollLeftCW(el.scrollLeft);
  };

  const handleMouseMoveCW = (e: React.MouseEvent) => {
    if (!isDraggingCW || !continueWatchingRef.current) return;
    const el = continueWatchingRef.current;
    const delta = e.clientX - startXCW;
    if (Math.abs(delta) > 3) {
      setHasDraggedCW(true);
      el.scrollLeft = scrollLeftCW - delta;
    }
  };

  const handleMouseUpOrLeaveCW = () => {
    setIsDraggingCW(false);
    setTimeout(() => setHasDraggedCW(false), 80);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingCW(false);
      setTimeout(() => setHasDraggedCW(false), 80);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [
          all,
          cmsBanners,
          featuredList,
          trendingList,
          popularList,
          latestEpList,
          progressList,
          scheduleList,
        ] = await Promise.all([
          getPublishedAnimes().catch((err) => {
            console.warn('getPublishedAnimes fallback:', err);
            return [];
          }),
          getCmsHeroBanners().catch(() => []),
          getFeaturedAnimes().catch(() => []),
          getTrendingAnimes(24).catch(() => []),
          getPopularAnimes(24).catch(() => []),
          getLatestReleasedEpisodes(10).catch(() => []),
          getContinueWatching(user?.uid || null).catch(() => []),
          getCmsSchedule().catch(() => []),
        ]);

        if (isMounted) {
          // Build set of anime IDs and slugs that have been explicitly unfeatured
          const unfeaturedAnimeKeys = new Set<string>();
          for (const anime of all) {
            if (anime.featured === false || anime.isFeatured === false) {
              if (anime.id) unfeaturedAnimeKeys.add(anime.id.toLowerCase());
              if (anime.slug) unfeaturedAnimeKeys.add(anime.slug.toLowerCase());
            }
          }

          // Identify custom CMS hero banners vs hardcoded mock banners, excluding unfeatured or deleted animes
          const defaultBannerIds = new Set(['hero-alya-russian', 'hero-angel-next-door']);
          const activeCms = (cmsBanners || []).filter((b) => {
            if (b.active === false) return false;
            const animeIdKey = (b.animeId || '').toLowerCase();
            const animeSlugKey = (b.animeSlug || '').toLowerCase();
            if (animeIdKey && unfeaturedAnimeKeys.has(animeIdKey)) return false;
            if (animeSlugKey && unfeaturedAnimeKeys.has(animeSlugKey)) return false;
            if (isAnimeDeleted(b.animeId) || isAnimeDeleted(b.animeSlug) || isAnimeDeleted(b.id)) return false;
            return true;
          });
          const customCms = activeCms.filter((b) => b.id && !defaultBannerIds.has(b.id));

          // Combine spotlight items:
          // 1. Any custom hero banners created in Admin Hero Banners CMS
          // 2. Any animes marked as Featured / Spotlight (featuredList)
          // 3. Deduplicate so an anime doesn't appear twice
          const combinedSpotlight: any[] = [];
          const seenKeys = new Set<string>();

          // Add custom CMS banners first
          for (const banner of customCms) {
            const key = banner.animeId || banner.animeSlug || banner.id;
            if (key && !seenKeys.has(key)) {
              seenKeys.add(key);
              combinedSpotlight.push(banner);
            }
          }

          // Add user featured animes (Featured Spotlight)
          for (const anime of featuredList) {
            if (anime.featured === false || anime.isFeatured === false) continue;
            if (isAnimeDeleted(anime.id) || (anime.slug && isAnimeDeleted(anime.slug))) continue;
            const idKey = anime.id;
            const slugKey = anime.slug;
            if ((idKey && !seenKeys.has(idKey)) || (slugKey && !seenKeys.has(slugKey))) {
              if (idKey) seenKeys.add(idKey);
              if (slugKey) seenKeys.add(slugKey);
              combinedSpotlight.push(anime);
            }
          }

          // If no custom banners and no user-featured animes, only fall back to non-unfeatured active banners.
          // Never force unfeatured animes into the spotlight.
          const finalFeatured =
            combinedSpotlight.length > 0
              ? combinedSpotlight
              : activeCms.length > 0
              ? activeCms
              : [];

          setFeaturedAnimes(finalFeatured as any);
          setTrending(trendingList.length > 0 ? trendingList : all.slice(0, 24));
          setPopular(popularList.length > 0 ? popularList : all.slice(0, 24));
          setAllAnimes(all.length > 0 ? all : (popularList.length > 0 ? popularList : trendingList));

          // Sort animes by latest upload / creation date for 'Recently Added'
          const sortedRecentlyAdded = [...all].sort((a, b) => {
            return getAnimeUploadTimestamp(b) - getAnimeUploadTimestamp(a);
          });
          setRecentlyAdded(sortedRecentlyAdded.slice(0, 24));

          setLatestEpisodes(latestEpList.length > 0 ? latestEpList : FALLBACK_LATEST_EPISODES);
          
          // Filter continue watching: strictly 7 items max & no deleted animes
          const publishedAnimeIds = new Set<string>();
          all.forEach((a) => {
            if (a.id) publishedAnimeIds.add(a.id);
            if (a.slug) publishedAnimeIds.add(a.slug);
          });
          const validProgress = (progressList || [])
            .filter((p) => !isAnimeDeleted(p.animeId) && !isAnimeDeleted(p.animeSlug) && (publishedAnimeIds.has(p.animeId) || publishedAnimeIds.has(p.animeSlug)))
            .slice(0, 7);
          setContinueWatching(validProgress);
          setScheduledAnime(scheduleList || []);
        }
      } catch (err) {
        console.error('HomeView data loading error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
      {/* 3-COLUMN DESKTOP LAYOUT (Left Sidebar | Main Content | Right Sidebar) */}
      <div className="flex gap-4 xl:gap-6 items-start">
        
        {/* 1. LEFT NAVIGATION SIDEBAR (Desktop) */}
        <LeftSidebar
          currentPath="/"
          navigate={navigate}
          isAdmin={isAdmin}
          onOpenLegal={onOpenLegal}
        />

        {/* 2. MAIN CENTER CONTENT */}
        <main className="flex-1 min-w-0 space-y-6 sm:space-y-8">
          {loading ? (
            <>
              {/* SKELETON SCREENS DURING FIRESTORE FETCH */}
              <HeroSkeleton />
              <HomeSectionsSkeleton />
            </>
          ) : (
            <>
              {/* A. HERO CAROUSEL BANNER */}
              <HeroBanner
                featuredAnimes={featuredAnimes}
                navigate={navigate}
              />

              {/* B. CONTINUE WATCHING (if active sessions exist) */}
              {continueWatching.length > 0 && (
                <section className="space-y-3 relative group/cw">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-[#1683FF] rounded-full inline-block" />
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Continue Watching
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Slider Control Arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollContinueWatching('left')}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#1683FF] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors border border-white/5 shadow-sm"
                      title="Slide Left"
                      aria-label="Slide Continue Watching Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollContinueWatching('right')}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#1683FF] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors border border-white/5 shadow-sm"
                      title="Slide Right"
                      aria-label="Slide Continue Watching Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/history')}
                    className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors ml-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Slider Track with Drag & Smooth Horizontal Scroll */}
              <div className="relative">
                {/* Floating Left Button on Hover (Desktop) */}
                <button
                  type="button"
                  onClick={() => scrollContinueWatching('left')}
                  className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-[#1683FF] text-white border border-white/10 items-center justify-center transition-all opacity-0 group-hover/cw:opacity-100 shadow-xl backdrop-blur-sm"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={continueWatchingRef}
                  onMouseDown={handleMouseDownCW}
                  onMouseMove={handleMouseMoveCW}
                  onMouseUp={handleMouseUpOrLeaveCW}
                  onMouseLeave={handleMouseUpOrLeaveCW}
                  onDragStart={(e) => e.preventDefault()}
                  style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
                  className={`flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 cursor-grab active:cursor-grabbing select-none ${
                    isDraggingCW ? 'cursor-grabbing !scroll-auto' : 'scroll-smooth'
                  }`}
                >
                  {continueWatching.map((item) => (
                    <div
                      key={item.animeId + item.episodeNumber}
                      onClick={() => {
                        if (!hasDraggedCW) {
                          navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`);
                        }
                      }}
                      className="w-[190px] sm:w-[220px] shrink-0 group/card bg-[#081426] border border-white/5 hover:border-[#1683FF]/40 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col shadow-md hover:-translate-y-0.5"
                    >
                      <div className="relative aspect-video bg-[#050A14] overflow-hidden">
                        {item.animePoster && (
                          <img
                            src={item.animePoster}
                            alt={item.animeTitle}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 pointer-events-none"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                          <div className="w-7 h-7 rounded-full bg-[#1683FF] text-white flex items-center justify-center group-hover/card:scale-110 transition-transform shadow-md">
                            <Play className="w-3 h-3 fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 pointer-events-none">
                          <div
                            className="h-full bg-gradient-to-r from-[#1683FF] to-[#00CFFF]"
                            style={{ width: `${Math.max(5, Math.min(100, item.percentage || 10))}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2 sm:p-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate group-hover/card:text-[#00CFFF]">
                            {item.animeTitle}
                          </h4>
                          <span className="text-[10px] font-bold text-[#1683FF] shrink-0">
                            {item.percentage || 10}%
                          </span>
                        </div>
                        <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                          EP {item.episodeNumber}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Floating Right Button on Hover (Desktop) */}
                <button
                  type="button"
                  onClick={() => scrollContinueWatching('right')}
                  className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-[#1683FF] text-white border border-white/10 items-center justify-center transition-all opacity-0 group-hover/cw:opacity-100 shadow-xl backdrop-blur-sm"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* C. TRENDING ANIME SLIDER */}
          <AnimeSliderSection
            id="section-trending-anime"
            title="Trending Anime"
            animes={trending}
            viewAllPath="/browse?sort=popular"
            navigate={navigate}
            onShowMessage={onShowMessage}
            showRankingBadge={true}
          />

          {/* D. LATEST EPISODES SECTION (Strictly 4 episodes as requested) */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF] rounded-full inline-block" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Latest Episodes
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/browse?sort=latest')}
                className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desktop Landscape Cards (Strictly 4 items) */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {latestEpisodes.slice(0, 4).map((epItem, idx) => (
                <EpisodeCard
                  key={`latest-desk-${epItem.episode?.id || epItem.animeSlug}-${epItem.episode?.episodeNumber || idx}-${idx}`}
                  item={epItem}
                  navigate={navigate}
                  variant="landscape-card"
                />
              ))}
            </div>

            {/* Mobile Vertical Episode Stack Rows (Strictly 4 items) */}
            <div className="md:hidden space-y-2.5">
              {latestEpisodes.slice(0, 4).map((epItem, idx) => (
                <EpisodeCard
                  key={`latest-mob-${epItem.episode?.id || epItem.animeSlug}-${epItem.episode?.episodeNumber || idx}-${idx}`}
                  item={epItem}
                  navigate={navigate}
                  variant="mobile-row"
                />
              ))}
            </div>
          </section>

          {/* E. RECENTLY ADDED ANIME SLIDER */}
          {recentlyAdded.length > 0 && (
            <AnimeSliderSection
              id="section-recently-added"
              title="Recently Added"
              icon={<Sparkles className="w-4 h-4 text-[#00CFFF]" />}
              badge="NEW"
              animes={recentlyAdded}
              viewAllPath="/browse?sort=latest"
              navigate={navigate}
              onShowMessage={onShowMessage}
            />
          )}

          {/* F. POPULAR ANIME SLIDER */}
          {popular.length > 0 && (
            <AnimeSliderSection
              id="section-popular-anime"
              title="Popular Anime"
              animes={popular}
              viewAllPath="/browse?sort=rating"
              navigate={navigate}
              onShowMessage={onShowMessage}
              showRankingBadge={true}
            />
          )}

          {/* F. SCHEDULED ANIME SECTION (Below Popular Anime) */}
          {scheduledAnime.length > 0 && (
            <section className="space-y-3 sm:space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF] rounded-full inline-block" />
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Scheduled Anime
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/schedule')}
                  className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Desktop Landscape Cards (Strictly 4 items like Latest Episodes) */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {scheduledAnime.slice(0, 4).map((item, idx) => (
                  <ScheduledCard
                    key={`scheduled-desk-${item.id || item.animeSlug}-${item.episodeNumber || idx}-${idx}`}
                    item={item}
                    navigate={navigate}
                    variant="landscape-card"
                  />
                ))}
              </div>

              {/* Mobile Vertical Episode Stack Rows (Strictly 4 items like Latest Episodes) */}
              <div className="md:hidden space-y-2.5">
                {scheduledAnime.slice(0, 4).map((item, idx) => (
                  <ScheduledCard
                    key={`scheduled-mob-${item.id || item.animeSlug}-${item.episodeNumber || idx}-${idx}`}
                    item={item}
                    navigate={navigate}
                    variant="mobile-row"
                  />
                ))}
              </div>
            </section>
          )}

          {/* G. EXPLORE ANIME SECTION (Below Scheduled Anime) */}
          {allAnimes.length > 0 && (
            <section className="space-y-3 sm:space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-3.5 sm:h-4 bg-[#1683FF] rounded-full inline-block" />
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#00CFFF]" />
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      Explore Anime
                    </h2>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  {/* Genre / Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[calc(100vw-120px)] sm:max-w-none">
                    {EXPLORE_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => handleExploreFilterChange(filter)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                          exploreFilter === filter
                            ? 'bg-[#1683FF] text-white shadow-sm shadow-[#1683FF]/30'
                            : 'bg-[#07111F] hover:bg-[#0E1E38] text-[#94A3B8] hover:text-white border border-white/5'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (exploreFilter === 'Top Rated') {
                        navigate('/browse?sort=rating');
                      } else if (exploreFilter !== 'All') {
                        navigate(`/browse?genre=${encodeURIComponent(exploreFilter)}`);
                      } else {
                        navigate('/browse');
                      }
                    }}
                    className="text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ml-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Anime Cards Grid with Shimmer Skeleton Loading */}
              {(() => {
                const filteredExplore = (() => {
                  if (exploreFilter === 'All') {
                    return allAnimes.slice(0, 14);
                  }
                  if (exploreFilter === 'Top Rated') {
                    return [...allAnimes]
                      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
                      .slice(0, 14);
                  }
                  const matches = allAnimes.filter((a) =>
                    a.genres?.some((g) => g.toLowerCase().includes(exploreFilter.toLowerCase()))
                  );
                  return matches.length > 0 ? matches.slice(0, 14) : [];
                })();

                return (
                  <AnimeGrid
                    id="home-explore-anime-grid"
                    animes={filteredExplore}
                    loading={isFilterTransitioning}
                    skeletonCount={14}
                    columns="home"
                    navigate={navigate}
                    onShowMessage={onShowMessage}
                    emptyState={
                      <div className="py-8 text-center bg-[#07111F]/50 rounded-2xl border border-white/5">
                        <p className="text-sm text-[#94A3B8]">No anime found in &ldquo;{exploreFilter}&rdquo;</p>
                        <button
                          type="button"
                          onClick={() => handleExploreFilterChange('All')}
                          className="mt-2 text-xs font-semibold text-[#1683FF] hover:text-[#00CFFF]"
                        >
                          Show All
                        </button>
                      </div>
                    }
                  />
                );
              })()}
            </section>
          )}
            </>
          )}
        </main>

        {/* 3. RIGHT DISCOVERY SIDEBAR (Top Anime, Genres, Community) */}
        <RightSidebar
          topAnimes={popular}
          loading={loading}
          navigate={navigate}
        />
      </div>
    </div>
  );
};
