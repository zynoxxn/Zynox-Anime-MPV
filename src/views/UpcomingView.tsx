import React, { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import { getAllAnimes } from '../lib/firestore/anime';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeCardSkeleton } from '../components/SkeletonLoader';
import { Clock, Calendar, Sparkles, Filter } from 'lucide-react';

interface UpcomingViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const UpcomingView: React.FC<UpcomingViewProps> = ({ navigate, onShowMessage }) => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  useEffect(() => {
    getAllAnimes()
      .then((list) => {
        const upcomingList = list.filter((a) => a.status === 'upcoming');
        setAnimes(upcomingList);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch upcoming anime:', err);
        setLoading(false);
      });
  }, []);

  const seasons = Array.from(new Set(animes.map((a) => a.season).filter(Boolean))) as string[];

  const filtered = selectedSeason === 'all'
    ? animes
    : animes.filter((a) => a.season === selectedSeason);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#071324] via-[#0E1F38] to-[#0A162B] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Future Releases</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Upcoming <span className="text-cyan-400">Anime Series</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Discover confirmed anime adaptations, new seasons, and upcoming theatrical movies scheduled for broadcast.
          </p>
        </div>
      </div>

      {/* Season Filters */}
      {seasons.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSeason('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedSeason === 'all'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'bg-[#0B1322] border border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
            }`}
          >
            All Upcoming
          </button>
          {seasons.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSeason(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedSeason === s
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-[#0B1322] border border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Anime Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-12 text-center text-[#94A3B8] space-y-2">
          <Calendar className="w-8 h-8 text-cyan-400 mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No upcoming anime found</h3>
          <p className="text-xs max-w-sm mx-auto">
            New upcoming titles added by administrators will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((anime) => (
            <AnimeCard key={anime.id || anime.slug} anime={anime} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};
