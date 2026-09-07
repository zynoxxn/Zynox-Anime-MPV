import React, { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import type { CmsYear } from '../types/cms';
import { getAllAnimes } from '../lib/firestore/anime';
import { getCmsYears } from '../lib/firestore/cms';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeCardSkeleton } from '../components/SkeletonLoader';
import { Calendar, Filter, Sparkles } from 'lucide-react';

interface YearAnimeViewProps {
  year: string;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const YearAnimeView: React.FC<YearAnimeViewProps> = ({ year, navigate, onShowMessage }) => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [yearsList, setYearsList] = useState<CmsYear[]>([]);
  const [loading, setLoading] = useState(true);

  const numericYear = parseInt(year, 10);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAllAnimes(), getCmsYears()])
      .then(([allAnimes, cmsYears]) => {
        if (isMounted) {
          const filtered = allAnimes.filter((a) => a.year === numericYear);
          setAnimes(filtered);
          setYearsList(cmsYears.filter((y) => y.enabled));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load year animes:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [numericYear]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-[#0E1726] via-[#111C30] to-[#0A1120] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1683FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1683FF]/15 border border-[#1683FF]/30 text-[#1683FF] text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Release Archive</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Anime Released in <span className="text-[#1683FF]">{year}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Browse all anime television broadcasts, OVA releases, and movies premiered in the year {year}.
          </p>
        </div>
      </div>

      {/* Year Switcher Bar */}
      {yearsList.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#0B1322] border border-white/5 p-3 rounded-2xl">
          <span className="text-xs font-bold text-[#94A3B8] px-2 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#1683FF]" /> Switch Year:
          </span>
          {yearsList.map((y) => {
            const isCurrent = y.year === numericYear;
            return (
              <button
                key={y.id}
                type="button"
                onClick={() => navigate(`/year/${y.year}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                    : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                }`}
              >
                {y.year}
              </button>
            );
          })}
        </div>
      )}

      {/* Anime Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : animes.length === 0 ? (
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-12 text-center text-[#94A3B8] space-y-2">
          <Calendar className="w-8 h-8 text-[#1683FF] mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No anime found for {year}</h3>
          <p className="text-xs max-w-sm mx-auto">
            Try switching to another year from the archive bar above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {animes.map((anime) => (
            <AnimeCard key={anime.id || anime.slug} anime={anime} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};
