import React from 'react';
import type { Anime } from '../types/anime';
import { Star, ChevronRight, MessageSquare } from 'lucide-react';
import { RightSidebarTopAnimeSkeleton } from './SkeletonLoader';

interface RightSidebarProps {
  topAnimes?: Anime[];
  loading?: boolean;
  navigate: (path: string) => void;
  discordUrl?: string;
}

const FALLBACK_TOP_ANIMES = [
  {
    rank: '01',
    title: 'Fullmetal Alchemist: Brotherhood',
    slug: 'fullmetal-alchemist-brotherhood',
    year: 2009,
    episodesCount: 64,
    rating: 9.3,
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
  },
  {
    rank: '02',
    title: 'Steins;Gate',
    slug: 'steins-gate',
    year: 2011,
    episodesCount: 24,
    rating: 9.2,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80',
  },
  {
    rank: '03',
    title: 'Hunter x Hunter (2011)',
    slug: 'hunter-x-hunter-2011',
    year: 2011,
    episodesCount: 148,
    rating: 9.0,
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80',
  },
  {
    rank: '04',
    title: 'Code Geass: Lelouch of the Rebellion',
    slug: 'code-geass',
    year: 2006,
    episodesCount: 50,
    rating: 8.9,
    poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
  },
  {
    rank: '05',
    title: 'Naruto: Shippuden',
    slug: 'naruto-shippuden',
    year: 2007,
    episodesCount: 500,
    rating: 8.8,
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
  },
];

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Supernatural',
  'Thriller',
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  topAnimes = [],
  loading = false,
  navigate,
  discordUrl = 'https://discord.gg/zynox',
}) => {
  // Use passed topAnimes if available, else use fallback ranked list
  const rankedItems = topAnimes.length >= 5
    ? topAnimes.slice(0, 5).map((anime, index) => ({
        rank: String(index + 1).padStart(2, '0'),
        title: anime.title,
        slug: anime.slug,
        year: anime.year || 2024,
        episodesCount: anime.totalEpisodes || 12,
        rating: anime.rating || 9.0,
        poster: anime.poster,
      }))
    : FALLBACK_TOP_ANIMES;

  return (
    <aside className="hidden xl:flex flex-col w-[265px] 2xl:w-[285px] shrink-0 space-y-6 select-none">
      {/* 1. TOP ANIME RANKING */}
      <div className="bg-[#081426]/60 border border-white/5 rounded-2xl p-4 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-[#1683FF] rounded-full" />
            <h3 className="text-sm font-bold text-white tracking-wide">Top Anime</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/browse?sort=rating')}
            className="text-[11px] font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <RightSidebarTopAnimeSkeleton />
        ) : (
          <div className="space-y-2.5">
            {rankedItems.map((item) => (
              <div
                key={item.rank}
                onClick={() => navigate(`/anime/${item.slug}`)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#0B1B32] cursor-pointer group transition-all duration-200"
              >
                {/* Rank Number */}
                <span className="w-5 text-center font-black text-xs text-[#1683FF] group-hover:text-[#00CFFF] shrink-0">
                  {item.rank}
                </span>

                {/* Poster Thumbnail */}
                <div className="w-9 h-12 rounded-lg bg-[#050A14] overflow-hidden shrink-0 border border-white/10 group-hover:border-[#1683FF]/40 transition-colors">
                  <img
                    src={item.poster}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#F8FAFC] truncate group-hover:text-[#00CFFF] transition-colors">
                    {item.title}
                  </h4>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">
                    {item.year} • {item.episodesCount} EP
                  </div>
                </div>

                {/* Star Rating */}
                <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-400 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{item.rating}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GENRES GRID */}
      <div className="bg-[#081426]/60 border border-white/5 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 bg-[#1683FF] rounded-full" />
            <h3 className="text-sm font-bold text-white tracking-wide">Genres</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="text-[11px] font-semibold text-[#1683FF] hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => navigate(`/browse?genre=${encodeURIComponent(genre)}`)}
              className="px-2.5 py-1.5 bg-[#07111F] hover:bg-[#1683FF]/15 hover:text-[#00CFFF] hover:border-[#1683FF]/30 border border-white/5 text-[11px] font-medium text-[#CBD5E1] rounded-lg text-center transition-all duration-200 truncate"
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* 3. JOIN OUR COMMUNITY CARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#081426] to-[#0B1B32] border border-[#1683FF]/20 rounded-2xl p-4 text-center space-y-2.5 shadow-lg">
        <div className="w-9 h-9 mx-auto rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shadow-inner">
          <MessageSquare className="w-4 h-4 fill-current" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">Join Our Community</h4>
          <p className="text-[10px] text-[#94A3B8] leading-relaxed mt-1">
            Discuss, share and connect with anime fans around the world.
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
