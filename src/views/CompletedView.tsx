import React, { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import { getAllAnimes } from '../lib/firestore/anime';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeCardSkeleton } from '../components/SkeletonLoader';
import { CheckCircle, Trophy, Sparkles, Filter } from 'lucide-react';

interface CompletedViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const CompletedView: React.FC<CompletedViewProps> = ({ navigate, onShowMessage }) => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'rating' | 'latest' | 'views'>('rating');

  useEffect(() => {
    getAllAnimes()
      .then((list) => {
        const completedList = list.filter((a) => a.status === 'completed');
        setAnimes(completedList);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch completed anime:', err);
        setLoading(false);
      });
  }, []);

  const sorted = [...animes].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'views') return (b.viewsCount || 0) - (a.viewsCount || 0);
    return (b.year || 0) - (a.year || 0);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#170E28] via-[#2A1646] to-[#190C2F] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Finished Broadcasts</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Completed <span className="text-purple-400">Masterpieces</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Ready to binge start-to-finish without waiting for weekly release delays. Complete season and series archives.
          </p>
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center justify-between gap-3 bg-[#0B1322] border border-white/5 p-3 rounded-2xl">
        <span className="text-xs font-bold text-[#94A3B8] flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-purple-400" />
          <span>{animes.length} Completed Titles</span>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSortBy('rating')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'rating'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
            }`}
          >
            Top Rated
          </button>
          <button
            type="button"
            onClick={() => setSortBy('views')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'views'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
            }`}
          >
            Most Popular
          </button>
          <button
            type="button"
            onClick={() => setSortBy('latest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              sortBy === 'latest'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Anime Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-12 text-center text-[#94A3B8] space-y-2">
          <CheckCircle className="w-8 h-8 text-purple-400 mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No completed anime found</h3>
          <p className="text-xs max-w-sm mx-auto">
            Titles marked as Completed by admins will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {sorted.map((anime) => (
            <AnimeCard key={anime.id || anime.slug} anime={anime} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};
