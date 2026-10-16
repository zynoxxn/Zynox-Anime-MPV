import React from 'react';
import { Play, Clock } from 'lucide-react';
import type { LatestEpisodeItem } from '../lib/firestore/episodes';

interface EpisodeCardProps {
  item: LatestEpisodeItem;
  navigate: (path: string) => void;
  variant?: 'landscape-card' | 'mobile-row';
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  item,
  navigate,
  variant = 'landscape-card',
}) => {
  const { episode, animeTitle, animeSlug, animePoster, animeBanner } = item;
  const isEpUpcoming = episode.status === 'upcoming' || Boolean(episode.isUpcoming);
  const sNum = episode.seasonNumber || episode.season || 1;
  const targetUrl = `/anime/${animeSlug}/episode/${episode.episodeNumber}${sNum > 1 ? `?season=${sNum}` : ''}`;

  // Time ago calculation
  const getTimeAgo = () => {
    if (isEpUpcoming) {
      return episode.airDate ? `Air: ${episode.airDate}` : 'Upcoming premiere';
    }
    if (!episode.createdAt) return 'Recently';
    try {
      const millis = typeof episode.createdAt?.toMillis === 'function'
        ? episode.createdAt.toMillis()
        : new Date(episode.createdAt).getTime();
      const diffHrs = Math.max(0, Math.round((Date.now() - millis) / (1000 * 60 * 60)));
      if (diffHrs < 1) return 'Just now';
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.round(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const epLabel = sNum > 1 ? `S${sNum} · EP ${episode.episodeNumber}` : `EP ${episode.episodeNumber}`;
  // Prioritize anime banner for 16:9 episode thumbnail
  const thumbnail =
    animeBanner ||
    (item as any).animeBanner ||
    (episode as any).animeBanner ||
    (episode as any).banner ||
    episode.thumbnail ||
    animePoster ||
    '';

  if (variant === 'mobile-row') {
    return (
      <div
        onClick={() => navigate(targetUrl)}
        className="flex items-center gap-3 p-2 rounded-xl bg-[#081426]/70 border border-white/5 hover:border-[#1683FF]/30 active:scale-[0.99] cursor-pointer group transition-all"
      >
        {/* Landscape Thumbnail with Center Play Button */}
        <div className="relative w-28 sm:w-32 aspect-video bg-[#050A14] rounded-lg overflow-hidden shrink-0 border border-white/10">
          <img
            src={thumbnail}
            alt={episode.title || animeTitle}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (animePoster && target.src !== animePoster) {
                target.src = animePoster;
              }
            }}
          />
          {/* Centered Play Button Circle */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="w-7 h-7 rounded-full bg-[#1683FF] text-white flex items-center justify-center shadow-md">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Middle Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-xs font-bold text-white truncate group-hover:text-[#00CFFF] transition-colors flex-1">
              {animeTitle}
            </h4>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            {getTimeAgo()}
          </p>
        </div>

        {/* Right EP Badge */}
        <div className="px-2 py-1 rounded-md border border-white/10 bg-[#07111F] text-[11px] font-bold text-[#CBD5E1] shrink-0">
          {epLabel}
        </div>
      </div>
    );
  }

  // Desktop Landscape Card
  return (
    <div
      onClick={() => navigate(targetUrl)}
      className="flex flex-col cursor-pointer group transition-transform duration-200 hover:-translate-y-1 select-none"
    >
      {/* 16:9 Thumbnail with badges & play overlay */}
      <div className="relative aspect-video bg-[#081426] rounded-xl overflow-hidden border border-white/5 group-hover:border-[#1683FF]/40 transition-colors shadow-md">
        <img
          src={thumbnail}
          alt={episode.title || animeTitle}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (animePoster && target.src !== animePoster) {
              target.src = animePoster;
            }
          }}
        />

        {/* Top-Right EP Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded backdrop-blur-sm text-[10px] sm:text-[11px] font-bold border bg-black/75 text-white border-white/10">
          {epLabel}
        </div>

        {/* Center Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
          <div className="w-9 h-9 rounded-full bg-[#1683FF] text-white flex items-center justify-center shadow-lg shadow-[#1683FF]/30 transform scale-90 group-hover:scale-105 transition-transform duration-200">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Below Thumbnail */}
      <div className="pt-2 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00CFFF] transition-colors leading-tight flex-1">
            {animeTitle}
          </h4>
        </div>
        <span className="text-[11px] text-[#94A3B8]">
          {getTimeAgo()}
        </span>
      </div>
    </div>
  );
};
