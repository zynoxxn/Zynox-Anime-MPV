import type { UserBadge } from '../types/library';

export const ALL_BADGES: Record<string, UserBadge> = {
  early_user: {
    id: 'early_user',
    name: 'Early Pioneer',
    description: 'Joined Zynox during initial launch',
    iconName: 'Sparkles',
    color: 'from-amber-500 to-yellow-400 text-amber-300 border-amber-500/30 bg-amber-500/10',
    condition: 'Joined during launch phase',
  },
  active_member: {
    id: 'active_member',
    name: 'Active Streamer',
    description: 'Actively tracking and watching anime series',
    iconName: 'Flame',
    color: 'from-orange-500 to-red-500 text-orange-300 border-orange-500/30 bg-orange-500/10',
    condition: 'Active stream history',
  },
  anime_fan: {
    id: 'anime_fan',
    name: 'Anime Enthusiast',
    description: 'Curated a vibrant watchlist and favorites collection',
    iconName: 'Heart',
    color: 'from-pink-500 to-rose-500 text-pink-300 border-pink-500/30 bg-pink-500/10',
    condition: '5+ items in watchlist/favorites',
  },
  commenter: {
    id: 'commenter',
    name: 'Community Voice',
    description: 'Participating in episode and anime discussions',
    iconName: 'MessageSquare',
    color: 'from-purple-500 to-indigo-500 text-purple-300 border-purple-500/30 bg-purple-500/10',
    condition: 'Contributed comments',
  },
  top_contributor: {
    id: 'top_contributor',
    name: 'Top Contributor',
    description: 'Highly engaged community contributor',
    iconName: 'Award',
    color: 'from-emerald-500 to-teal-500 text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    condition: '5+ comments or top discussions',
  },
  otaku: {
    id: 'otaku',
    name: 'Master Otaku',
    description: 'Completed multiple series and mastered anime lore',
    iconName: 'Crown',
    color: 'from-violet-500 to-purple-600 text-violet-300 border-violet-500/30 bg-violet-500/10',
    condition: 'Completed 5+ anime series',
  },
};

export function calculateUserBadges(stats: {
  watchlistCount: number;
  completedCount: number;
  favoritesCount: number;
  historyCount: number;
  commentsCount?: number;
  role?: string;
  createdAt?: any;
}): UserBadge[] {
  const earned: UserBadge[] = [];

  // Early pioneer check (registered account)
  earned.push(ALL_BADGES.early_user);

  // Active member (has watched at least 1 episode)
  if (stats.historyCount >= 1) {
    earned.push(ALL_BADGES.active_member);
  }

  // Anime Fan (watchlist + favorites >= 3)
  if (stats.watchlistCount + stats.favoritesCount >= 3) {
    earned.push(ALL_BADGES.anime_fan);
  }

  // Community Voice (at least 1 comment)
  if ((stats.commentsCount || 0) >= 1) {
    earned.push(ALL_BADGES.commenter);
  }

  // Top Contributor (3+ comments)
  if ((stats.commentsCount || 0) >= 3) {
    earned.push(ALL_BADGES.top_contributor);
  }

  // Otaku (at least 2 completed or 10+ history)
  if (stats.completedCount >= 2 || stats.historyCount >= 10) {
    earned.push(ALL_BADGES.otaku);
  }

  return earned;
}
