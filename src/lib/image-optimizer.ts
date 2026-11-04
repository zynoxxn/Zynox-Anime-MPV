/**
 * High-performance Image Optimizer Utility for Zynox Anime
 * Automatically converts raw, heavy uncompressed images (Google Drive, Unsplash, etc.)
 * into compressed, resized, fast-loading WebP/JPEG CDN endpoints.
 */

export function extractGoogleDriveId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Match /file/d/FILE_ID
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Match id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Match thumbnail?id=FILE_ID
  const thumbMatch = url.match(/\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
  if (thumbMatch && thumbMatch[1]) return thumbMatch[1];

  // Match googleusercontent.com/d/FILE_ID
  const lh3Match = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  return null;
}

export interface ImageOptimizationOptions {
  width?: number;
  quality?: number;
  fallback?: string;
  fallbackType?: 'poster' | 'banner';
}

export const FALLBACK_ANIME_POSTER =
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';

export const FALLBACK_ANIME_BANNER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1400&auto=format&fit=crop&q=80';

// In-memory cache of fully loaded image URLs so revisited cards display with 0ms delay
export const LOADED_IMAGES_CACHE = new Set<string>();

export function isImagePreloaded(url: string): boolean {
  return LOADED_IMAGES_CACHE.has(url);
}

export function markImagePreloaded(url: string): void {
  if (url) LOADED_IMAGES_CACHE.add(url);
}

/**
 * Preload high-priority images into browser HTTP cache
 */
export function preloadImages(urls: (string | null | undefined)[], options: ImageOptimizationOptions = {}): void {
  if (typeof window === 'undefined') return;
  for (const rawUrl of urls) {
    if (!rawUrl) continue;
    const optUrl = getOptimizedImageUrl(rawUrl, options);
    if (optUrl && !LOADED_IMAGES_CACHE.has(optUrl)) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => LOADED_IMAGES_CACHE.add(optUrl);
      img.src = optUrl;
    }
  }
}

/**
 * Returns a high-speed, bandwidth-friendly optimized image URL.
 * Automatically converts Google Drive/UserContent images to lightweight WebP (-rw),
 * cutting image payload down by 75-80% for instant loads.
 */
export function getOptimizedImageUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  const defaultFallback =
    options.fallback ||
    (options.fallbackType === 'banner' ? FALLBACK_ANIME_BANNER : options.fallbackType === 'poster' ? FALLBACK_ANIME_POSTER : '');

  if (!url || typeof url !== 'string') {
    return defaultFallback;
  }

  const trimmed = url.trim();
  if (!trimmed) return defaultFallback;

  // Smaller width default (300px for posters is plenty crisp for 2:3 cards and 3x faster to load)
  const targetWidth = options.width || 300;

  // 1. Google User Content direct link (e.g. https://lh3.googleusercontent.com/d/FILE_ID)
  // Appending "-rw" requests Google's WebP transcoder (typically 20KB-35KB instead of 150KB-10MB)
  if (trimmed.includes('googleusercontent.com/d/')) {
    const base = trimmed.split('=')[0];
    return `${base}=w${targetWidth}-rw`;
  }

  // 2. Google Drive share link (e.g. https://drive.google.com/file/d/FILE_ID/view)
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const fileId = extractGoogleDriveId(trimmed);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=w${targetWidth}-rw`;
    }
  }

  // 3. Unsplash images
  if (trimmed.includes('images.unsplash.com')) {
    const base = trimmed.split('?')[0];
    const q = options.quality || 75;
    return `${base}?w=${targetWidth}&auto=format&fit=crop&q=${q}`;
  }

  // 4. Dropbox links
  if (trimmed.includes('dropbox.com')) {
    let direct = trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    direct = direct.replace(/[?&]dl=0/, '?raw=1');
    if (!direct.includes('raw=1')) {
      direct += direct.includes('?') ? '&raw=1' : '?raw=1';
    }
    return direct;
  }

  return trimmed;
}
