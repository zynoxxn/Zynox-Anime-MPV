import React from 'react';
import { Play } from 'lucide-react';
import type { LatestEpisodeItem } from '../lib/firestore/episodes';
import { getOptimizedImageUrl, FALLBACK_ANIME_BANNER } from '../lib/image-optimizer';
import { cleanAnimeTitle } from '../lib/firestore/anime';

interface EpisodeCardProps {
  item: LatestEpisodeItem;
  navigate: (path: string) => void;
  variant?: 'landscape-card' | 'mobile-row';
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  item,
  navigate,
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

  const thumbnail = getOptimizedImageUrl(rawThumbnail, { width: 320, fallbackType: 'banner' });
  const displayTitle = cleanAnimeTitle(animeTitle);

  return (
    <div
      onClick={() => navigate(targetUrl)}
      className="h-[68px] sm:h-[72px] flex items-center gap-3 p-1.5 sm:p-2 rounded-lg bg-[#0B1324] border border-white/5 hover:border-[#1E88FF]/30 active:scale-[0.99] cursor-pointer group transition-all min-w-0"
    >
      {/* 16:9 Thumbnail (96px wide) */}
      <div className="relative w-[96px] h-full aspect-video bg-[#050A14] rounded-md overflow-hidden shrink-0 border border-white/10">
        <img
          src={thumbnail}
          alt=""
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
        {/* Play icon in center */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-md">
            <Play className="w-3 h-3 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info: Title (1 line) + one muted line "Ep 12 · 2h ago" (No extra chips) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h4
          title={displayTitle}
          className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00CFFF] transition-colors leading-tight"
        >
          {displayTitle}
        </h4>
        <p className="text-[11px] sm:text-xs text-[#94A3B8] truncate leading-none">
          Ep {episode.episodeNumber} · {timeAgoStr}
        </p>
      </div>
    </div>
  );
};
