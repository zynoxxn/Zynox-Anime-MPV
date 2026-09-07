import React, { useEffect, useState } from 'react';
import type { Anime } from '../types/anime';
import type { CmsSeason } from '../types/cms';
import { getAllAnimes } from '../lib/firestore/anime';
import { getCmsSeasons } from '../lib/firestore/cms';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeCardSkeleton } from '../components/SkeletonLoader';
import { Sparkles, Calendar, Layers } from 'lucide-react';

interface SeasonAnimeViewProps {
  seasonSlug: string;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const SeasonAnimeView: React.FC<SeasonAnimeViewProps> = ({ seasonSlug, navigate, onShowMessage }) => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [seasons, setSeasons] = useState<CmsSeason[]>([]);
  const [currentSeason, setCurrentSeason] = useState<CmsSeason | null>(null);
  const [loading, setLoading] = useState(true);

  // Format season slug (e.g. "winter-2026" -> "Winter 2026")
  const formatSeasonName = (slug: string) => {
    if (!slug) return '';
    return slug
      .split('-')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  };

  const displayName = currentSeason?.name || formatSeasonName(seasonSlug || '');

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAllAnimes(), getCmsSeasons()])
      .then(([allAnimes, allSeasons]) => {
        if (isMounted) {
          const matchSeason = (allSeasons || []).find(
            (s) =>
              (s.slug && s.slug === seasonSlug) ||
              (s.name && (s.name || '').toLowerCase() === (seasonSlug || '').toLowerCase())
          );
          setCurrentSeason(matchSeason || null);
          setSeasons(allSeasons || []);

          const filtered = (allAnimes || []).filter((a) => {
            if (!a.season) return false;
            const sVal = String(a.season);
            const sLower = sVal.toLowerCase().replace(/\s+/g, '-');
            const targetLower = (seasonSlug || '').toLowerCase().replace(/\s+/g, '-');
            return sLower === targetLower || sVal.toLowerCase() === (displayName || '').toLowerCase();
          });
          setAnimes(filtered);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load season anime:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [seasonSlug, displayName]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#0F1626] via-[#142340] to-[#0A1222] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seasonal Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {displayName} <span className="text-blue-400">Lineup</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            {currentSeason?.description || `Explore top rated and popular anime broadcasts premiered during ${displayName}.`}
          </p>
        </div>
      </div>

      {/* Season Switcher */}
      {seasons.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#0B1322] border border-white/5 p-3 rounded-2xl">
          <span className="text-xs font-bold text-[#94A3B8] px-2 shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Other Seasons:
          </span>
          {seasons.map((s) => {
            const isCurrent = s.slug === seasonSlug;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/season/${s.slug}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.name}
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
          <Calendar className="w-8 h-8 text-blue-400 mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No anime found for {displayName}</h3>
          <p className="text-xs max-w-sm mx-auto">
            Titles assigned to this season in the Admin Panel will appear here.
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
