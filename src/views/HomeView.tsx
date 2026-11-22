import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import type { Anime } from '../types/anime';
import type { WatchProgress } from '../types/library';
import type { LatestEpisodeItem } from '../lib/firestore/episodes';
import type { CmsScheduleItem } from '../types/cms';
import {
  getPublishedAnimes,
  getCachedPublishedAnimes,
  isAnimeDeleted,
  getAnimeUploadTimestamp,
  isHentaiAnime,
} from '../lib/firestore/anime';
import {
  getCmsHeroBanners,
  getCachedHeroBanners,
  getCmsSchedule,
  getCachedSchedule,
  DEFAULT_HERO_BANNERS,
  getCmsHomepageSections,
  getCachedHomepageSections,
  getCmsSeoSettings,
  getCmsSiteSettings,
  getCmsGenres,
  getCachedCmsGenres,
} from '../lib/firestore/cms';
import type { CmsHomepageSection, CmsSeoSettings, CmsSiteSettings, CmsGenre } from '../types/cms';
import { DEFAULT_ANIMES } from '../data/defaultCatalog';
import { getLatestReleasedEpisodes } from '../lib/firestore/episodes';
import { getContinueWatching, removeWatchProgress } from '../lib/firestore/user-activity';
import { HeroSkeleton, HomeSectionsSkeleton } from '../components/SkeletonLoader';
import { LeftSidebar } from '../components/LeftSidebar';
import { RightSidebar } from '../components/RightSidebar';
import { HeroBanner } from '../components/HeroBanner';
import { AnimeSliderSection } from '../components/AnimeSliderSection';
import { AnimeGrid } from '../components/AnimeGrid';
import { EpisodeCard } from '../components/EpisodeCard';
import { Top10Ranking } from '../components/Top10Ranking';
import { WeeklyScheduleStrip } from '../components/WeeklyScheduleStrip';
import { usePageSeo } from '../hooks/usePageSeo';
import { preloadImages, getHeroBannerWidth } from '../lib/image-optimizer';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Compass,
  Sparkles,
  Flame,
  Star,
  X,
  Clock,
} from 'lucide-react';

interface HomeViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
  onOpenLegal?: (tab: 'about' | 'dmca' | 'disclaimer') => void;
}

const EXPLORE_GENRES = [
  'All',
  'Action',
  'Adventure',
  'Romance',
  'Fantasy',
  'Comedy',
  'Sci-Fi',
  'Drama',
  'Hentai',
  'Sports',
  'Top Rated',
];

const FALLBACK_LATEST_EPISODES: LatestEpisodeItem[] = [
  {
    animeTitle: 'The Angel Next Door Spoils Me Rotten',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    animePoster: 'https://lh3.googleusercontent.com/d/1SGH-SAFuYcXGqiiyeUsy_JqBJpPHUL4n',
    animeBanner: 'https://lh3.googleusercontent.com/d/1zNj5h5T3veCQyZ3JH_sJ7PsplCC8LJ5U',
    episode: {
      id: 'ep-angel-12',
      animeId: 'IK1pYuAdZmU18uYt2W03',
      episodeNumber: 12,
      seasonNumber: 1,
      title: 'Episode 12',
      thumbnail: 'https://lh3.googleusercontent.com/d/1zNj5h5T3veCQyZ3JH_sJ7PsplCC8LJ5U',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    } as any,
  },
  {
    animeTitle: 'Alya Sometimes Hides Her Feelings in Russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    animePoster: 'https://lh3.googleusercontent.com/d/1DyNsmfH8qaNAGdZkP0W1h5ZkltlDUPw1',
    animeBanner: 'https://lh3.googleusercontent.com/d/1cpuHOkZ84Fy93lrWYmRIvmWguAdZgWhx',
    episode: {
      id: 'ep-alya-12',
      animeId: 'N7GCGm7fqliWjjxG0U0f',
      episodeNumber: 12,
      seasonNumber: 1,
      title: 'Episode 12',
      thumbnail: 'https://lh3.googleusercontent.com/d/1cpuHOkZ84Fy93lrWYmRIvmWguAdZgWhx',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    } as any,
  },
  {
    animeTitle: 'The Angel Next Door Spoils Me Rotten',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    animePoster: 'https://lh3.googleusercontent.com/d/1SGH-SAFuYcXGqiiyeUsy_JqBJpPHUL4n',
    animeBanner: 'https://lh3.googleusercontent.com/d/1zNj5h5T3veCQyZ3JH_sJ7PsplCC8LJ5U',
    episode: {
      id: 'ep-angel-11',
      animeId: 'IK1pYuAdZmU18uYt2W03',
      episodeNumber: 11,
      seasonNumber: 1,
      title: 'Episode 11',
      thumbnail: 'https://lh3.googleusercontent.com/d/1zNj5h5T3veCQyZ3JH_sJ7PsplCC8LJ5U',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    } as any,
  },
  {
    animeTitle: 'Alya Sometimes Hides Her Feelings in Russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    animePoster: 'https://lh3.googleusercontent.com/d/1DyNsmfH8qaNAGdZkP0W1h5ZkltlDUPw1',
    animeBanner: 'https://lh3.googleusercontent.com/d/1cpuHOkZ84Fy93lrWYmRIvmWguAdZgWhx',
    episode: {
      id: 'ep-alya-11',
      animeId: 'N7GCGm7fqliWjjxG0U0f',
      episodeNumber: 11,
      seasonNumber: 1,
      title: 'Episode 11',
      thumbnail: 'https://lh3.googleusercontent.com/d/1cpuHOkZ84Fy93lrWYmRIvmWguAdZgWhx',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    } as any,
  },
];

// Lazy section helper using IntersectionObserver (rootMargin 700px)
const LazySection: React.FC<{ children: React.ReactNode; minHeight?: string }> = ({
  children,
  minHeight = '140px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '700px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ minHeight: isVisible ? 'auto' : minHeight }}>
      {isVisible ? children : null}
    </div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({ navigate, onShowMessage, onOpenLegal }) => {
  const { user, isAdmin } = useAuth();

  const initialAnimes = useMemo(() => getCachedPublishedAnimes().filter((a) => !isAnimeDeleted(a.id) && (!a.slug || !isAnimeDeleted(a.slug))), []);
  const initialSafeAnimes = useMemo(() => initialAnimes.filter((a) => !isHentaiAnime(a)), [initialAnimes]);
  const initialBanners = useMemo(
    () =>
      getCachedHeroBanners().filter(
        (b) => !isAnimeDeleted(b.animeId) && (!b.animeSlug || !isAnimeDeleted(b.animeSlug)) && !isHentaiAnime(b)
      ),
    []
  );
  const initialSchedule = useMemo(
    () =>
      getCachedSchedule().filter(
        (s) => !isAnimeDeleted(s.animeId) && (!s.animeSlug || !isAnimeDeleted(s.animeSlug)) && !isHentaiAnime(s)
      ),
    []
  );

  const [loading, setLoading] = useState<boolean>(initialAnimes.length === 0);
  const [featuredAnimes, setFeaturedAnimes] = useState<any[]>(initialBanners);
  const [allAnimes, setAllAnimes] = useState<Anime[]>(initialAnimes);

  const [trending, setTrending] = useState<Anime[]>(() =>
    [...initialSafeAnimes].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 12)
  );
  const [popular, setPopular] = useState<Anime[]>(() =>
    [...initialSafeAnimes].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, 12)
  );
  const [recentlyAdded, setRecentlyAdded] = useState<Anime[]>(() =>
    [...initialSafeAnimes].sort((a, b) => getAnimeUploadTimestamp(b) - getAnimeUploadTimestamp(a)).slice(0, 12)
  );
  const [latestEpisodes, setLatestEpisodes] = useState<LatestEpisodeItem[]>(() =>
    FALLBACK_LATEST_EPISODES.filter(
      (item) => !isAnimeDeleted(item.episode.animeId) && !isAnimeDeleted(item.animeSlug) && !isHentaiAnime(item) && !isHentaiAnime(item.episode)
    ).slice(0, 4)
  );

  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [scheduledAnime, setScheduledAnime] = useState<CmsScheduleItem[]>(initialSchedule);

  // Genre filter for Explore by Genre
  const [exploreFilter, setExploreFilter] = useState<string>('All');
  const [isFilterTransitioning, setIsFilterTransitioning] = useState<boolean>(false);
  const [cmsSections, setCmsSections] = useState<CmsHomepageSection[]>(() => getCachedHomepageSections());
  const [cmsGenres, setCmsGenres] = useState<CmsGenre[]>(() => getCachedCmsGenres());
  const [seoSettings, setSeoSettings] = useState<CmsSeoSettings | null>(null);
  const [siteSettings, setSiteSettings] = useState<CmsSiteSettings | null>(null);
  const filterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleExploreFilterChange = (filter: string) => {
    if (filter === exploreFilter) return;
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    setIsFilterTransitioning(true);
    setExploreFilter(filter);
    filterTimerRef.current = setTimeout(() => {
      setIsFilterTransitioning(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    };
  }, []);

  usePageSeo({
    title: seoSettings?.homepageTitle || 'ZYNOX ANIME — Watch & Download Anime in Hindi Dub & English Sub 1080p HD',
    description: seoSettings?.homepageDescription || 'Stream and download your favorite anime series and movies in Hindi Dub and English Sub with ultra-fast playback on ZYNOX ANIME.',
    keywords: seoSettings?.homepageKeywords || 'anime hindi dub, download anime in hindi, watch anime online, hindi anime download, 1080p anime, ZYNOX ANIME',
    ogImage: seoSettings?.defaultOgImage || 'https://www.zynoxanime.cv/logo.png',
    ogType: 'website',
  });

  const continueWatchingRef = useRef<HTMLDivElement>(null);
  const scrollContinueWatching = (direction: 'left' | 'right') => {
    const el = continueWatchingRef.current;
    if (!el) return;
    const scrollStep = Math.max(200, Math.floor(el.clientWidth * 0.7));
    const target = direction === 'right' ? el.scrollLeft + scrollStep : el.scrollLeft - scrollStep;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const handleRemoveContinueWatching = async (e: React.MouseEvent, animeId: string) => {
    e.stopPropagation();
    try {
      await removeWatchProgress(user?.uid || null, animeId);
      setContinueWatching((prev) => prev.filter((p) => p.animeId !== animeId));
      onShowMessage?.('Removed from Continue Watching');
    } catch {
      onShowMessage?.('Failed to remove item');
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 0. Kick off immediate high-priority image preloads at t=0 from cached data
    const heroWidth = getHeroBannerWidth();
    const initialHeroUrls = initialBanners
      .slice(0, 2)
      .map((b: any) => b.backgroundImage || b.banner || b.bannerUrl || b.posterImage || b.poster)
      .filter(Boolean);
    if (initialHeroUrls.length > 0) {
      preloadImages(initialHeroUrls.slice(0, 1), {
        width: heroWidth,
        quality: 80,
        fallbackType: 'banner',
        highPriority: true,
      });
      if (initialHeroUrls.length > 1) {
        preloadImages(initialHeroUrls.slice(1), {
          width: heroWidth,
          quality: 80,
          fallbackType: 'banner',
        });
      }
    }

    const initialPosterUrls = initialSafeAnimes
      .slice(0, 10)
      .map((a) => a.poster)
      .filter(Boolean);
    if (initialPosterUrls.length > 0) {
      preloadImages(initialPosterUrls, {
        width: 300,
        fallbackType: 'poster',
        highPriority: true,
      });
    }

    let latestCatalog: Anime[] = initialAnimes.length > 0 ? initialAnimes : DEFAULT_ANIMES;
    let latestBanners: any[] = initialBanners;
    let latestSettings: CmsSiteSettings | null = siteSettings;

    const getBlockedHentaiSets = (catalog: Anime[]) => {
      const hentaiList = catalog.filter(isHentaiAnime);
      return {
        hentaiIds: new Set(hentaiList.map((a) => a.id)),
        hentaiSlugs: new Set(hentaiList.map((a) => a.slug)),
      };
    };

    const recomputeCatalogSections = (catalog: Anime[], settings: CmsSiteSettings | null) => {
      if (!isMounted) return;
      const safeAnimes = catalog.filter((a) => !isHentaiAnime(a));
      const trendingMode = (settings as any)?.trendingMode || 'auto';
      const popularMode = (settings as any)?.popularMode || 'auto';

      const trendingList = [...safeAnimes]
        .sort((a, b) => {
          if (trendingMode === 'manual') {
            const aFlag = a.trending || a.isTrending ? 1 : 0;
            const bFlag = b.trending || b.isTrending ? 1 : 0;
            if (bFlag !== aFlag) return bFlag - aFlag;
          } else if (trendingMode === 'rating') {
            const rDiff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
            if (rDiff !== 0) return rDiff;
          }
          return (b.viewsCount || 0) - (a.viewsCount || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0);
        })
        .slice(0, 12);
      setTrending(trendingList);

      const sortedByPopular = [...safeAnimes].sort((a, b) => {
        if (popularMode === 'manual') {
          const aFlag = a.popular || a.isPopular ? 1 : 0;
          const bFlag = b.popular || b.isPopular ? 1 : 0;
          if (bFlag !== aFlag) return bFlag - aFlag;
        } else if (popularMode === 'views') {
          const vDiff = (b.viewsCount || 0) - (a.viewsCount || 0);
          if (vDiff !== 0) return vDiff;
        }
        return (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.viewsCount || 0) - (a.viewsCount || 0);
      });

      if (safeAnimes.length > 12 && popularMode !== 'manual') {
        const trendingTopIds = new Set(trendingList.slice(0, 6).map((a) => a.id || a.slug));
        const uniquePopular = sortedByPopular.filter((a) => !trendingTopIds.has(a.id || a.slug));
        setPopular(uniquePopular.length >= 4 ? uniquePopular.slice(0, 12) : sortedByPopular.slice(0, 12));
      } else {
        setPopular(sortedByPopular.slice(0, 12));
      }

      const sortedRecentlyAdded = [...safeAnimes]
        .sort((a, b) => getAnimeUploadTimestamp(b) - getAnimeUploadTimestamp(a))
        .slice(0, 12);
      setRecentlyAdded(sortedRecentlyAdded);

      preloadImages(
        trendingList.slice(0, 10).map((a) => a.poster).filter(Boolean),
        { width: 240, fallbackType: 'poster', highPriority: true }
      );
    };

    const recomputeHeroBanners = (banners: any[], catalog: Anime[]) => {
      if (!isMounted) return;
      const safeAnimes = catalog.filter((a) => !isHentaiAnime(a));
      const { hentaiIds, hentaiSlugs } = getBlockedHentaiSets(catalog);
      const nowTs = Date.now();

      const activeBanners = (banners || [])
        .filter((b: any) => {
          if (b.active === false || isAnimeDeleted(b.animeId)) return false;
          if (isHentaiAnime(b)) return false;
          if (hentaiIds.has(b.animeId) || (b.animeSlug && hentaiSlugs.has(b.animeSlug))) return false;
          if (b.startDate) {
            const s = new Date(b.startDate).getTime();
            if (!isNaN(s) && nowTs < s) return false;
          }
          if (b.endDate) {
            const e = new Date(b.endDate).getTime();
            if (!isNaN(e) && nowTs > e) return false;
          }
          return true;
        })
        .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

      const featuredCatalog = safeAnimes.filter((a) => (a.featured === true || a.isFeatured === true) && !isAnimeDeleted(a.id));
      const combinedHero = [...activeBanners, ...featuredCatalog];
      const finalHero = combinedHero.length > 0 ? combinedHero : DEFAULT_HERO_BANNERS;
      setFeaturedAnimes(finalHero);

      const firstHeroImg = (finalHero[0] as any)?.backgroundImage || (finalHero[0] as any)?.banner || (finalHero[0] as any)?.bannerUrl;
      if (firstHeroImg) {
        preloadImages([firstHeroImg], {
          width: heroWidth,
          quality: 80,
          fallbackType: 'banner',
          highPriority: true,
        });
      }
    };

    // Progressive independent fetches — fast sections update immediately without waiting on slowest call
    getCmsHeroBanners()
      .then((cmsBanners) => {
        if (!isMounted) return;
        latestBanners = cmsBanners;
        recomputeHeroBanners(latestBanners, latestCatalog);
      })
      .catch((err) => console.warn('Hero banner fetch failed:', err));

    getPublishedAnimes()
      .then((all) => {
        if (!isMounted) return;
        const validAll = all && all.length > 0 ? all : latestCatalog;
        latestCatalog = validAll;
        setAllAnimes(validAll);
        recomputeCatalogSections(validAll, latestSettings);
        recomputeHeroBanners(latestBanners, validAll);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Published animes fetch failed:', err);
        if (isMounted) setLoading(false);
      });

    getCmsHomepageSections()
      .then((sectionsList) => {
        if (isMounted && sectionsList && sectionsList.length > 0) setCmsSections(sectionsList);
      })
      .catch(() => {});

    getCmsGenres()
      .then((loadedGenres) => {
        if (isMounted && loadedGenres && loadedGenres.length > 0) setCmsGenres(loadedGenres);
      })
      .catch(() => {});

    getCmsSeoSettings()
      .then((loadedSeo) => {
        if (isMounted && loadedSeo) setSeoSettings(loadedSeo);
      })
      .catch(() => {});

    getCmsSiteSettings()
      .then((loadedSettings) => {
        if (!isMounted || !loadedSettings) return;
        latestSettings = loadedSettings;
        setSiteSettings(loadedSettings);
        recomputeCatalogSections(latestCatalog, loadedSettings);
      })
      .catch(() => {});

    getLatestReleasedEpisodes(12)
      .then((latestEpList) => {
        if (!isMounted) return;
        const { hentaiIds, hentaiSlugs } = getBlockedHentaiSets(latestCatalog);
        const candidateLatest = [...(latestEpList || []), ...FALLBACK_LATEST_EPISODES].filter(
          (item) =>
            !isAnimeDeleted(item.episode.animeId) &&
            !isAnimeDeleted(item.animeSlug) &&
            !isHentaiAnime(item) &&
            !isHentaiAnime(item.episode) &&
            !hentaiIds.has(item.episode.animeId) &&
            !hentaiSlugs.has(item.animeSlug)
        );
        const seenKeys = new Set<string>();
        const dedupedEps: LatestEpisodeItem[] = [];
        for (const item of candidateLatest) {
          const epKey = item.episode?.id || `${item.episode?.animeId}-s${item.episode?.seasonNumber || 1}-e${item.episode?.episodeNumber}`;
          if (!epKey || seenKeys.has(epKey)) continue;
          seenKeys.add(epKey);
          dedupedEps.push(item);
          if (dedupedEps.length >= 4) break;
        }
        setLatestEpisodes(dedupedEps);
      })
      .catch(() => {});

    getContinueWatching(user?.uid || null)
      .then((progressList) => {
        if (!isMounted) return;
        const { hentaiIds, hentaiSlugs } = getBlockedHentaiSets(latestCatalog);
        const validProgress = (progressList || [])
          .filter((p: any) => !isAnimeDeleted(p.animeId) && !isAnimeDeleted(p.animeSlug) && !hentaiIds.has(p.animeId) && !hentaiSlugs.has(p.animeSlug))
          .slice(0, 6);
        setContinueWatching(validProgress);
      })
      .catch(() => {});

    getCmsSchedule()
      .then((scheduleList) => {
        if (!isMounted) return;
        const { hentaiIds, hentaiSlugs } = getBlockedHentaiSets(latestCatalog);
        const validSchedule = (scheduleList || []).filter(
          (s: any) => !isAnimeDeleted(s.animeId) && !isAnimeDeleted(s.animeSlug) && !hentaiIds.has(s.animeId) && !hentaiSlugs.has(s.animeSlug)
        );
        setScheduledAnime(validSchedule);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  return (
    <div className="w-full overflow-x-clip">
      {/* 1. FULL-BLEED EDGE-TO-EDGE HERO SPOTLIGHT (behind transparent header on Home) */}
      {loading ? (
        <HeroSkeleton />
      ) : featuredAnimes.length > 0 ? (
        <HeroBanner
          featuredAnimes={featuredAnimes}
          catalogAnimes={allAnimes}
          continueWatching={continueWatching}
          navigate={navigate}
          onShowMessage={onShowMessage}
        />
      ) : (
        <div className="h-14 md:h-[68px]" aria-hidden="true" />
      )}

      {/* Main Content Container below Full-Bleed Hero */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6">
        <div className="flex gap-6 xl:gap-8 items-start">
          {/* Left Sidebar */}
          <LeftSidebar
            currentPath="/"
            navigate={navigate}
            isAdmin={isAdmin}
            onOpenLegal={onOpenLegal}
          />

          {/* Main Content Stream: Section gap 20px phone / 32px desktop */}
          <main className="flex-1 min-w-0 space-y-5 sm:space-y-8">
            {loading ? (
              <HomeSectionsSkeleton />
            ) : (
              <>
                {/* 2. CONTINUE WATCHING (176px phone / 240px desktop, 16:9 thumb, thin bar, 1 line "Title · EP 4") */}
                {continueWatching.length > 0 && (
                  <section className="space-y-2.5 sm:space-y-3 relative group/cw select-none">
                    <div className="h-8 min-h-[32px] flex items-center justify-between gap-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
                        <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
                          Continue Watching
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => scrollContinueWatching('left')}
                            className="w-6 h-6 rounded-md bg-white/5 hover:bg-[#1E88FF] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer"
                            title="Previous"
                            aria-label="Previous Continue Watching"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollContinueWatching('right')}
                            className="w-6 h-6 rounded-md bg-white/5 hover:bg-[#1E88FF] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors duration-150 cursor-pointer"
                            title="Next"
                            aria-label="Next Continue Watching"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate('/history')}
                          className="text-[13px] font-semibold text-[#1E88FF] hover:opacity-85 flex items-center gap-0.5 transition-opacity duration-150 cursor-pointer whitespace-nowrap"
                        >
                          <span>View All</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Scroll Track: max 6 items */}
                    <div className="-mx-4 sm:mx-0">
                      <div
                        ref={continueWatchingRef}
                        className="flex items-start gap-[10px] overflow-x-auto no-scrollbar scroll-smooth snap-x snap-proximity px-4 sm:px-0 scroll-pl-4 sm:scroll-pl-0 pb-1"
                      >
                        {continueWatching.slice(0, 6).map((item) => (
                          <div
                            key={item.animeId + item.episodeNumber}
                            onClick={() => {
                              navigate(`/anime/${item.animeSlug}/episode/${item.episodeNumber}`);
                            }}
                            className="flex-none w-[176px] md:w-[240px] snap-start group/card bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/50 rounded-[10px] overflow-hidden cursor-pointer transition-colors duration-150 flex flex-col relative"
                          >
                            {/* 16:9 Thumbnail with play icon & top-right X */}
                            <div className="relative aspect-video bg-[#050A14] overflow-hidden">
                              {item.animePoster && (
                                <img
                                  src={item.animePoster}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-150 pointer-events-none"
                                />
                              )}

                              {/* Center Play Icon */}
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                                <div className="w-7 h-7 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-md">
                                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                </div>
                              </div>

                              {/* Top-Right Corner X */}
                              <button
                                type="button"
                                aria-label={`Remove ${item.animeTitle}`}
                                onClick={(e) => handleRemoveContinueWatching(e, item.animeId)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-black/80 hover:bg-red-500 text-white transition-colors duration-150 z-10 flex items-center justify-center cursor-pointer shadow-md"
                                title="Remove from Continue Watching"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              {/* Thin Progress Line flush at bottom */}
                              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/60 pointer-events-none">
                                <div
                                  className="h-full bg-[#1E88FF]"
                                  style={{ width: `${Math.max(5, Math.min(100, item.percentage || 10))}%` }}
                                />
                              </div>
                            </div>

                            {/* Under Thumbnail: 1 line "Title · EP 4" */}
                            <div className="px-2 py-1.5 min-w-0">
                              <p className="text-[12px] font-semibold leading-[16px] text-white truncate">
                                {item.animeTitle} · EP {item.episodeNumber}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

              {/* Dynamic CMS Ordered Sections (Trending, Top 10, Latest Episodes, Popular, Recently Added, Ongoing/Upcoming/Completed/Manual) */}
              {(() => {
                const heroSection = cmsSections.find((s) => s.key === 'hero' || s.contentSource === 'featured');
                const showTop10 = (siteSettings as any)?.showTop10 !== false;
                const safeAnimes = allAnimes.filter((a) => !isHentaiAnime(a));

                // Map helper for section anime list by contentSource
                const getAnimesForSection = (sec: CmsHomepageSection): Anime[] => {
                  const limit = Math.max(1, Math.min(24, Number(sec.maxItems) || 12));
                  let pool = safeAnimes;

                  if (sec.audioLanguageFilter && sec.audioLanguageFilter !== 'all') {
                    const langFilter = sec.audioLanguageFilter.toLowerCase();
                    pool = pool.filter(
                      (a) =>
                        a.audioLanguage?.toLowerCase().includes(langFilter) ||
                        a.audioTags?.some((t) => t.toLowerCase().includes(langFilter)) ||
                        a.languages?.some((l) => l.toLowerCase().includes(langFilter))
                    );
                  }

                  switch (sec.contentSource) {
                    case 'trending':
                      return trending.slice(0, limit);
                    case 'popular':
                    case 'top_rated':
                      return popular.slice(0, limit);
                    case 'recently_added':
                      return recentlyAdded.slice(0, limit);
                    case 'ongoing':
                      return pool.filter((a) => a.status?.toLowerCase() === 'ongoing').slice(0, limit);
                    case 'upcoming':
                      return pool.filter((a) => a.status?.toLowerCase() === 'upcoming' || a.isUpcoming).slice(0, limit);
                    case 'completed':
                      return pool.filter((a) => a.status?.toLowerCase() === 'completed').slice(0, limit);
                    case 'recommended':
                      return pool.filter((a) => a.recommended).slice(0, limit);
                    case 'manual':
                      if (sec.manualAnimeIds && sec.manualAnimeIds.length > 0) {
                        const idSet = new Set(sec.manualAnimeIds);
                        return pool.filter((a) => idSet.has(a.id || '') || idSet.has(a.slug)).slice(0, limit);
                      }
                      return pool.slice(0, limit);
                    default:
                      return pool.slice(0, limit);
                  }
                };

                // Ordered sections list (fallback to default layout order when CMS sections empty)
                const orderedSections: CmsHomepageSection[] =
                  cmsSections.length > 0
                    ? [...cmsSections]
                        .filter((s) => s.key !== 'hero' && s.contentSource !== 'featured')
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    : [
                        { id: 'sec-trending', key: 'trending', title: 'Trending Anime', enabled: true, displayOrder: 2, layout: 'carousel', contentSource: 'trending', maxItems: 12 },
                        { id: 'sec-latest-eps', key: 'latest_episodes', title: 'Latest Episodes', enabled: true, displayOrder: 3, layout: 'grid', contentSource: 'latest_episodes', maxItems: 4 },
                        { id: 'sec-popular', key: 'popular', title: 'Popular Anime', enabled: true, displayOrder: 4, layout: 'carousel', contentSource: 'popular', maxItems: 12 },
                        { id: 'sec-recent', key: 'recently_added', title: 'Recently Added', enabled: true, displayOrder: 5, layout: 'carousel', contentSource: 'recently_added', maxItems: 12 },
                      ];

                const renderedHeroOverride = heroSection && heroSection.enabled === false;
                void renderedHeroOverride;

                return orderedSections.map((sec, idx) => {
                  if (sec.enabled === false) return null;

                  const wrapSection = (node: React.ReactNode, minHeight: string) =>
                    idx < 2 ? node : <LazySection minHeight={minHeight}>{node}</LazySection>;

                  if (sec.contentSource === 'latest_episodes' || sec.key === 'latest_episodes') {
                    const maxEps = Math.max(2, Math.min(12, Number(sec.maxItems) || 4));
                    if (latestEpisodes.length === 0) return null;
                    return (
                      <React.Fragment key={sec.id || sec.key}>
                        {idx === 1 && showTop10 && allAnimes.length > 0 && (
                          <Top10Ranking
                            animes={safeAnimes}
                            navigate={navigate}
                          />
                        )}
                        {wrapSection(
                          <section className="space-y-2.5 sm:space-y-3">
                            <div className="h-8 min-h-[32px] flex items-center justify-between gap-2 whitespace-nowrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
                                <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
                                  {sec.title || 'Latest Episodes'}
                                </h2>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate('/browse?sort=latest')}
                                className="text-[13px] font-semibold text-[#1E88FF] hover:opacity-85 flex items-center gap-0.5 transition-opacity duration-150 cursor-pointer shrink-0 whitespace-nowrap"
                              >
                                <span>View All</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {latestEpisodes.slice(0, maxEps).map((epItem, epIdx) => (
                                <EpisodeCard
                                  key={`latest-${epItem.episode?.id || epItem.animeSlug}-${epIdx}`}
                                  item={epItem}
                                  navigate={navigate}
                                  priority={epIdx < 4}
                                />
                              ))}
                            </div>
                          </section>,
                          '160px'
                        )}
                      </React.Fragment>
                    );
                  }

                  const secAnimes = getAnimesForSection(sec);
                  if (secAnimes.length === 0) return null;

                  if (sec.layout === 'ranked') {
                    return (
                      <React.Fragment key={sec.id || sec.key}>
                        {wrapSection(
                          <AnimeSliderSection
                            id={`section-${sec.key}`}
                            title={sec.title}
                            icon={<Star className="w-5 h-5 text-[#94A3B8]" />}
                            animes={secAnimes}
                            viewAllPath={`/browse?sort=${sec.contentSource === 'trending' ? 'popular' : 'rating'}`}
                            navigate={navigate}
                            onShowMessage={onShowMessage}
                          />,
                          '220px'
                        )}
                      </React.Fragment>
                    );
                  }

                  return (
                    <React.Fragment key={sec.id || sec.key}>
                      {idx === 1 && showTop10 && allAnimes.length > 0 && (
                        <Top10Ranking
                          animes={safeAnimes}
                          navigate={navigate}
                        />
                      )}
                      {wrapSection(
                        <AnimeSliderSection
                          id={`section-${sec.key}`}
                          title={sec.title}
                          icon={
                            sec.contentSource === 'trending' ? (
                              <Flame className="w-5 h-5 text-[#94A3B8]" />
                            ) : sec.contentSource === 'popular' || sec.contentSource === 'top_rated' ? (
                              <Star className="w-5 h-5 text-[#94A3B8]" />
                            ) : (
                              <Sparkles className="w-5 h-5 text-[#94A3B8]" />
                            )
                          }
                          animes={secAnimes}
                          viewAllPath={
                            sec.contentSource === 'ongoing'
                              ? '/ongoing'
                              : sec.contentSource === 'upcoming'
                              ? '/upcoming'
                              : sec.contentSource === 'completed'
                              ? '/completed'
                              : sec.contentSource === 'trending'
                              ? '/browse?sort=popular'
                              : sec.contentSource === 'popular' || sec.contentSource === 'top_rated'
                              ? '/browse?sort=rating'
                              : '/browse?sort=latest'
                          }
                          navigate={navigate}
                          onShowMessage={onShowMessage}
                        />,
                        '200px'
                      )}
                    </React.Fragment>
                  );
                });
              })()}

              {/* EXPLORE BY GENRE (3 cols phone, 4 sm, 5 lg, 6 xl, 7 2xl, lazy-loaded) */}
              <LazySection minHeight="260px">
                <section className="space-y-2.5 sm:space-y-3">
                  <div className="h-8 min-h-[32px] flex items-center justify-between gap-2 whitespace-nowrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Compass className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
                      <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
                        Explore by Genre
                      </h2>
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
                      className="text-[13px] font-semibold text-[#1E88FF] hover:opacity-85 flex items-center gap-0.5 transition-opacity duration-150 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Genre Chips (synced with CMS Categories / Genres) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x py-0.5">
                    {(cmsGenres.length > 0
                      ? ['All', ...cmsGenres.filter((g) => g.enabled !== false).map((g) => g.name), 'Top Rated']
                      : EXPLORE_GENRES
                    ).map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleExploreFilterChange(genre)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap snap-start transition-colors duration-150 cursor-pointer border leading-none ${
                          exploreFilter === genre
                            ? 'bg-[#1E88FF] border-[#1E88FF] text-white font-bold'
                            : 'bg-[#0B1324] hover:bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>

                  {/* Filtered Grid: 3 cols phone, 4 tablet, 6 desktop, 12 items max */}
                  {(() => {
                    const filteredExplore = (() => {
                      if (exploreFilter.toLowerCase() === 'hentai') {
                        return allAnimes.filter((a) => isHentaiAnime(a)).slice(0, 12);
                      }
                      const safeExploreList = allAnimes.filter((a) => !isHentaiAnime(a));
                      if (exploreFilter === 'All') {
                        return safeExploreList.slice(0, 12);
                      }
                      if (exploreFilter === 'Top Rated') {
                        return [...safeExploreList]
                          .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
                          .slice(0, 12);
                      }
                      const matches = safeExploreList.filter((a) =>
                        a.genres?.some((g) => g.toLowerCase().includes(exploreFilter.toLowerCase()))
                      );
                      return matches.length > 0 ? matches.slice(0, 12) : [];
                    })();

                    return (
                      <AnimeGrid
                        id="home-explore-anime-grid"
                        animes={filteredExplore}
                        loading={isFilterTransitioning}
                        skeletonCount={12}
                        columns="home"
                        navigate={navigate}
                        onShowMessage={onShowMessage}
                        emptyState={
                          <div className="py-6 text-center bg-[#0B1324]/50 rounded-xl border border-white/10">
                            <p className="text-xs text-[#94A3B8]">No anime found in &ldquo;{exploreFilter}&rdquo;</p>
                            <button
                              type="button"
                              onClick={() => handleExploreFilterChange('All')}
                              className="mt-1.5 text-xs font-semibold text-[#1E88FF] hover:opacity-85 cursor-pointer"
                            >
                              Show All
                            </button>
                          </div>
                        }
                      />
                    );
                  })()}
                </section>
              </LazySection>

              {/* 9. WEEKLY RELEASE SCHEDULE (Directly above footer, 32px spacing, lazy-loaded) */}
              <LazySection minHeight="140px">
                <WeeklyScheduleStrip
                  scheduleItems={scheduledAnime}
                  navigate={navigate}
                />
              </LazySection>
              </>
            )}
          </main>

          {/* Right Discovery Sidebar */}
          <RightSidebar
            topAnimes={popular.length > 0 ? popular : trending}
            loading={loading}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  );
};
