import React from 'react';
import { Play, Clock } from 'lucide-react';
import type { CmsScheduleItem } from '../types/cms';

interface ScheduledCardProps {
  item: CmsScheduleItem;
  navigate: (path: string) => void;
  variant?: 'landscape-card' | 'mobile-row';
}

export const ScheduledCard: React.FC<ScheduledCardProps> = ({
  item,
  navigate,
  variant = 'landscape-card',
}) => {
  const targetUrl = `/anime/${item.animeSlug}`;
  const epLabel = item.seasonNumber && item.seasonNumber > 1
    ? `S${item.seasonNumber} · EP ${item.episodeNumber}`
    : `EP ${item.episodeNumber}`;

  const posterImage = item.animePoster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';

  if (variant === 'mobile-row') {
    return (
      <div
        onClick={() => navigate(targetUrl)}
        className="flex items-center gap-3 p-2 rounded-xl bg-[#081426]/70 border border-white/5 hover:border-[#1683FF]/30 active:scale-[0.99] cursor-pointer group transition-all"
      >
        {/* Landscape Thumbnail with Center Play Button */}
        <div className="relative w-28 sm:w-32 aspect-video bg-[#050A14] rounded-lg overflow-hidden shrink-0 border border-white/10">
          <img
            src={posterImage}
            alt={item.animeTitle}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Centered Play Button Circle */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="w-7 h-7 rounded-full bg-[#1683FF] text-white flex items-center justify-center shadow-md">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
          </div>
          {/* Day tag on mobile thumb */}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-bold text-[#00CFFF]">
            {item.dayOfWeek.slice(0, 3)}
          </div>
        </div>

        {/* Middle Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#00CFFF] transition-colors">
            {item.animeTitle}
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] mt-1">
            <Clock className="w-3 h-3 text-[#1683FF]" />
            <span>{item.dayOfWeek} {item.releaseTime ? `• ${item.releaseTime}` : ''}</span>
          </div>
        </div>

        {/* Right EP Badge */}
        <div className="px-2 py-1 rounded-md bg-[#07111F] border border-white/10 text-[11px] font-bold text-[#CBD5E1] shrink-0">
          {epLabel}
        </div>
      </div>
    );
  }

  // Desktop Landscape Card (Identical to Latest Episode desktop card)
  return (
    <div
      onClick={() => navigate(targetUrl)}
      className="flex flex-col cursor-pointer group transition-transform duration-200 hover:-translate-y-1 select-none"
    >
      {/* 16:9 Thumbnail with badges & play overlay */}
      <div className="relative aspect-video bg-[#081426] rounded-xl overflow-hidden border border-white/5 group-hover:border-[#1683FF]/40 transition-colors shadow-md">
        <img
          src={posterImage}
          alt={item.animeTitle}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Top-Left Day & Time Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#1683FF]/90 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
          <Clock className="w-3 h-3 text-white" />
          <span>{item.dayOfWeek} {item.releaseTime ? `• ${item.releaseTime}` : ''}</span>
        </div>

        {/* Top-Right EP Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold text-white border border-white/10">
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
        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00CFFF] transition-colors leading-tight">
          {item.animeTitle}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
          <span>{item.dayOfWeek} at {item.releaseTime || 'TBA'}</span>
          {item.language && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#CBD5E1] border border-white/5 truncate max-w-[100px]">
              {item.language}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
