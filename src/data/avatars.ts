export interface AnimeAvatar {
  id: string;
  name: string;
  anime: string;
  category: 'Popular' | 'Shonen' | 'Sword Art Online' | 'Re:Zero' | 'Naruto' | 'Bleach' | 'One Piece' | 'Action & Magic' | 'Classics' | 'Custom';
  url: string;
  accentColor: string;
}

// User requested to delete all avatar images - clean slate for new admin uploads
export const ANIME_AVATARS: AnimeAvatar[] = [];

export const AVATAR_CATEGORIES = [
  'All',
  'Popular',
  'Sword Art Online',
  'Re:Zero',
  'One Piece',
  'Bleach',
  'Naruto',
  'Shonen',
  'Action & Magic',
  'Classics',
  'Custom',
] as const;

export const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=zynox';
