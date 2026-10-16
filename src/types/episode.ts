export type EpisodeLanguage = 'SUB' | 'DUB' | 'RAW' | 'MULTI' | string;

export interface SubtitleTrack {
  id?: string;
  language: string;
  label: string;
  url: string;
  isDefault?: boolean;
}

export interface VideoSource {
  id?: string;
  name?: string;
  provider?: string; // e.g. "server 1", "server 2", "External Host", "StreamTape"
  sourceName?: string; // Display name e.g. "server 1", "server 2"
  category?: 'sub' | 'dub' | string; // 'sub' or 'dub'
  type?: 'abyss' | 'embed' | 'iframe' | 'direct' | 'hls' | 'mp4' | string;
  sourceType?: 'embed' | 'iframe' | 'direct' | 'hls' | string;
  quality?: string; // e.g. "1080p", "720p", "480p", "Auto"
  language?: EpisodeLanguage;
  embedUrl?: string; // Standard embed link
  frameCode?: string; // Raw iframe or HTML player tag code
  priority?: number; // Priority order e.g. 1, 2, 3
  active?: boolean;
  isDefault?: boolean;
}

export type EpisodeStatus = 'released' | 'upcoming' | 'delayed' | string;

export interface Episode {
  id?: string;
  animeId: string;
  season?: number;
  seasonNumber?: number;
  episodeNumber: number;
  title: string;
  description?: string;
  thumbnail?: string;
  language?: EpisodeLanguage;
  quality?: string;
  duration?: number | string; // In seconds or formatted string
  status?: EpisodeStatus;
  isUpcoming?: boolean;
  airDate?: string; // e.g. "2026-10-15" or "Monday at 20:00"
  releaseDate?: string;
  releaseTime?: string;
  dayOfWeek?: string;
  timezone?: string;
  introStart?: number; // seconds (e.g. 0)
  introEnd?: number; // seconds (e.g. 90)
  outroStart?: number; // seconds (e.g. 1320)
  outroEnd?: number; // seconds (e.g. 1410)
  viewsCount?: number;
  videoUrl?: string;
  defaultSourceId?: string;
  defaultCategory?: 'sub' | 'dub';
  downloadUrl?: string;
  downloadQuality?: string;
  downloadSize?: string;
  downloadLinks?: {
    quality: string;
    size?: string;
    url: string;
    host?: string;
  }[];
  sources?: VideoSource[];
  videoSources?: VideoSource[];
  subtitles?: SubtitleTrack[];
  published: boolean;
  animeTitle?: string;
  animeSlug?: string;
  createdAt?: any;
  updatedAt?: any;
}
