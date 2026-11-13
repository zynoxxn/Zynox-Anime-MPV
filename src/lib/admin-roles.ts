/**
 * ZYNOX Admin Role Permissions & Access Control Helpers
 * Supports: super_admin, admin, editor, moderator
 */

export type AdminRole = 'super_admin' | 'admin' | 'editor' | 'moderator' | 'none';

export const PINNED_SUPER_ADMIN_EMAIL = 'zairoxmax2.0@gmail.com';

/**
 * Resolve the current user's effective admin role
 */
export function getAdminRole(user: any, isAdminClaim?: boolean): AdminRole {
  if (!user) return 'none';

  const email = (user.email || '').toLowerCase().trim();
  if (email === PINNED_SUPER_ADMIN_EMAIL) {
    return 'super_admin';
  }

  // Check user role field if available
  const explicitRole = user.role || user.customClaims?.role;
  if (explicitRole === 'super_admin') return 'super_admin';
  if (explicitRole === 'admin') return 'admin';
  if (explicitRole === 'editor') return 'editor';
  if (explicitRole === 'moderator') return 'moderator';

  // Fallback to isAdmin boolean claim from Auth
  if (isAdminClaim) {
    return 'admin';
  }

  return 'none';
}

/**
 * Check if a role can access a specific admin module
 */
export function canAccessModule(role: AdminRole, moduleId: string): boolean {
  if (role === 'super_admin') return true;
  if (role === 'none') return false;

  const normalized = moduleId.toLowerCase();

  // Admin has access to everything except user role assignments & system danger zone
  if (role === 'admin') {
    return true;
  }

  // Editor has access to Library, Homepage, and general Site content
  if (role === 'editor') {
    const editorModules = [
      'dashboard',
      'anime',
      'episodes',
      'bulk-episodes',
      'seasons',
      'downloads',
      'schedule',
      'taxonomy',
      'homepage',
      'hero',
      'notice',
      'announcements',
      'avatars',
      'navigation',
      'seo',
      'legal',
    ];
    return editorModules.includes(normalized);
  }

  // Moderator has access to Community only
  if (role === 'moderator') {
    const moderatorModules = [
      'dashboard',
      'requests',
      'reports',
      'comments',
    ];
    return moderatorModules.includes(normalized);
  }

  return false;
}

/**
 * Check if the user can manage roles or sensitive user accounts
 */
export function canManageUsers(role: AdminRole): boolean {
  return role === 'super_admin';
}

/**
 * Check if the user can access destructive developer operations (e.g. Catalog Seed, Database resets)
 */
export function canAccessDangerZone(role: AdminRole): boolean {
  return role === 'super_admin';
}

/**
 * Safe email mask: "zairoxmax2.0@gmail.com" -> "za…@gmail.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return 'Admin';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const username = parts[0];
  const domain = parts[1];
  if (username.length <= 2) {
    return `${username}…@${domain}`;
  }
  return `${username.slice(0, 2)}…@${domain}`;
}

/**
 * Safe Date parser that accepts Firestore Timestamp, ISO string, milliseconds, or object
 * NEVER displays "Invalid Date"
 */
export function formatAdminDate(raw: any): string {
  if (!raw) return '—';

  let date: Date | null = null;

  try {
    if (typeof raw?.toDate === 'function') {
      date = raw.toDate();
    } else if (raw?.seconds) {
      date = new Date(raw.seconds * 1000);
    } else if (typeof raw === 'number') {
      date = new Date(raw);
    } else if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      }
    } else if (raw instanceof Date) {
      date = raw;
    }
  } catch {
    return '—';
  }

  if (!date || isNaN(date.getTime())) {
    return '—';
  }

  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
