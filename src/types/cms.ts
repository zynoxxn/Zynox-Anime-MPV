export interface CmsGenre {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  banner?: string;
  displayOrder: number;
  enabled: boolean;
}

export interface CmsStatus {
  id: string;
  name: string;
  slug: string;
  description?: string;
  badgeColor?: string;
  displayOrder: number;
  enabled: boolean;
}

export interface CmsYear {
  id: string;
  year: number;
  enabled: boolean;
  displayOrder: number;
}

export interface CmsRatingRange {
  id: string;
  label: string; // e.g. "9.0+ Masterpiece"
  minRating: number; // e.g. 9.0
  displayOrder: number;
  enabled: boolean;
}

export interface CmsType {
  id: string;
  name: string; // TV, Movie, OVA, ONA, Special
  slug: string;
  description?: string;
  displayOrder: number;
  enabled: boolean;
}

export interface CmsLanguage {
  id: string;
  name: string; // Hindi, English, Japanese, Tamil, Telugu, Bengali, etc.
  shortCode: string; // hi, en, ja, ta, te, bn
  badgeName: string; // HINDI DUB, ENG SUB, etc.
  enabled: boolean;
  displayOrder: number;
}

export interface CmsStudio {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  animeCount?: number;
  enabled: boolean;
}

export interface CmsSeason {
  id: string;
  name: string; // e.g. "Winter 2026"
  slug: string; // e.g. "winter-2026"
  year: number; // e.g. 2026
  startDate?: string;
  endDate?: string;
  banner?: string;
  description?: string;
  status?: 'upcoming' | 'current' | 'completed';
  enabled: boolean;
}

export type ScheduleStatus = 'upcoming' | 'released' | 'delayed' | 'cancelled';

export interface CmsScheduleItem {
  id: string;
  animeId: string;
  animeTitle: string;
  animeSlug: string;
  animePoster?: string;
  episodeNumber: number;
  seasonNumber?: number;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  releaseDate?: string;
  releaseTime: string; // e.g. "20:30" or "8:30 PM"
  timezone?: string; // e.g. "Asia/Kolkata", "Asia/Tokyo", "UTC"
  language?: string; // Hindi, Japanese, English
  status: ScheduleStatus;
  notes?: string;
  manualOverride?: boolean;
}

export interface CmsHeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  animeId?: string;
  animeSlug?: string;
  backgroundImage: string;
  posterImage?: string;
  buttonText: string;
  buttonUrl: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  displayOrder: number;
}

export type HomepageLayout = 'grid' | 'carousel' | 'slider' | 'ranked';
export type HomepageContentSource =
  | 'featured'
  | 'trending'
  | 'popular'
  | 'latest_episodes'
  | 'recently_added'
  | 'ongoing'
  | 'upcoming'
  | 'completed'
  | 'top_rated'
  | 'seasonal'
  | 'recommended'
  | 'genres'
  | 'manual';

export interface CmsHomepageSection {
  id: string;
  key: string;
  title: string;
  subtitle?: string;
  enabled: boolean;
  displayOrder: number;
  layout: HomepageLayout;
  contentSource: HomepageContentSource;
  manualAnimeIds?: string[];
  maxItems: number;
  audioLanguageFilter?: string; // e.g. 'all', 'hindi', 'sub'
}

export type NavigationTarget = 'header' | 'desktop_menu' | 'mobile_menu' | 'bottom_nav';

export interface CmsNavigationItem {
  id: string;
  title: string;
  url: string;
  iconName?: string;
  targetLocation: NavigationTarget;
  enabled: boolean;
  displayOrder: number;
  isExternal?: boolean;
  badge?: string;
  requiresAuth?: boolean;
}

export interface FooterLink {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  platform: string; // telegram, discord, twitter, youtube, instagram, reddit, github
  url: string;
  icon?: string;
}

export interface CmsFooterConfig {
  aboutText: string;
  copyrightText: string;
  contactEmail: string;
  telegramUrl: string;
  discordUrl: string;
  disclaimerText: string;
  socialLinks: SocialLink[];
  columns: FooterColumn[];
}

export type AnnouncementType = 'info' | 'success' | 'warning' | 'important';
export type AnnouncementDisplay = 'top_banner' | 'popup' | 'notification';

export interface CmsAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  displayLocation: AnnouncementDisplay;
  link?: string;
  buttonText?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  dismissible?: boolean;
}

export type PopupNoticeTheme = 'blue' | 'purple' | 'amber' | 'emerald' | 'rose' | 'red';
export type PopupNoticeIcon = 'megaphone' | 'bell' | 'sparkles' | 'alert' | 'info' | 'shield' | 'flame';

export interface SitePopupNotice {
  id?: string;
  enabled: boolean;
  version: string;
  displayDelaySeconds?: number; // Delay in seconds before popup appears on website entrance (default: 6, i.e. 5-7s)
  header: {
    title: string;
    titleColor?: string; // Custom hex color for notice heading
    badgeText?: string;
    icon: PopupNoticeIcon;
    themeColor: PopupNoticeTheme;
  };
  notice: {
    text: string;
    highlightText?: string;
    imageUrl?: string;
  };
  footer: {
    noteText?: string;
    primaryButtonText: string;
    primaryButtonUrl: string;
    secondaryButtonText: string;
    showDontShowAgain: boolean;
  };
  updatedAt?: any;
}

export interface CmsSeoSettings {
  homepageTitle: string;
  homepageDescription: string;
  homepageKeywords: string;
  defaultOgImage: string;
  defaultSocialImage?: string;
  siteDescription: string;
  robotsTxt?: string;
  canonicalUrl?: string;

  // Dynamic SEO Templates
  animeTitleTemplate?: string; // e.g. "Watch {title} in Hindi Dub & English Sub HD — {siteName}"
  downloadTitleTemplate?: string; // e.g. "Download {title} [Hindi Dub] All Episodes 720p 1080p HD Zip — {siteName}"
  episodeTitleTemplate?: string; // e.g. "Watch {title} Episode {epNumber} [Hindi Dub] 1080p — {siteName}"
  defaultKeywordsTemplate?: string;

  // Search Engine & Webmaster Verification
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  twitterHandle?: string;

  // Field aliases for backward compatibility
  defaultTitle?: string;
  titleSuffix?: string;
  defaultDescription?: string;
  keywords?: string[];
  ogImage?: string;
}

export type CmsSeoConfig = CmsSeoSettings;

export interface CmsLegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  lastUpdated?: string;
  published: boolean;
}

export interface CmsSiteSettings {
  siteName: string;
  logoText: string;
  logoUrl?: string;
  faviconUrl?: string;
  tagline: string;
  themeAccent: string; // e.g. '#1683FF' or '#8B5CF6'
  contactEmail: string;
  telegramUrl?: string;
  discordUrl?: string;
  disclaimerText: string;
  enableRequests: boolean;
  enableCommunityComments: boolean;
  enableComments?: boolean;
  defaultLanguage: string;
  defaultQuality: string;
  timezone: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  trendingMode: 'auto' | 'manual';
  popularMode: 'auto' | 'manual';
}

export interface CmsLegalPages {
  about: string;
  contact: string;
  privacy: string;
  terms: string;
  disclaimer: string;
  dmca: string;
  communityGuidelines: string;
}

export interface CmsAdminLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string; // e.g. "Created Anime", "Updated Episode", "Changed Schedule"
  targetType: string; // "Anime", "Episode", "Schedule", "User", "Settings", etc.
  targetId?: string;
  details?: string;
  timestamp: any;
}
