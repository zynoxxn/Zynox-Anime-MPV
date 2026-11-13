import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import type { Anime } from '../types/anime';
import type { CmsGenre } from '../types/cms';
import {
  getCachedPublishedAnimes,
  getPublishedAnimes,
  cleanAnimeTitle,
  getAnimeUploadTimestamp,
  isHentaiAnime,
} from '../lib/firestore/anime';
import { getCmsGenres, getCmsSiteSettings } from '../lib/firestore/cms';
import {
  getOptimizedImageUrl,
  FALLBACK_ANIME_POSTER,
  isImagePreloaded,
  markImagePreloaded,
} from '../lib/image-optimizer';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  Play,
  Film,
  Star,
  Check,
} from 'lucide-react';

interface BrowseViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
  initialQuery?: string;
  initialGenre?: string;
  initialYear?: string;
  initialSort?: string;
  initialType?: string;
  initialStatus?: string;
  initialLanguage?: string;
  initialLetter?: string;
}

const PAGE_SIZE = 24;

const DEFAULT_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Isekai'
];

const QUICK_CHIPS = [
  'All',
  'Hindi Dub',
  'Sub',
  'Movies',
  'TV Series',
  'Ongoing',
  'Completed',
] as const;

type QuickChip = typeof QUICK_CHIPS[number];

// Minimal Result Card: Poster + 1-line Title ONLY (Crunchyroll minimal style)
const ExploreCard: React.FC<{
  anime: Anime;
  navigate: (path: string) => void;
}> = React.memo(({ anime, navigate }) => {
  const optimizedPoster = getOptimizedImageUrl(anime.poster, { width: 340, fallbackType: 'poster' });
  const [imageLoaded, setImageLoaded] = useState(() => isImagePreloaded(optimizedPoster));

  const ratingValue = anime.rating ? Number(anime.rating).toFixed(1) : '8.5';

  const rawAudio = (anime.audioLanguage || (anime as any).language || '').toLowerCase();
  const hasSub = (anime as any).hasSub !== false;
  const hasDub = Boolean((anime as any).hasDub || rawAudio.includes('dub') || rawAudio.includes('english'));
  const hasHindi = Boolean(
    (anime as any).hasHindiDub ||
    rawAudio.includes('hindi') ||
    anime.languages?.some((l) => l.toLowerCase().includes('hindi')) ||
    anime.audioTags?.some((t) => t.toLowerCase().includes('hindi'))
  );

  const displayLanguage = (() => {
    if (anime.audioLanguage && anime.audioLanguage.trim()) {
      const trimmed = anime.audioLanguage.trim();
      if (trimmed.toLowerCase() === 'hindi') return 'Hindi Dub';
      if (trimmed.length > 18) {
        if (trimmed.toLowerCase().includes('hindi')) return 'Hindi Dub';
        if (trimmed.toLowerCase().includes('multi')) return 'Multi Audio';
      }
      return trimmed;
    }
    if ((anime as any).language && typeof (anime as any).language === 'string' && (anime as any).language.trim()) {
      const trimmed = (anime as any).language.trim();
      if (trimmed.toLowerCase() === 'hindi') return 'Hindi Dub';
      return trimmed;
    }
    if (anime.audioTags && anime.audioTags.length > 0) {
      return anime.audioTags[0];
    }
    if (hasHindi) return 'Hindi Dub';
    if (hasDub && hasSub) return 'Sub / Dub';
    if (hasDub) return 'Dub';
    return 'Sub';
  })();

  const handleClick = () => {
    const slug = (anime.slug || anime.id || '').trim();
    if (slug) navigate(`/anime/${encodeURIComponent(slug)}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative cursor-pointer flex flex-col select-none transition-transform duration-150 will-change-transform"
    >
      {/* Poster 2:3 */}
      <div className="relative aspect-[2/3] w-full bg-[#0B1324] rounded-xl overflow-hidden border border-white/5 group-hover:border-[#1E88FF]/50 transition-all duration-200 shadow-sm">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#0B1324] animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#1E88FF] animate-spin opacity-50" />
          </div>
        )}

        {anime.poster ? (
          <img
            src={optimizedPoster}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => {
              markImagePreloaded(optimizedPoster);
              setImageLoaded(true);
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== FALLBACK_ANIME_POSTER) {
                target.src = FALLBACK_ANIME_POSTER;
                setImageLoaded(true);
              }
            }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-200 pointer-events-none ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#64748B] bg-[#050A14] font-bold text-[10px] uppercase">
            ZYNOX
          </div>
        )}

        {/* Hover Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-lg transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150">
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content BELOW the poster: Title + Anime Language & Rating */}
      <div className="pt-1.5 min-w-0 space-y-0.5">
        <h3
          title={cleanAnimeTitle(anime.title)}
          className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#00CFFF] transition-colors leading-tight"
        >
          {cleanAnimeTitle(anime.title)}
        </h3>

        {/* Anime Title ke niche: Language & Rating */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] leading-none min-w-0">
          <span className="text-[#00CFFF] font-semibold truncate">
            {displayLanguage}
          </span>
          <span className="text-white/30 shrink-0">·</span>
          <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold shrink-0">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{ratingValue}</span>
          </span>
        </div>
      </div>
    </div>
  );
});

ExploreCard.displayName = 'ExploreCard';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'latest', label: 'Latest' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'az', label: 'A–Z' },
] as const;

interface CustomSortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const CustomSortDropdown: React.FC<CustomSortDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Lock page scroll behind the sort sheet while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* Trigger Button: height 40px, radius 12px, background #0B1324, 1px border rgba(255,255,255,0.10), text 14px medium */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-10 px-3.5 rounded-xl bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-sm font-medium text-white flex items-center gap-2 cursor-pointer transition-colors shadow-sm select-none"
      >
        <span>{currentOption.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Desktop/Tablet Menu: Anchored under button, right-aligned, width 200px, radius 14px, background #101A30 */}
      {isOpen && (
        <>
          <div
            role="listbox"
            tabIndex={-1}
            className="hidden sm:block absolute right-0 top-full mt-1.5 z-40 w-[200px] rounded-[14px] bg-[#101A30] border border-white/[0.08] shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            {SORT_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`h-12 px-3.5 rounded-xl flex items-center justify-between text-sm transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'text-[#1E88FF] bg-[#1E88FF]/12 font-semibold'
                      : 'text-[#CBD5E1] hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#1E88FF] shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Phone (<640px): Compact Bottom Sheet (height auto, max-height 60dvh, safe-area padding) */}
          <div className="sm:hidden fixed inset-0 z-[100] flex items-end">
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in duration-200 cursor-pointer"
            />
            <div
              role="listbox"
              tabIndex={-1}
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
              className="fixed inset-x-0 bottom-0 z-[101] h-auto max-h-[60dvh] rounded-t-[20px] bg-[#101A30] border-t border-white/10 px-4 pt-3 shadow-2xl animate-in slide-in-from-bottom duration-220 flex flex-col"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2 shrink-0" />
              <div className="flex items-center justify-between pt-0.5 pb-2 shrink-0">
                <span className="text-base font-bold text-white tracking-wide">Sort by</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto no-scrollbar">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`h-[52px] pl-4 pr-3.5 rounded-xl flex items-center justify-between text-[15px] transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'text-[#1E88FF] bg-[#1E88FF]/12 font-semibold'
                          : 'text-[#CBD5E1] hover:text-white hover:bg-white/5 font-medium'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#1E88FF] shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface CustomYearDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const CustomYearDropdown: React.FC<CustomYearDropdownProps> = ({
  value,
  options,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLabel = value === 'all' ? 'All Years' : value;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const allYearItems = ['all', ...options];

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full h-10 px-3.5 rounded-xl bg-[#050A14] hover:bg-[#101A30] border border-white/10 text-sm font-medium text-white flex items-center justify-between transition-colors cursor-pointer"
      >
        <span>{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-[240px] overflow-y-auto no-scrollbar rounded-[14px] bg-[#101A30] border border-white/[0.08] shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {allYearItems.map((yr) => {
            const isSelected = yr === value;
            const label = yr === 'all' ? 'All Years' : yr;
            return (
              <div
                key={yr}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(yr);
                  setIsOpen(false);
                }}
                className={`h-10 px-3 rounded-lg flex items-center justify-between text-sm transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'text-[#1E88FF] bg-[#1E88FF]/12 font-semibold'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <span>{label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#1E88FF] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BrowseView: React.FC<BrowseViewProps> = ({
  navigate,
  initialQuery = '',
  initialGenre = 'all',
  initialYear = 'all',
  initialSort = 'popular',
  initialType = '',
  initialStatus = '',
  initialLanguage = '',
}) => {
  // Read params from current URL
  const getUrlParam = (key: string, fallback: string = ''): string => {
    if (typeof window === 'undefined') return fallback;
    const sp = new URLSearchParams(window.location.search);
    const val = sp.get(key);
    return val !== null ? val : fallback;
  };

  // Search State with 300ms Debounce
  const [searchInput, setSearchInput] = useState<string>(() =>
    getUrlParam('q', initialQuery)
  );
  const [debouncedQuery, setDebouncedQuery] = useState<string>(searchInput);

  // Quick Chip State (single-select shortcut)
  const [quickChip, setQuickChip] = useState<QuickChip>(() => {
    const val = getUrlParam('chip');
    if (val && (QUICK_CHIPS as readonly string[]).includes(val)) return val as QuickChip;
    if (initialLanguage && /hindi/i.test(initialLanguage)) return 'Hindi Dub';
    if (initialType && /movie/i.test(initialType)) return 'Movies';
    if (initialType && /tv/i.test(initialType)) return 'TV Series';
    if (initialStatus && /ongoing/i.test(initialStatus)) return 'Ongoing';
    if (initialStatus && /completed/i.test(initialStatus)) return 'Completed';
    return 'All';
  });

  // Filters State: ONLY Genre & Release Year
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    const val = getUrlParam('genre', initialGenre);
    if (!val || val.toLowerCase() === 'all') return [];
    return val.split(',').map((g) => g.trim()).filter(Boolean);
  });
  const [selectedYear, setSelectedYear] = useState<string>(() =>
    getUrlParam('year', initialYear)
  );

  // Sort State: ONE place only (Default: Most Popular)
  const [sortBy, setSortBy] = useState<string>(() =>
    getUrlParam('sort', initialSort || 'popular')
  );

  // Bottom Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [draftGenres, setDraftGenres] = useState<string[]>(selectedGenres);
  const [draftYear, setDraftYear] = useState<string>(selectedYear);
  const [showAllGenresInSheet, setShowAllGenresInSheet] = useState<boolean>(false);
  const [showAdultGenres, setShowAdultGenres] = useState<boolean>(false);

  // Catalog & Taxonomy
  const initialCached = getCachedPublishedAnimes();
  const [catalog, setCatalog] = useState<Anime[]>(initialCached);
  const [loading, setLoading] = useState<boolean>(initialCached.length === 0);
  const [cmsGenres, setCmsGenres] = useState<CmsGenre[]>([]);

  // Infinite Scroll Pagination State (24 items per page)
  const [displayCount, setDisplayCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const quickChipsRef = useRef<HTMLDivElement>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load catalog, genres and site settings
  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([getPublishedAnimes(), getCmsGenres(), getCmsSiteSettings()])
      .then(([animesRes, genresRes, settingsRes]) => {
        if (!isMounted) return;
        if (animesRes.status === 'fulfilled' && animesRes.value.length > 0) {
          setCatalog(animesRes.value);
        }
        if (genresRes.status === 'fulfilled' && genresRes.value.length > 0) {
          setCmsGenres(genresRes.value.filter((g) => g.enabled !== false));
        }
        if (settingsRes.status === 'fulfilled') {
          setShowAdultGenres(Boolean((settingsRes.value as any)?.showAdultGenres));
        }
      })
      .catch((err) => console.error('Explore loadData error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sorted list of genres (A-Z) with adult genres filtered out unless showAdultGenres is true
  const availableGenres = useMemo(() => {
    const raw = cmsGenres.length > 0 ? cmsGenres.map((g) => g.name) : DEFAULT_GENRES;
    const unique = Array.from(new Set(raw.map((g) => g.trim()))).filter(Boolean);
    const adultSet = new Set(['hentai', 'ecchi']);
    const filtered = unique.filter((g) => showAdultGenres || !adultSet.has(g.toLowerCase()));
    return filtered.sort((a, b) => a.localeCompare(b));
  }, [cmsGenres, showAdultGenres]);

  // Available Years (current down to 2000)
  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    const list: string[] = [];
    for (let y = current; y >= 2000; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  // Sync state to URL params (?q=&chip=&genre=&year=&sort=)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQuery) sp.set('q', debouncedQuery);
    if (quickChip !== 'All') sp.set('chip', quickChip);
    if (selectedGenres.length > 0) sp.set('genre', selectedGenres.join(','));
    if (selectedYear && selectedYear !== 'all') sp.set('year', selectedYear);
    if (sortBy && sortBy !== 'popular') sp.set('sort', sortBy);

    const qs = sp.toString();
    const targetUrl = qs ? `/browse?${qs}` : '/browse';
    if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== targetUrl) {
      window.history.replaceState({}, '', targetUrl);
    }
  }, [debouncedQuery, quickChip, selectedGenres, selectedYear, sortBy]);

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('q') || '';
      setSearchInput(q);
      setDebouncedQuery(q);

      const chip = sp.get('chip') || 'All';
      setQuickChip((QUICK_CHIPS as readonly string[]).includes(chip) ? (chip as QuickChip) : 'All');

      const g = sp.get('genre');
      setSelectedGenres(g && g !== 'all' ? g.split(',').filter(Boolean) : []);
      setSelectedYear(sp.get('year') || 'all');
      setSortBy(sp.get('sort') || 'popular');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Filter & Sort Anime Results
  const filteredAnimes = useMemo(() => {
    if (!catalog || catalog.length === 0) return [];

    const isExplicitHentai =
      selectedGenres.some((g) => g.toLowerCase() === 'hentai') ||
      debouncedQuery.toLowerCase().includes('hentai');

    return catalog.filter((anime) => {
      // 1. Published check
      if (anime.published === false) return false;

      // 2. Safe default: hide adult/hentai unless explicitly searched/selected
      if (!isExplicitHentai && isHentaiAnime(anime)) return false;

      // 3. Search query
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        const titleMatch = (anime.title || '').toLowerCase().includes(q);
        const altMatch = anime.altTitles?.some((alt) => (alt || '').toLowerCase().includes(q));
        const studioMatch = (anime.studio || '').toLowerCase().includes(q);
        const genreMatch = anime.genres?.some((g) => (g || '').toLowerCase().includes(q));
        if (!titleMatch && !altMatch && !studioMatch && !genreMatch) return false;
      }

      // 4. Quick Chip single-select filter
      if (quickChip !== 'All') {
        const rawAudio = (anime.audioLanguage || (anime as any).language || '').toLowerCase();
        const aType = (anime.type || 'TV').toLowerCase();
        const aStatus = (anime.status || 'ongoing').toLowerCase();

        switch (quickChip) {
          case 'Hindi Dub': {
            const hasHindi =
              rawAudio.includes('hindi') ||
              Boolean((anime as any).hasHindiDub) ||
              anime.audioTags?.some((t) => t.toLowerCase().includes('hindi')) ||
              anime.languages?.some((l) => l.toLowerCase().includes('hindi'));
            if (!hasHindi) return false;
            break;
          }
          case 'Sub': {
            const isSub =
              (anime as any).hasSub !== false ||
              rawAudio.includes('sub') ||
              rawAudio.includes('japanese') ||
              anime.audioTags?.some((t) => t.toLowerCase().includes('sub'));
            if (!isSub) return false;
            break;
          }
          case 'Movies':
            if (aType !== 'movie') return false;
            break;
          case 'TV Series':
            if (aType !== 'tv') return false;
            break;
          case 'Ongoing':
            if (aStatus !== 'ongoing') return false;
            break;
          case 'Completed':
            if (aStatus !== 'completed') return false;
            break;
        }
      }

      // 5. Genre Filter (multi-select: matches any valid selected genre, ignore deleted ones)
      if (selectedGenres.length > 0) {
        const animeGenres = (anime.genres || []).map((g) => g.toLowerCase());
        const hasMatch = selectedGenres.some((g) => animeGenres.includes(g.toLowerCase()));
        if (!hasMatch) return false;
      }

      // 6. Release Year
      if (selectedYear && selectedYear !== 'all') {
        if (anime.year !== Number(selectedYear)) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort Order: Most Popular (default) · Latest · Highest Rating · A–Z
      if (sortBy === 'rating') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      if (sortBy === 'latest') {
        return getAnimeUploadTimestamp(b) - getAnimeUploadTimestamp(a);
      }
      if (sortBy === 'az') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // Default: 'popular' (views count)
      return (b.viewsCount || 0) - (a.viewsCount || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
  }, [catalog, debouncedQuery, quickChip, selectedGenres, selectedYear, sortBy]);

  // Reset pagination on filter change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [debouncedQuery, quickChip, selectedGenres, selectedYear, sortBy]);

  // Infinite Scroll with IntersectionObserver
  const hasMore = displayCount < filteredAnimes.length;
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filteredAnimes.length));
    }
  }, [hasMore, filteredAnimes.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Filter Badge Count: ONLY counts selected genres + year (0 -> no badge)
  const filterBadgeCount = selectedGenres.length + (selectedYear !== 'all' ? 1 : 0);

  // Quick Chip Click Handler (single-select, tapping again returns to All)
  const handleQuickChipClick = (chip: QuickChip, e?: React.MouseEvent) => {
    if (e?.currentTarget) {
      e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    setQuickChip((prev) => (prev === chip ? 'All' : chip));
  };

  // Open Sheet and copy active selections into draft
  const handleOpenSheet = () => {
    setDraftGenres([...selectedGenres]);
    setDraftYear(selectedYear);
    setShowAllGenresInSheet(false);
    setIsSheetOpen(true);
  };

  // Sheet drag and touch state for mobile swipe-down to close
  const [sheetDragY, setSheetDragY] = useState(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setSheetDragY(delta);
    }
  };
  const handleTouchEnd = () => {
    if (sheetDragY > 70) {
      handleCloseSheet();
    }
    setSheetDragY(0);
  };

  // Lock page scroll behind the sheet while open
  useEffect(() => {
    if (isSheetOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSheetOpen]);

  // Close Sheet
  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSheetDragY(0);
  };

  // Reset Draft filters in sheet
  const handleResetDraft = () => {
    setDraftGenres([]);
    setDraftYear('all');
  };

  // Apply Draft filters
  const handleApplyDraft = () => {
    setSelectedGenres(draftGenres);
    setSelectedYear(draftYear);
    setIsSheetOpen(false);
  };

  // Calculate live matching count inside sheet
  const draftResultsCount = useMemo(() => {
    if (!catalog || catalog.length === 0) return 0;
    const isExplicitHentai =
      draftGenres.some((g) => g.toLowerCase() === 'hentai') ||
      debouncedQuery.toLowerCase().includes('hentai');

    return catalog.filter((anime) => {
      if (anime.published === false) return false;
      if (!isExplicitHentai && isHentaiAnime(anime)) return false;
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        const titleMatch = (anime.title || '').toLowerCase().includes(q);
        const altMatch = anime.altTitles?.some((alt) => (alt || '').toLowerCase().includes(q));
        if (!titleMatch && !altMatch) return false;
      }
      if (draftGenres.length > 0) {
        const animeGenres = (anime.genres || []).map((g) => g.toLowerCase());
        const hasMatch = draftGenres.some((g) => animeGenres.includes(g.toLowerCase()));
        if (!hasMatch) return false;
      }
      if (draftYear !== 'all' && anime.year !== Number(draftYear)) {
        return false;
      }
      return true;
    }).length;
  }, [catalog, debouncedQuery, draftGenres, draftYear]);

  // Clear all filters completely
  const handleClearAll = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setQuickChip('All');
    setSelectedGenres([]);
    setSelectedYear('all');
  };

  // Close sheet on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSheetOpen) setIsSheetOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSheetOpen]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSheetOpen]);

  usePageSeo({
    title: debouncedQuery ? `Search: "${debouncedQuery}" — ZYNOX ANIME` : 'Explore Anime — ZYNOX ANIME',
    description: 'Explore and stream anime series & movies in Hindi Dub & English Sub with ultra-fast streaming on ZYNOX ANIME.',
    ogType: 'website',
  });

  const displayedItems = filteredAnimes.slice(0, displayCount);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3.5">
      {/* 1. TITLE: Exactly "Explore" */}
      <div>
        <h1 className="text-[24px] font-bold text-white tracking-tight leading-none">
          Explore
        </h1>
      </div>

      {/* 2. SEARCH BAR: Height 44px, placeholder "Search anime...", clear (X) button */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search anime..."
          autoComplete="off"
          spellCheck={false}
          className="w-full h-11 bg-[#0B1324] border border-white/10 rounded-xl pl-10 pr-10 text-[13px] sm:text-sm text-white placeholder-[#64748B] outline-none focus:border-[#1E88FF] transition-colors"
        />
        {searchInput.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setDebouncedQuery('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. ONE SINGLE ROW: [Filters icon button] + quick chips (horizontal scroll) */}
      <div className="relative flex items-center gap-2 min-w-0">
        {/* Filters icon button with count badge (0 -> no badge) */}
        <button
          type="button"
          onClick={handleOpenSheet}
          className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
            filterBadgeCount > 0
              ? 'bg-[#1E88FF]/15 border-[#1E88FF] text-white font-semibold'
              : 'bg-[#0B1324] hover:bg-[#101A30] border-white/10 text-[#CBD5E1]'
          }`}
          title="Open filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>Filters</span>
          {filterBadgeCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#1E88FF] text-white text-[11px] font-bold flex items-center justify-center leading-none">
              {filterBadgeCount}
            </span>
          )}
        </button>

        {/* Quick Chips Track with 16px right padding and edge-fade */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div
            ref={quickChipsRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x px-4 py-0.5"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {QUICK_CHIPS.map((chip) => {
              const isSelected = quickChip === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={(e) => handleQuickChipClick(chip, e)}
                  className={`h-9 px-3.5 rounded-lg text-[13px] font-medium whitespace-nowrap shrink-0 snap-start transition-all cursor-pointer leading-none flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#1E88FF] border border-[#1E88FF] text-white font-bold shadow-sm'
                      : 'bg-transparent border border-white/[0.12] text-[#94A3B8] hover:text-white hover:border-white/20'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Right edge fade gradient */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050A14] to-transparent" />
        </div>
      </div>

      {/* 4. ACTIVE FILTER CHIPS ROW: ONLY when Genre or Year is selected */}
      {(selectedGenres.length > 0 || selectedYear !== 'all') && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {selectedGenres.map((genre) => (
            <span
              key={genre}
              className="h-8 px-2.5 rounded-lg bg-[#0B1324] border border-white/10 text-[#CBD5E1] text-xs flex items-center gap-1.5 shrink-0"
            >
              <span className="truncate max-w-[120px]">{genre}</span>
              <button
                type="button"
                onClick={() => setSelectedGenres((prev) => prev.filter((g) => g !== genre))}
                className="hover:text-white text-[#94A3B8] p-0.5 cursor-pointer"
                title={`Remove ${genre}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {selectedYear !== 'all' && (
            <span className="h-8 px-2.5 rounded-lg bg-[#0B1324] border border-white/10 text-[#CBD5E1] text-xs flex items-center gap-1.5 shrink-0">
              <span>{selectedYear}</span>
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className="hover:text-white text-[#94A3B8] p-0.5 cursor-pointer"
                title="Remove year"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Single "Clear all" link */}
          <button
            type="button"
            onClick={() => {
              setSelectedGenres([]);
              setSelectedYear('all');
            }}
            className="text-xs font-semibold text-[#1E88FF] hover:text-[#00CFFF] whitespace-nowrap ml-2 cursor-pointer transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. RESULT LINE: "5 results" left, ONE custom sort dropdown right */}
      <div className="flex items-center justify-between text-[13px] text-[#94A3B8] min-h-[40px] pt-0.5">
        <span className="font-medium whitespace-nowrap">
          {filteredAnimes.length} results
        </span>

        <CustomSortDropdown value={sortBy} onChange={setSortBy} />
      </div>

      {/* 6. RESULTS GRID / COMPACT EMPTY STATE */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 min-h-[360px]">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={`explore-skel-${idx}`} className="space-y-1.5">
              <div className="aspect-[2/3] w-full rounded-xl bg-[#0B1324] animate-pulse border border-white/5" />
              <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        /* Compact Empty State (max 200px, fits 640px screen without scrolling) */
        <div className="py-7 px-4 text-center bg-[#0B1324]/50 border border-white/5 rounded-2xl max-w-sm mx-auto space-y-2 max-h-[200px]">
          <Film className="w-6 h-6 text-[#94A3B8]/60 mx-auto" />
          <h3 className="text-sm font-bold text-white">No anime found</h3>
          <p className="text-xs text-[#94A3B8] leading-tight">
            Try adjusting your search query or filters.
          </p>
          <div className="pt-1.5">
            <button
              type="button"
              onClick={handleClearAll}
              className="h-8 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1570d8] text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-[360px]">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayedItems.map((anime) => (
              <ExploreCard
                key={anime.id || anime.slug}
                anime={anime}
                navigate={navigate}
              />
            ))}
          </div>

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-6 w-full" />

          {/* End of results message */}
          {!hasMore && (
            <p className="text-center text-xs text-[#64748B] py-6 font-medium">
              No more anime to show
            </p>
          )}
        </div>
      )}

      {/* 7. FILTERS SHEET: ONLY 2 SECTIONS (Genre + Release Year) */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* Backdrop (rgba(0,0,0,0.6) without heavy blur) */}
          <div
            onClick={handleCloseSheet}
            className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in duration-200 cursor-pointer"
          />

          {/* Bottom Sheet on phone, right-side drawer on desktop */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filters Sheet"
            style={sheetDragY > 0 ? { transform: `translateY(${sheetDragY}px)` } : undefined}
            className="fixed z-[101] bg-[#0B1324] flex flex-col shadow-2xl transition-transform duration-220 ease-out
              inset-x-0 bottom-0 rounded-t-[20px] border-t border-white/10 h-auto min-h-[50dvh] max-h-[85dvh]
              lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:w-[380px] lg:h-full lg:max-h-none lg:min-h-0 lg:rounded-none lg:border-l lg:border-t-0
              animate-in slide-in-from-bottom lg:slide-in-from-right duration-220"
          >
            {/* Fixed Header */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="shrink-0 px-5 pt-2.5 pb-3 border-b border-white/10 bg-[#0B1324] rounded-t-[20px] lg:rounded-none"
            >
              {/* Drag Handle on phone */}
              <div className="pb-2.5 flex justify-center lg:hidden cursor-grab active:cursor-grabbing touch-none">
                <span className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">Filters</h2>
                  {filterBadgeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#1E88FF] text-white text-[11px] font-bold">
                      {filterBadgeCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseSheet}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Area: flex-1, overflow-y-auto, overscroll-contain, 20px section spacing */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 no-scrollbar">
              {/* SECTION A: Genre (36px high chips, wrap) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    Genre {draftGenres.length > 0 && `(${draftGenres.length})`}
                  </h3>
                  {draftGenres.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftGenres([])}
                      className="text-xs font-semibold text-[#1E88FF] hover:text-[#00CFFF] transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 transition-all duration-200">
                  {(showAllGenresInSheet ? availableGenres : availableGenres.slice(0, 10)).map((g) => {
                    const isSelected = draftGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setDraftGenres((prev) => prev.filter((item) => item !== g));
                          } else {
                            setDraftGenres((prev) => [...prev, g]);
                          }
                        }}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#1E88FF] border-[#1E88FF] text-white'
                            : 'bg-[#101A30] border-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>

                {availableGenres.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setShowAllGenresInSheet((prev) => !prev)}
                    className="text-xs font-semibold text-[#1E88FF] hover:text-[#00CFFF] transition-colors cursor-pointer pt-2 block"
                  >
                    {showAllGenresInSheet ? 'Show less' : `+ Show ${availableGenres.length - 10} more genres`}
                  </button>
                )}
              </div>

              {/* SECTION B: Release Year (Custom Dropdown) */}
              <div>
                <h3 className="text-[13px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
                  Release Year
                </h3>
                <CustomYearDropdown
                  value={draftYear}
                  options={availableYears}
                  onChange={setDraftYear}
                />
              </div>
            </div>

            {/* Fixed Footer: [Reset] + [Show N results] (safe-area padding, never covers content) */}
            <div
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
              className="shrink-0 p-4 border-t border-white/10 bg-[#0B1324] flex items-center gap-3"
            >
              <button
                type="button"
                onClick={handleResetDraft}
                className="h-11 px-4 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 rounded-xl hover:bg-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleApplyDraft}
                className="flex-1 h-11 bg-[#1E88FF] hover:bg-[#1570d8] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Show {draftResultsCount} results</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
