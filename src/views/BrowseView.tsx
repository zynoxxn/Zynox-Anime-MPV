import React, { useEffect, useState } from 'react';
import type { Anime, AnimeStatus, AnimeType } from '../types/anime';
import type { CmsGenre, CmsYear, CmsStatus, CmsType, CmsLanguage } from '../types/cms';
import { searchAndFilterAnimes, getCachedPublishedAnimes } from '../lib/firestore/anime';
import {
  getCmsGenres,
  getCmsYears,
  getCmsStatuses,
  getCmsTypes,
  getCmsLanguages,
} from '../lib/firestore/cms';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeGrid } from '../components/AnimeGrid';
import { AnimeCardSkeleton } from '../components/SkeletonLoader';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Compass,
  Film,
  X,
  Mic,
  Tag,
  Calendar,
  Activity,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Trophy,
  Tv,
  Zap,
  Heart,
  Clock,
  CheckCircle2,
  Check,
} from 'lucide-react';

interface BrowseViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
  initialQuery?: string;
  initialGenre?: string;
  initialType?: string;
  initialStatus?: string;
  initialYear?: string;
  initialLanguage?: string;
  initialLetter?: string;
  initialSort?: string;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  navigate,
  onShowMessage,
  initialQuery = '',
  initialGenre = 'all',
  initialType = 'all',
  initialStatus = 'all',
  initialYear = 'all',
  initialLanguage = 'all',
  initialLetter = 'all',
  initialSort = 'latest',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [status, setStatus] = useState<string>(initialStatus);
  const [type, setType] = useState<string>(initialType);
  const [year, setYear] = useState<string>(initialYear);
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [selectedLetter, setSelectedLetter] = useState<string>(initialLetter || 'all');
  const [sortBy, setSortBy] = useState<any>(initialSort || 'latest');
  const initialCached = getCachedPublishedAnimes();
  const [animes, setAnimes] = useState<Anime[]>(initialCached);
  const [loading, setLoading] = useState(initialCached.length === 0);
  const [showDetailedFilters, setShowDetailedFilters] = useState<boolean>(false);

  // Dynamic CMS Taxonomy States
  const [cmsGenres, setCmsGenres] = useState<CmsGenre[]>([]);

  // Dynamic Browse SEO
  const browseSeoTitle = React.useMemo(() => {
    let titleParts = ['Browse Anime'];
    if (language !== 'all') titleParts.push(language);
    if (genre !== 'all') titleParts.push(genre);
    if (type !== 'all') titleParts.push(type);
    return `${titleParts.join(' ')} in Hindi Dub & Eng Sub — ZYNOX ANIME`;
  }, [language, genre, type]);

  usePageSeo({
    title: browseSeoTitle,
    description: `Explore and stream anime series & movies in Hindi Dubbed and English Subtitles. Filter by genre, release year, language, and status on ZYNOX ANIME.`,
    keywords: 'browse anime, anime filter, anime hindi dub list, watch anime 1080p, latest anime release',
    ogType: 'website',
  });
  const [cmsYears, setCmsYears] = useState<CmsYear[]>([]);
  const [cmsStatuses, setCmsStatuses] = useState<CmsStatus[]>([]);
  const [cmsTypes, setCmsTypes] = useState<CmsType[]>([]);
  const [cmsLanguages, setCmsLanguages] = useState<CmsLanguage[]>([]);

  // Load CMS Dynamic Filters
  useEffect(() => {
    Promise.all([
      getCmsGenres(),
      getCmsYears(),
      getCmsStatuses(),
      getCmsTypes(),
      getCmsLanguages(),
    ])
      .then(([genres, years, statuses, types, languages]) => {
        setCmsGenres(genres.filter((g) => g.enabled));
        setCmsYears(years.filter((y) => y.enabled));
        setCmsStatuses(statuses.filter((s) => s.enabled));
        setCmsTypes(types.filter((t) => t.enabled));
        setCmsLanguages(languages.filter((l) => l.enabled));
      })
      .catch((err) => {
        console.warn('Failed to load CMS taxonomies for BrowseView:', err);
      });
  }, []);

  // Sync prop changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialGenre) setGenre(initialGenre);
  }, [initialGenre]);

  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (initialYear) setYear(initialYear);
  }, [initialYear]);

  useEffect(() => {
    if (initialLanguage) setLanguage(initialLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    if (initialSort) setSortBy(initialSort);
  }, [initialSort]);

  useEffect(() => {
    if (initialLetter) {
      setSelectedLetter(initialLetter);
    }
  }, [initialLetter]);

  const ALPHABET = ['all', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const fetchFiltered = async () => {
    try {
      setLoading(true);
      const results = await searchAndFilterAnimes({
        query: query.trim() || undefined,
        genre: genre !== 'all' ? genre : undefined,
        status: status !== 'all' ? (status as AnimeStatus) : undefined,
        type: type !== 'all' ? (type as AnimeType) : undefined,
        year: year !== 'all' ? Number(year) : undefined,
        audioLanguage: language !== 'all' ? language : undefined,
        sortBy: sortBy,
      });

      // Filter by starting letter if selected
      let filtered = results;
      const cleanLetter = (selectedLetter || '').trim().toUpperCase();
      if (cleanLetter && cleanLetter !== 'ALL') {
        const isNum = cleanLetter === '#' || cleanLetter === '0-9';
        if (isNum) {
          filtered = results.filter((a) => {
            const rawTitle = (a.title || '').trim();
            const cleanTitle = (a.title || '').replace(/^["'\s]+/, '');
            return /^[0-9#]/.test(cleanTitle) || /^[0-9#]/.test(rawTitle);
          });
        } else {
          filtered = results.filter((a) => {
            const rawTitle = (a.title || '').trim().toUpperCase();
            const cleanTitle = (a.title || '').replace(/^["'\s]+/, '').toUpperCase();
            const jpTitle = (a.japaneseTitle || '').trim().toUpperCase();
            return (
              rawTitle.startsWith(cleanLetter) ||
              cleanTitle.startsWith(cleanLetter) ||
              jpTitle.startsWith(cleanLetter)
            );
          });
        }
      }

      setAnimes(filtered);
    } catch (err) {
      console.error('BrowseView filter error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltered();
  }, [query, genre, status, type, year, language, selectedLetter, sortBy]);

  const handleResetFilters = () => {
    setQuery('');
    setGenre('all');
    setStatus('all');
    setType('all');
    setYear('all');
    setLanguage('all');
    setSelectedLetter('all');
    setSortBy('latest');
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    genre !== 'all' ||
    status !== 'all' ||
    type !== 'all' ||
    year !== 'all' ||
    language !== 'all' ||
    selectedLetter !== 'all' ||
    sortBy !== 'latest';

  // Count how many specific filters are active
  const activeFiltersCount = [
    query.trim() !== '',
    genre !== 'all',
    status !== 'all',
    type !== 'all',
    year !== 'all',
    language !== 'all',
    selectedLetter !== 'all',
    sortBy !== 'latest',
  ].filter(Boolean).length;

  // Quick Preset Handlers
  const applyPreset = (preset: 'all' | 'hindi' | 'trending' | 'top-rated' | 'movie' | 'tv' | 'action' | 'romance' | 'completed' | 'ongoing') => {
    switch (preset) {
      case 'all':
        handleResetFilters();
        break;
      case 'hindi':
        setLanguage(language === 'Hindi Dub' || language === 'Hindi' ? 'all' : 'Hindi Dub');
        break;
      case 'trending':
        setSortBy(sortBy === 'trending' ? 'latest' : 'trending');
        break;
      case 'top-rated':
        setSortBy(sortBy === 'rating' ? 'latest' : 'rating');
        break;
      case 'movie':
        setType(type.toLowerCase() === 'movie' ? 'all' : 'Movie');
        break;
      case 'tv':
        setType(type.toLowerCase() === 'tv' ? 'all' : 'TV');
        break;
      case 'action':
        setGenre(genre.toLowerCase() === 'action' ? 'all' : 'Action');
        break;
      case 'romance':
        setGenre(genre.toLowerCase() === 'romance' ? 'all' : 'Romance');
        break;
      case 'completed':
        setStatus(status.toLowerCase() === 'completed' ? 'all' : 'completed');
        break;
      case 'ongoing':
        setStatus(status.toLowerCase() === 'ongoing' ? 'all' : 'ongoing');
        break;
    }
  };

  const DEFAULT_GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
    'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Shounen',
    'Slice of Life', 'Supernatural', 'Thriller', 'Isekai'
  ];

  const allGenresList = React.useMemo(() => {
    const list = cmsGenres.length > 0 ? cmsGenres.map((g) => g.name) : DEFAULT_GENRES;
    return Array.from(new Set(list));
  }, [cmsGenres]);

  const yearsList = React.useMemo(() => {
    if (cmsYears.length > 0) return cmsYears.map((y) => y.year);
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current; y >= 2000; y--) {
      list.push(y);
    }
    return list;
  }, [cmsYears]);

  const isTrendingMode = sortBy === 'trending' || sortBy === 'popular';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#F5F9FF] flex items-center gap-3 tracking-tight">
            {isTrendingMode ? (
              <>
                <Flame className="w-7 h-7 text-orange-500" />
                <span>Trending Anime</span>
              </>
            ) : (
              <>
                <Compass className="w-7 h-7 text-[#00A8FF]" />
                <span>Explore Anime</span>
              </>
            )}
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7F95]" />
          <input
            type="text"
            name="explore_search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Search by title, Japanese name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#0B1322] border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-[#6E7F95] outline-none focus:border-[#00A8FF] transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7F95] hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SIMPLIFIED & POWERFUL QUICK FILTERS */}
      {!isTrendingMode && (
        <div className="bg-[#081120]/90 backdrop-blur-md border border-white/5 rounded-2xl p-3 sm:p-4 space-y-3.5 shadow-lg shadow-black/20">
          {/* Top Bar: Title, Active Count & Clear All */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#00A8FF]/15 flex items-center justify-center text-[#00A8FF]">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Quick Filters
              </span>
              {hasActiveFilters && (
                <span className="text-[11px] font-bold text-[#00A8FF] bg-[#00A8FF]/15 px-2 py-0.5 rounded-full border border-[#00A8FF]/30">
                  {activeFiltersCount} active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-all cursor-pointer py-1 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-95"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowDetailedFilters((prev) => !prev)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                  showDetailedFilters
                    ? 'text-[#00A8FF] bg-[#00A8FF]/15 border-[#00A8FF]/30 shadow-sm'
                    : 'text-[#A9B8CC] hover:text-white bg-white/5 hover:bg-white/10 border-white/5'
                }`}
                title="Toggle more filter options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">More</span>
                <span>Filters</span>
                {showDetailedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 1-Tap Quick Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {/* All */}
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                !hasActiveFilters
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>All</span>
            </button>

            {/* Hindi Dub */}
            <button
              type="button"
              onClick={() => applyPreset('hindi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                language === 'Hindi Dub' || language === 'Hindi'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 border border-amber-400 font-extrabold'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-amber-500/30'
              }`}
            >
              <Mic className={`w-3.5 h-3.5 ${language === 'Hindi Dub' || language === 'Hindi' ? 'text-black' : 'text-amber-400'}`} />
              <span>Hindi Dub</span>
              {(language === 'Hindi Dub' || language === 'Hindi') && (
                <Check className="w-3 h-3 stroke-[3]" />
              )}
            </button>

            {/* Top Rated */}
            <button
              type="button"
              onClick={() => applyPreset('top-rated')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                sortBy === 'rating'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Top Rated</span>
              {sortBy === 'rating' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Movies */}
            <button
              type="button"
              onClick={() => applyPreset('movie')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                type.toLowerCase() === 'movie'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Movies</span>
              {type.toLowerCase() === 'movie' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* TV Series */}
            <button
              type="button"
              onClick={() => applyPreset('tv')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                type.toLowerCase() === 'tv'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-blue-400" />
              <span>TV Series</span>
              {type.toLowerCase() === 'tv' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Trending */}
            <button
              type="button"
              onClick={() => applyPreset('trending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                sortBy === 'trending'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Trending</span>
              {sortBy === 'trending' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Ongoing */}
            <button
              type="button"
              onClick={() => applyPreset('ongoing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                status.toLowerCase() === 'ongoing'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ongoing</span>
              {status.toLowerCase() === 'ongoing' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Completed */}
            <button
              type="button"
              onClick={() => applyPreset('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                status.toLowerCase() === 'completed'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed</span>
              {status.toLowerCase() === 'completed' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Action */}
            <button
              type="button"
              onClick={() => applyPreset('action')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                genre.toLowerCase() === 'action'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Action</span>
              {genre.toLowerCase() === 'action' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Romance */}
            <button
              type="button"
              onClick={() => applyPreset('romance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                genre.toLowerCase() === 'romance'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Romance</span>
              {genre.toLowerCase() === 'romance' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
          </div>

          {/* Detailed Filters (Collapsible & Intuitive) */}
          {showDetailedFilters && (
            <div className="pt-2 border-t border-white/5 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {/* 1. Genre */}
                <div className="relative">
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className={`w-full appearance-none rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition-all cursor-pointer pr-7 ${
                      genre !== 'all'
                        ? 'bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/50 shadow-sm'
                        : 'bg-[#0B1322] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="all" className="bg-[#0B1322] text-white">Genre: All</option>
                    {allGenresList.map((g) => (
                      <option key={g} value={g} className="bg-[#0B1322] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-white" />
                </div>

                {/* 2. Audio Language */}
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`w-full appearance-none rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition-all cursor-pointer pr-7 ${
                      language !== 'all'
                        ? 'bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/50 shadow-sm'
                        : 'bg-[#0B1322] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="all" className="bg-[#0B1322] text-white">Audio: All</option>
                    <option value="Hindi Dub" className="bg-[#0B1322] text-white">Hindi Dub</option>
                    <option value="Japanese" className="bg-[#0B1322] text-white">Japanese Sub</option>
                    <option value="English" className="bg-[#0B1322] text-white">English Dub</option>
                    {cmsLanguages
                      .filter((l) => !['Hindi Dub', 'Japanese', 'English'].includes(l.name))
                      .map((l) => (
                        <option key={l.id} value={l.name} className="bg-[#0B1322] text-white">
                          {l.name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-white" />
                </div>

                {/* 3. Type */}
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={`w-full appearance-none rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition-all cursor-pointer pr-7 ${
                      type !== 'all'
                        ? 'bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/50 shadow-sm'
                        : 'bg-[#0B1322] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="all" className="bg-[#0B1322] text-white">Type: All</option>
                    <option value="TV" className="bg-[#0B1322] text-white">TV Series</option>
                    <option value="Movie" className="bg-[#0B1322] text-white">Movie</option>
                    <option value="OVA" className="bg-[#0B1322] text-white">OVA</option>
                    <option value="Special" className="bg-[#0B1322] text-white">Special</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-white" />
                </div>

                {/* 4. Status */}
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full appearance-none rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition-all cursor-pointer pr-7 ${
                      status !== 'all'
                        ? 'bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/50 shadow-sm'
                        : 'bg-[#0B1322] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="all" className="bg-[#0B1322] text-white">Status: All</option>
                    <option value="ongoing" className="bg-[#0B1322] text-white">Ongoing</option>
                    <option value="completed" className="bg-[#0B1322] text-white">Completed</option>
                    <option value="upcoming" className="bg-[#0B1322] text-white">Upcoming</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-white" />
                </div>

                {/* 5. Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`w-full appearance-none rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition-all cursor-pointer pr-7 ${
                      sortBy !== 'latest'
                        ? 'bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/50 shadow-sm'
                        : 'bg-[#0B1322] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="latest" className="bg-[#0B1322] text-white">Sort: Latest</option>
                    <option value="rating" className="bg-[#0B1322] text-white">Sort: Rating</option>
                    <option value="views" className="bg-[#0B1322] text-white">Sort: Views</option>
                    <option value="popular" className="bg-[#0B1322] text-white">Sort: Popular</option>
                    <option value="title" className="bg-[#0B1322] text-white">Sort: A-Z</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-white" />
                </div>

                {/* 6. Year */}
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={`w-full appearance-none rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition-all cursor-pointer pr-7 ${
                      year !== 'all'
                        ? 'bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/50 shadow-sm'
                        : 'bg-[#0B1322] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <option value="all" className="bg-[#0B1322] text-white">Year: All</option>
                    {yearsList.map((yr) => (
                      <option key={yr} value={yr} className="bg-[#0B1322] text-white">
                        {yr}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-white" />
                </div>
              </div>

              {/* A-Z Letter Directory Strip */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none pt-1">
                <span className="text-[10px] font-bold text-[#6E7F95] px-1 shrink-0 uppercase tracking-wider">
                  A-Z:
                </span>
                {ALPHABET.map((char) => {
                  const isSelected =
                    selectedLetter.toUpperCase() === char.toUpperCase() ||
                    (char === '#' && (selectedLetter === '0-9' || selectedLetter === '#'));
                  return (
                    <button
                      key={char}
                      type="button"
                      onClick={() => setSelectedLetter(isSelected ? 'all' : char)}
                      className={`min-w-[26px] h-6 px-1 rounded-md text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00A8FF] text-white shadow-sm font-black'
                          : 'text-[#A9B8CC] hover:bg-white/5 hover:text-white'
                      }`}
                      title={char === 'all' ? 'All Letters' : `Filter letter ${char}`}
                    >
                      {char === 'all' ? 'ALL' : char.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filter Chips Bar (Easy 1-tap removal) */}
          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-white/5 text-xs">
              <span className="text-[11px] font-semibold text-[#6E7F95] mr-1">Active:</span>

              {query.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span>&ldquo;{query}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {genre !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span>Genre: {genre}</span>
                  <button
                    type="button"
                    onClick={() => setGenre('all')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove genre"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {language !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  <span>Audio: {language}</span>
                  <button
                    type="button"
                    onClick={() => setLanguage('all')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove audio filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {type !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span>Type: {type}</span>
                  <button
                    type="button"
                    onClick={() => setType('all')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove type filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {status !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span className="capitalize">{status}</span>
                  <button
                    type="button"
                    onClick={() => setStatus('all')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove status filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {year !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span>{year}</span>
                  <button
                    type="button"
                    onClick={() => setYear('all')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove year filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedLetter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span>Letter: {selectedLetter === '0-9' ? '#' : selectedLetter.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLetter('all')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove letter filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {sortBy !== 'latest' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-semibold">
                  <span className="capitalize">
                    Sort: {sortBy === 'rating' ? 'Top Rated' : sortBy === 'views' ? 'Most Views' : sortBy}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSortBy('latest')}
                    className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                    title="Reset sort"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 ml-auto flex items-center gap-1 transition-colors cursor-pointer py-0.5 px-2 rounded-lg hover:bg-rose-500/10"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Results Counter */}
      <div className="flex items-center justify-between text-xs text-[#A9B8CC] px-1">
        <span className="font-semibold">
          Found <span className="text-white font-bold">{animes.length}</span> {animes.length === 1 ? 'anime' : 'animes'}
        </span>
        {hasActiveFilters && (
          <span className="text-[#00A8FF] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A8FF] animate-pulse" />
            <span>Filters applied</span>
          </span>
        )}
      </div>

      {/* Anime Grid with Shimmer Skeleton Loading */}
      <AnimeGrid
        id="browse-anime-grid"
        animes={animes}
        loading={loading}
        skeletonCount={12}
        columns="browse"
        navigate={navigate}
        onShowMessage={onShowMessage}
        emptyState={
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-10 sm:p-12 text-center text-[#A9B8CC] space-y-4">
            <Film className="w-12 h-12 text-[#00A8FF] mx-auto opacity-50" />
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">No anime found matching your criteria</h3>
              <p className="text-xs sm:text-sm max-w-md mx-auto text-[#6E7F95]">
                Try changing the search query, selecting different genres, or clearing the active filters.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-[#00A8FF] hover:bg-[#0090dd] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00A8FF]/20 cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetFilters();
                  setLanguage('Hindi Dub');
                }}
                className="px-4 py-2.5 bg-[#07111F] hover:bg-[#132038] text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                Show Hindi Dubbed
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
};
