export type AnimeStatus = 'ongoing' | 'completed' | 'upcoming' | 'hiatus' | 'cancelled' | string;
export type AnimeType = 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special' | string;

export interface VoiceActor {
  name: string;
  character: string;
  avatar: string;
  role: string;
}

export interface DownloadLink {
  quality: string;
  size: string;
  url: string;
  host: string;
}

export interface ZipDownloadPackage {
  id: string;
  title: string; // e.g. "Zip 1 (Batch 01 - 12)", "Zip 2 (Batch 13 - 24)", "Full Season Zip"
  seasonNumber?: number; // default 1
  url: string;
  size?: string; // e.g. "2.4 GB"
  quality?: string; // e.g. "1080p Ultra HD", "720p HD", "Dual Audio"
  host?: string; // e.g. "MegaCloud", "Google Drive", "Direct Server", "Telegram"
  episodesRange?: string; // e.g. "Episodes 1 - 12", "All Episodes"
  language?: string; // e.g. "Hindi Dub", "Japanese Sub", "Multi"
  notes?: string;
}

export interface AnimeSeasonEntry {
  id: string; // unique ID
  seasonNumber: number; // e.g. 1, 2, 3...
  title: string; // e.g. "Season 1", "Season 2: Shippuden", "Season 2: Entertainment District Arc"
  animeId?: string; // Optional: linked anime document ID if it's a separate series entry
  slug?: string; // Optional: linked anime slug
  poster?: string;
  banner?: string;
  totalEpisodes?: number;
  year?: number;
  status?: 'ongoing' | 'completed' | 'upcoming' | string;
  description?: string;
}

export interface Anime {
  id?: string;
  activeSeasonNumber?: number; // Optional marker when representing a specific season in search results
  seasonTitle?: string;
  // Basic Information
  title: string;
  altTitles?: string[];
  alternateTitles?: string[];
  japaneseTitle?: string;
  slug: string;
  description: string;
  poster: string;
  posterUrl?: string;
  banner?: string;
  bannerUrl?: string;
  background?: string;
  trailerUrl?: string;
  websiteUrl?: string;

  // Classification
  type?: AnimeType;
  status?: AnimeStatus;
  genres?: string[];
  tags?: string[];
  studio?: string;
  producer?: string;
  country?: string;
  source?: string; // Manga, Light Novel, Original, Web Manga, Visual Novel

  // Release Information
  year?: number;
  startDate?: string;
  endDate?: string;
  season?: string; // e.g. "Winter 2026", "Fall 2024"
  releaseDay?: string; // e.g. "Monday", "Saturday"
  releaseTime?: string; // e.g. "20:30"
  timezone?: string; // e.g. "Asia/Tokyo", "Asia/Kolkata", "UTC"
  totalEpisodes?: number;
  duration?: string;

  // Rating & Metrics
  rating?: number;
  ageRating?: string; // PG-13, R-17+, TV-14, etc.
  popularityScore?: number;
  viewsCount?: number;

  // Audio Languages & Badges
  audioLanguage?: string; // "Hindi", "Japanese", "English", "Multi"
  audioTags?: string[]; // ["Hindi Dub", "Japanese Sub", "English Dub"]
  languages?: string[]; // Available languages: ["Hindi", "English", "Japanese"]
  badge?: string;
  quality?: string; // "1080p", "4K", "720p"

  // Admin Flags
  featured?: boolean;
  isFeatured?: boolean;
  trending?: boolean;
  isTrending?: boolean;
  popular?: boolean;
  isPopular?: boolean;
  recommended?: boolean;
  isNew?: boolean;
  isUpcoming?: boolean;
  upcomingEpisodeNumber?: number;
  upcomingAirDate?: string;
  upcomingReleaseTime?: string;
  hidden?: boolean;
  published: boolean;
  displayOrder?: number;

  // SEO Fields
  seoTitle?: string;
  metaTitle?: string;
  seoDescription?: string;
  metaDescription?: string;
  seoKeywords?: string;
  keywords?: string[];
  ogImage?: string;

  // Media & Downloads
  voiceActors?: VoiceActor[];
  seasonsList?: AnimeSeasonEntry[]; // Multi-season management (Season 1, Season 2...)
  downloadUrl?: string; // Direct / Batch download link (Mega, GDrive, Telegram, etc.)
  downloadBatchUrl?: string; // All episodes batch ZIP / Folder
  downloadLinks?: DownloadLink[];
  zipDownloads?: ZipDownloadPackage[]; // Explicit Zip 1, Zip 2... packages
  createdAt?: any;
  updatedAt?: any;
}
