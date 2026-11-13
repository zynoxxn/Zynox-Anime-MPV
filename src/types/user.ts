export type UserRole = 'admin' | 'moderator' | 'user' | 'superadmin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'disabled';

export interface UserSettings {
  autoplay: boolean;
  autoNext: boolean;
  rememberProgress: boolean;
  preferredServer?: string;
  preferredQuality?: string;
  preferredLanguage?: 'SUB' | 'DUB' | 'ALL';
  themeAccent?: string;
  compactMode?: boolean;
  notificationsEnabled?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatar?: string;
  photoURL?: string;
  bio?: string;
  role: UserRole;
  status?: UserStatus;
  commentingRestricted?: boolean;
  badges?: string[];
  settings?: UserSettings;
  createdAt: any;
  updatedAt?: any;
}
