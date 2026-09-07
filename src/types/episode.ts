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
  provider?: string; // e.g. "External Host / Abyss", "Server 2", "StreamTape", "DoodStream"
  sourceName?: string; // Display name e.g. "Abyss HD 1080p", "Backup Server"
  type?: 'abyss' | 'embed' | 'iframe' | 'direct' | 'hls' | 'mp4' | string;
  sourceType?: 'embed' | 'iframe' | 'direct' | 'hls' | string;
  quality?: string; // e.g. "1080p", "720p", "480p", "Auto"
  language?: EpisodeLanguage;
  embedUrl?: string; // Standard embed link
  frameCode?: string; // Raw iframe or HTML player tag code
  priority?: number; // Priority order e.g. 1, 2, 3
  active?: boolean;
}

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
  releaseDate?: string;
  releaseTime?: string;
  introStart?: number; // seconds (e.g. 0)
  introEnd?: number; // seconds (e.g. 90)
  outroStart?: number; // seconds (e.g. 1320)
  outroEnd?: number; // seconds (e.g. 1410)
  viewsCount?: number;
  videoUrl?: string;
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
