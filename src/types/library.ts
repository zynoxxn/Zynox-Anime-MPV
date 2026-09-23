export type WatchlistStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export interface WatchProgress {
  id?: string;
  userId?: string;
  animeId: string;
  animeSlug: string;
  animeTitle: string;
  animePoster?: string;
  episodeId?: string;
  episodeNumber: number;
  episodeTitle?: string;
  progress: number; // in seconds
  duration: number; // in seconds
  percentage?: number; // 0 - 100
  completed?: boolean;
  updatedAt: any;
}

export interface WatchHistoryItem {
  id?: string;
  userId?: string;
  animeId: string;
  animeSlug: string;
  animeTitle: string;
  animePoster?: string;
  episodeId?: string;
  episodeNumber: number;
  episodeTitle?: string;
  progress?: number;
  duration?: number;
  watchedAt: any;
}

export interface WatchlistItem {
  id?: string;
  userId?: string;
  animeId: string;
  animeSlug: string;
  animeTitle: string;
  animePoster?: string;
  status: WatchlistStatus;
  genres?: string[];
  rating?: number;
  completedEpisodes?: number;
  totalEpisodes?: number;
  lastWatchedEpisode?: number;
  updatedAt: any;
}

export interface FavoriteItem {
  id?: string;
  userId?: string;
  animeId: string;
  animeSlug: string;
  animeTitle: string;
  animePoster?: string;
  genres?: string[];
  addedAt: any;
}

export type NotificationType =
  | 'new_episode'
  | 'episode_release'
  | 'comment_reply'
  | 'comment_like'
  | 'request_update'
  | 'request_status'
  | 'system'
  | 'announcement'
  | 'system_announcement';

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  type: NotificationType;
  read: boolean;
  createdAt: any;
}

export type CommentTargetType = 'anime' | 'episode';

export interface CommentItem {
  id?: string;
  targetType: CommentTargetType;
  animeId: string;
  animeSlug?: string;
  animeTitle?: string;
  episodeId?: string;
  episodeNumber?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: 'user' | 'moderator' | 'admin';
  content: string;
  isSpoiler: boolean;
  likesCount: number;
  repliesCount: number;
  parentId?: string | null;
  replyToUser?: string;
  isEdited?: boolean;
  isHidden?: boolean;
  reportsCount?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface CommentLikeItem {
  id?: string;
  commentId: string;
  userId: string;
  createdAt: any;
}

export type CommentReportReason = 'spam' | 'harassment' | 'spoiler' | 'inappropriate' | 'other';
export type CommentReportStatus = 'pending' | 'open' | 'reviewed' | 'resolved' | 'dismissed' | 'ignored';

export interface CommentReportItem {
  id?: string;
  commentId: string;
  commentContent: string;
  commentAuthorId: string;
  commentAuthorName: string;
  targetType: CommentTargetType;
  animeId: string;
  animeTitle?: string;
  episodeNumber?: number;
  reporterUserId: string;
  reporterName?: string;
  reason: CommentReportReason;
  details?: string;
  status: CommentReportStatus;
  createdAt: any;
  comment?: any;
}

export interface UserBlockItem {
  id?: string;
  userId: string;
  blockedUserId: string;
  blockedUserName?: string;
  createdAt: any;
}

export interface AnimeFollowItem {
  id?: string;
  userId: string;
  animeId: string;
  animeTitle: string;
  animeSlug: string;
  animePoster?: string;
  createdAt: any;
}

export type AnnouncementType = 'info' | 'update' | 'maintenance' | 'important';
export type AnnouncementAudience = 'all' | 'specific' | 'anime_followers';
export type AnnouncementStatus = 'draft' | 'published' | 'scheduled';

export interface SystemAnnouncement {
  id?: string;
  title: string;
  message: string;
  type: AnnouncementType;
  targetAudience: AnnouncementAudience;
  targetAnimeId?: string;
  link?: string;
  publishStatus: AnnouncementStatus;
  publishDate?: any;
  createdAt: any;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  condition: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'fulfilled' | 'in_progress';

export interface AnimeRequest {
  id?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  animeTitle: string;
  reason: string;
  message?: string;
  title?: string;
  notes?: string;
  year?: number | string;
  status: RequestStatus;
  createdAt: any;
}

export type ReportReason = 'video_not_loading' | 'wrong_episode' | 'wrong_language' | 'poor_quality' | 'other';
export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'ignored' | 'dismissed';

export interface EpisodeReport {
  id?: string;
  userId?: string;
  userEmail?: string;
  animeId: string;
  animeTitle: string;
  episodeId?: string;
  episodeNumber: number;
  reason: ReportReason;
  details?: string;
  issueType?: string;
  description?: string;
  serverName?: string;
  status: ReportStatus;
  createdAt: any;
}

export interface SiteConfig {
  siteName: string;
  logoText: string;
  tagline: string;
  contactEmail: string;
  telegramUrl: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  installUrl?: string;
  discordUrl: string;
  disclaimerText: string;
  enableRequests: boolean;
  heroAnimeSlug?: string;
}
