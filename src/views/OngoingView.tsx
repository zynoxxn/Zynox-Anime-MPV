import React, { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import { getAllAnimes } from '../lib/firestore/anime';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeCardSkeleton } from '../components/SkeletonLoader';
import { PlayCircle, Tv, Sparkles, Filter } from 'lucide-react';

interface OngoingViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const OngoingView: React.FC<OngoingViewProps> = ({ navigate, onShowMessage }) => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('all');

  useEffect(() => {
    getAllAnimes()
      .then((list) => {
        const ongoingList = list.filter((a) => a.status === 'ongoing' || !a.status);
        setAnimes(ongoingList);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch ongoing anime:', err);
        setLoading(false);
      });
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const filtered = selectedDay === 'all'
    ? animes
    : animes.filter((a) => a.releaseDay === selectedDay);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#0A1A17] via-[#0E2C24] to-[#081914] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Currently Airing</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Ongoing <span className="text-emerald-400">Anime Releases</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Follow weekly ongoing anime broadcasts in high definition with fresh Hindi dubs and English subtitles.
          </p>
        </div>
      </div>

      {/* Broadcast Day Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedDay('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedDay === 'all'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
              : 'bg-[#0B1322] border border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
          }`}
        >
          All Airing
        </button>
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDay === day
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'bg-[#0B1322] border border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Anime Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-12 text-center text-[#94A3B8] space-y-2">
          <Tv className="w-8 h-8 text-emerald-400 mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No ongoing anime found</h3>
          <p className="text-xs max-w-sm mx-auto">
            Anime with Ongoing status will appear here automatically.
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
