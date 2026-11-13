import React from 'react';
import type { Anime } from '../types/anime';
import { Star, ChevronRight, MessageSquare, Compass, Sparkles } from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/image-optimizer';
import { cleanAnimeTitle } from '../lib/firestore/anime';

interface RightSidebarProps {
  topAnimes?: Anime[];
  loading?: boolean;
  navigate: (path: string) => void;
  discordUrl?: string;
}

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Hentai',
  'Sports',
  'Thriller',
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  topAnimes = [],
  loading = false,
  navigate,
  discordUrl = 'https://discord.gg/zynox',
}) => {
  const topList = topAnimes.slice(0, 5);

  return (
    <aside className="hidden xl:flex flex-col w-[280px] 2xl:w-[300px] shrink-0 space-y-6 select-none">
      {/* 1. TOP RATED PICKS */}
      {topList.length > 0 && (
        <div className="bg-[#0B1324]/80 border border-white/5 rounded-2xl p-4 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-3.5 bg-[#1E88FF] rounded-full" />
              <h3 className="text-sm font-bold text-white tracking-wide">Top Rated</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/browse?sort=rating')}
              className="text-[11px] font-semibold text-[#1E88FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topList.map((anime, idx) => {
              const rank = idx + 1;
              const ratingVal = anime.rating ? Number(anime.rating).toFixed(1) : '8.5';
              return (
                <div
                  key={`sb-top-${anime.id || anime.slug}-${idx}`}
                  onClick={() => navigate(`/anime/${anime.slug || anime.id}`)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#101A30] cursor-pointer group transition-all duration-200"
                >
                  <span className="w-5 text-center font-black text-xs text-[#1E88FF] group-hover:text-[#00CFFF] shrink-0">
                    0{rank}
                  </span>
                  <div className="w-9 h-12 rounded-lg bg-[#050A14] overflow-hidden shrink-0 border border-white/10 group-hover:border-[#1E88FF]/40 transition-colors">
                    <img
                      src={getOptimizedImageUrl(anime.poster, { width: 100, fallbackType: 'poster' })}
                      alt={anime.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-[#F8FAFC] truncate group-hover:text-[#00CFFF] transition-colors leading-snug">
                      {cleanAnimeTitle(anime.title)}
                    </h4>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate">
                      <span className="text-[#00CFFF] font-medium">{anime.audioLanguage || (anime as any).language || 'Hindi Dub'}</span> · {anime.year || 2026}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-400 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{ratingVal}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. GENRES GRID */}
      <div className="bg-[#0B1324]/80 border border-white/5 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-[#1E88FF] rounded-full" />
            <h3 className="text-sm font-bold text-white tracking-wide">Popular Genres</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="text-[11px] font-semibold text-[#1E88FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => navigate(`/browse?genre=${encodeURIComponent(genre)}`)}
              className="px-2.5 py-1.5 bg-[#050A14] hover:bg-[#1E88FF]/15 hover:text-[#00CFFF] hover:border-[#1E88FF]/30 border border-white/5 text-[11px] font-medium text-[#CBD5E1] rounded-lg text-center transition-all duration-200 truncate cursor-pointer"
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* 3. JOIN OUR COMMUNITY CARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1324] to-[#101A30] border border-[#1E88FF]/20 rounded-2xl p-4 text-center space-y-2.5 shadow-lg">
        <div className="w-9 h-9 mx-auto rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shadow-inner">
          <MessageSquare className="w-4 h-4 fill-current" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">Join Our Community</h4>
          <p className="text-[10px] text-[#94A3B8] leading-relaxed mt-1">
            Discuss episodes, request anime, and chat with thousands of anime fans.
          </p>
        </div>
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg shadow-md shadow-[#5865F2]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <MessageSquare className="w-3.5 h-3.5 fill-white" />
          <span>Join Discord</span>
        </a>
      </div>
    </aside>
  );
};
