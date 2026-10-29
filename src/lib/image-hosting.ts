/**
 * Helper to normalize and convert image URLs from popular hosting services
 * into direct permanent image URLs that work reliably in <img> tags.
 */

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Match: /file/d/FILE_ID/...
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Match: id=FILE_ID or ?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Match: /thumbnail?id=FILE_ID
  const thumbMatch = url.match(/\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
  if (thumbMatch && thumbMatch[1]) {
    return thumbMatch[1];
  }

  // Match: /d/FILE_ID
  const lh3Match = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) {
    return lh3Match[1];
  }

  return null;
}

/**
 * Converts a Google Drive share URL into a direct, high-resolution CDN image link.
 * Note: File in Google Drive must have permission "Anyone with the link" (Viewer).
 */
export function convertGoogleDriveToDirectUrl(url: string): string {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return url;
  // High-performance Google User Content direct image endpoint (works in <img>, fast CDN, permanent)
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Normalizes URLs from various providers (Google Drive, Dropbox, etc.)
 * so they load permanently without redirect/preview HTML pages.
 */
export function normalizeImageHostingUrl(rawUrl: string): {
  normalizedUrl: string;
  provider: 'firebase' | 'google-drive' | 'dropbox' | 'catbox' | 'imgbb' | 'standard';
  note?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { normalizedUrl: '', provider: 'standard' };
  }

  const trimmed = rawUrl.trim();

  // 1. Google Drive
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const fileId = extractGoogleDriveFileId(trimmed);
    if (fileId) {
      return {
        normalizedUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        provider: 'google-drive',
        note: 'Auto-converted from Google Drive to direct permanent Google CDN image link! Ensure sharing is set to "Anyone with the link".',
      };
    }
  }

  // 2. Google User Content (already direct)
  if (trimmed.includes('googleusercontent.com/d/')) {
    return {
      normalizedUrl: trimmed,
      provider: 'google-drive',
      note: 'Google Drive direct CDN link.',
    };
  }

  // 3. Dropbox (convert www.dropbox.com to direct dl.dropboxusercontent.com or raw=1)
  if (trimmed.includes('dropbox.com')) {
    let directDropbox = trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    directDropbox = directDropbox.replace(/[?&]dl=0/, '?raw=1');
    if (!directDropbox.includes('raw=1')) {
      directDropbox += directDropbox.includes('?') ? '&raw=1' : '?raw=1';
    }
    return {
      normalizedUrl: directDropbox,
      provider: 'dropbox',
      note: 'Converted Dropbox URL to direct stream link.',
    };
  }

  // 4. Catbox.moe (permanent direct image hosting)
  if (trimmed.includes('catbox.moe')) {
    return {
      normalizedUrl: trimmed,
      provider: 'catbox',
      note: 'Catbox permanent hosting link.',
    };
  }

  // 5. ImgBB
  if (trimmed.includes('ibb.co')) {
    return {
      normalizedUrl: trimmed,
      provider: 'imgbb',
      note: 'ImgBB image link.',
    };
  }

  // 6. Firebase Storage
  if (trimmed.includes('firebasestorage.googleapis.com') || trimmed.includes('storage.googleapis.com')) {
    return {
      normalizedUrl: trimmed,
      provider: 'firebase',
      note: 'Permanent Firebase Storage URL.',
    };
  }

  return {
    normalizedUrl: trimmed,
    provider: 'standard',
  };
}
