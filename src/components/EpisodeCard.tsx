import React from 'react';
import { Play } from 'lucide-react';
import type { LatestEpisodeItem } from '../lib/firestore/episodes';
import { getOptimizedImageUrl, FALLBACK_ANIME_BANNER } from '../lib/image-optimizer';
import { cleanAnimeTitle } from '../lib/firestore/anime';

interface EpisodeCardProps {
  item: LatestEpisodeItem;
  navigate: (path: string) => void;
  variant?: 'landscape-card' | 'mobile-row';
  priority?: boolean;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  item,
  navigate,
  priority = false,
}) => {
  const { episode, animeTitle, animeSlug, animePoster, animeBanner } = item;
  const sNum = episode.seasonNumber || episode.season || 1;
  const cleanSlug = animeSlug || episode.animeId || '';
  const targetUrl = `/anime/${cleanSlug}/episode/${episode.episodeNumber}${sNum > 1 ? `?season=${sNum}` : ''}`;

  // Time ago
  const getTimeAgo = (): string => {
    const rawDate =
      episode.createdAt ||
      (episode as any).updatedAt ||
      (episode as any).releasedAt ||
      (item as any).createdAt;

    if (!rawDate) return '';
    try {
      let millis: number | null = null;
      if (typeof rawDate?.toMillis === 'function') {
        millis = rawDate.toMillis();
      } else if (typeof rawDate?.seconds === 'number') {
        millis = rawDate.seconds * 1000;
      } else if (typeof rawDate === 'number') {
        millis = rawDate < 1e11 ? rawDate * 1000 : rawDate;
      } else if (rawDate instanceof Date) {
        millis = rawDate.getTime();
      } else if (typeof rawDate === 'string') {
        const parsed = Date.parse(rawDate);
        if (!isNaN(parsed)) millis = parsed;
      }

      if (!millis) return '';
      const diffSecs = Math.max(0, Math.floor((Date.now() - millis) / 1000));
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks < 5) return `${diffWeeks}w ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths}mo ago`;
    } catch {
      return '';
    }
  };

  const timeAgoStr = getTimeAgo() || 'Recently';

  const rawThumbnail =
    animeBanner ||
    (item as any).animeBanner ||
    (episode as any).animeBanner ||
    (episode as any).banner ||
    episode.thumbnail ||
    animePoster ||
    FALLBACK_ANIME_BANNER;

  const thumbnail = getOptimizedImageUrl(rawThumbnail, { width: 200, fallbackType: 'banner' });
  const displayTitle = cleanAnimeTitle(animeTitle);

  return (
    <div
      onClick={() => navigate(targetUrl)}
      className="h-[64px] flex items-center gap-2.5 px-2 rounded-[10px] bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 active:scale-[0.99] cursor-pointer group transition-colors duration-150 min-w-0"
    >
      {/* 88x50 Thumbnail */}
      <div className="relative w-[88px] h-[50px] bg-[#050A14] rounded-[6px] overflow-hidden shrink-0 border border-white/10">
        <img
          src={thumbnail}
          alt=""
          width={88}
          height={50}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (animePoster && target.src !== animePoster) {
              target.src = animePoster;
            }
          }}
        />
        {/* Play icon on desktop hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="w-6 h-6 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-md">
            <Play className="w-3 h-3 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info: Title (1 line 13px/600) + meta (11px muted "Ep 12 · 2h ago") */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <h4
          title={displayTitle}
          className="text-[13px] font-semibold leading-[18px] text-white truncate group-hover:text-[#1E88FF] transition-colors duration-150"
        >
          {displayTitle}
        </h4>
        <p className="text-[11px] leading-[15px] text-[#94A3B8] truncate">
          Ep {episode.episodeNumber} · {timeAgoStr}
        </p>
      </div>
    </div>
  );
};
