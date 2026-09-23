import React, { useEffect, useState } from 'react';
import type { Anime, AnimeStatus, AnimeType } from '../types/anime';
import type { CmsGenre, CmsYear, CmsStatus, CmsType, CmsLanguage } from '../types/cms';
import { searchAndFilterAnimes } from '../lib/firestore/anime';
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
  initialSort = 'latest',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [status, setStatus] = useState<string>(initialStatus);
  const [type, setType] = useState<string>(initialType);
  const [year, setYear] = useState<string>(initialYear);
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<any>(initialSort || 'latest');
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (selectedLetter !== 'all') {
        if (selectedLetter === '#') {
          filtered = results.filter((a) => /^[0-9]/.test((a.title || '').trim()));
        } else {
          filtered = results.filter((a) =>
            (a.title || '').trim().toUpperCase().startsWith(selectedLetter)
          );
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

      {/* QUICK FILTERS BAR (Hidden in Trending Mode) */}
      {!isTrendingMode && (
        <div className="space-y-2.5 bg-[#081120]/60 border border-white/5 rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#00A8FF]/15 flex items-center justify-center text-[#00A8FF]">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Quick Filters
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer py-0.5 px-2 rounded-lg hover:bg-rose-500/10"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ({activeFiltersCount})</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDetailedFilters((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#00A8FF] hover:text-white transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showDetailedFilters ? 'Hide Details' : 'More Filters'}</span>
              {showDetailedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 1-Tap Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. All */}
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                !hasActiveFilters
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>All</span>
            </button>

            {/* 2. Hindi Dub */}
            <button
              type="button"
              onClick={() => applyPreset('hindi')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                language === 'Hindi Dub' || language === 'Hindi'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-amber-500/30 hover:border-amber-500/50'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Hindi Dub</span>
              {(language === 'Hindi Dub' || language === 'Hindi') && (
                <Check className="w-3 h-3 text-white stroke-[3]" />
              )}
            </button>

            {/* 3. Top Rated */}
            <button
              type="button"
              onClick={() => applyPreset('top-rated')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                sortBy === 'rating'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Top Rated</span>
              {sortBy === 'rating' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>

            {/* 4. TV Series */}
            <button
              type="button"
              onClick={() => applyPreset('tv')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                type.toLowerCase() === 'tv'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-blue-400" />
              <span>TV Series</span>
              {type.toLowerCase() === 'tv' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>

            {/* 5. Movies */}
            <button
              type="button"
              onClick={() => applyPreset('movie')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                type.toLowerCase() === 'movie'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Movies</span>
              {type.toLowerCase() === 'movie' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>

            {/* 6. Action */}
            <button
              type="button"
              onClick={() => applyPreset('action')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                genre.toLowerCase() === 'action'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Action</span>
              {genre.toLowerCase() === 'action' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>

            {/* 7. Romance */}
            <button
              type="button"
              onClick={() => applyPreset('romance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                genre.toLowerCase() === 'romance'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Romance</span>
              {genre.toLowerCase() === 'romance' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>

            {/* 8. Ongoing */}
            <button
              type="button"
              onClick={() => applyPreset('ongoing')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                status.toLowerCase() === 'ongoing'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ongoing</span>
              {status.toLowerCase() === 'ongoing' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>

            {/* 9. Completed */}
            <button
              type="button"
              onClick={() => applyPreset('completed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                status.toLowerCase() === 'completed'
                  ? 'bg-[#00A8FF] text-white shadow-md shadow-[#00A8FF]/25 border border-[#00A8FF]'
                  : 'bg-[#0B1322] hover:bg-[#132038] text-[#A9B8CC] hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed</span>
              {status.toLowerCase() === 'completed' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE FILTERS REMOVABLE CHIPS BAR */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 pt-1 pb-1">
          <span className="text-xs font-semibold text-[#6E7F95] flex items-center gap-1">
            <span>Active filters:</span>
          </span>

          {query.trim() && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
              <span>Search: &ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {genre !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
              <span>Genre: {genre}</span>
              <button
                type="button"
                onClick={() => setGenre('all')}
                className="hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Remove genre filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {status !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
              <span className="capitalize">Status: {status}</span>
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

          {type !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
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

          {year !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
              <span>Year: {year}</span>
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

          {language !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
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

          {selectedLetter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
              <span>Letter: {selectedLetter.toUpperCase()}</span>
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#00A8FF]/15 text-[#00A8FF] border border-[#00A8FF]/30 font-medium">
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
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 ml-1 flex items-center gap-1 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-500/10"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* DYNAMIC FILTER CONTROLS (EXPANDABLE) */}
      {showDetailedFilters && (
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#00A8FF]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Filter by Details
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-[#F87171] hover:text-rose-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Genre */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              genre !== 'all'
                ? 'bg-[#00A8FF]/10 border-[#00A8FF]/40'
                : 'bg-[#050A14]/70 border-white/5'
            }`}>
              <label className="text-[11px] font-bold text-[#A9B8CC] uppercase mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#00A8FF]" />
                <span>Genre</span>
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#081120] text-white border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00A8FF] transition-all cursor-pointer"
              >
                <option value="all">All Genres</option>
                {cmsGenres.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Status */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              status !== 'all'
                ? 'bg-[#00A8FF]/10 border-[#00A8FF]/40'
                : 'bg-[#050A14]/70 border-white/5'
            }`}>
              <label className="text-[11px] font-bold text-[#A9B8CC] uppercase mb-1.5 flex items-center gap-1">
                <Activity className="w-3 h-3 text-[#00A8FF]" />
                <span>Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#081120] text-white border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00A8FF] transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {cmsStatuses.length > 0 ? (
                  cmsStatuses.map((s) => (
                    <option key={s.id} value={s.slug || s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="upcoming">Upcoming</option>
                  </>
                )}
              </select>
            </div>

            {/* 3. Type */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              type !== 'all'
                ? 'bg-[#00A8FF]/10 border-[#00A8FF]/40'
                : 'bg-[#050A14]/70 border-white/5'
            }`}>
              <label className="text-[11px] font-bold text-[#A9B8CC] uppercase mb-1.5 flex items-center gap-1">
                <Film className="w-3 h-3 text-[#00A8FF]" />
                <span>Type</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#081120] text-white border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00A8FF] transition-all cursor-pointer"
              >
                <option value="all">All Types</option>
                {cmsTypes.length > 0 ? (
                  cmsTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="TV">TV Series</option>
                    <option value="Movie">Movie</option>
                    <option value="OVA">OVA</option>
                    <option value="Special">Special</option>
                  </>
                )}
              </select>
            </div>

            {/* 4. Year */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              year !== 'all'
                ? 'bg-[#00A8FF]/10 border-[#00A8FF]/40'
                : 'bg-[#050A14]/70 border-white/5'
            }`}>
              <label className="text-[11px] font-bold text-[#A9B8CC] uppercase mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#00A8FF]" />
                <span>Year</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-[#081120] text-white border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00A8FF] transition-all cursor-pointer"
              >
                <option value="all">All Years</option>
                {cmsYears.length > 0 ? (
                  cmsYears.map((y) => (
                    <option key={y.id} value={y.year}>
                      {y.year}
                    </option>
                  ))
                ) : (
                  [2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 5. Audio Language */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              language !== 'all'
                ? 'bg-[#00A8FF]/10 border-[#00A8FF]/40'
                : 'bg-[#050A14]/70 border-white/5'
            }`}>
              <label className="text-[11px] font-bold text-[#A9B8CC] uppercase mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3 text-[#00A8FF]" />
                <span>Audio Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#081120] text-white border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00A8FF] transition-all cursor-pointer"
              >
                <option value="all">All Audio</option>
                {cmsLanguages.length > 0 ? (
                  cmsLanguages.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Hindi Dub">Hindi Dub</option>
                    <option value="Japanese">Japanese Sub</option>
                    <option value="English">English Dub</option>
                  </>
                )}
              </select>
            </div>

            {/* 6. Sort By */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              sortBy !== 'latest'
                ? 'bg-[#00A8FF]/10 border-[#00A8FF]/40'
                : 'bg-[#050A14]/70 border-white/5'
            }`}>
              <label className="text-[11px] font-bold text-[#A9B8CC] uppercase mb-1.5 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-[#00A8FF]" />
                <span>Sort By</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-[#081120] text-white border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00A8FF] transition-all cursor-pointer"
              >
                <option value="latest">Latest Added</option>
                <option value="rating">Highest Rating</option>
                <option value="views">Most Views</option>
                <option value="popular">Most Popular</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {/* A-Z Letter Filter Bar */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-[#6E7F95] px-1 shrink-0 uppercase">
                A-Z:
              </span>
              {ALPHABET.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => setSelectedLetter(char)}
                  className={`min-w-[28px] h-6 px-1.5 rounded text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    selectedLetter === char
                      ? 'bg-[#00A8FF] text-white shadow-sm'
                      : 'text-[#A9B8CC] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {char.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
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
