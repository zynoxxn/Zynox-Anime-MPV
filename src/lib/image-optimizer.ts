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
  highPriority?: boolean;
}

export function getHeroBannerWidth(): number {
  if (typeof window === 'undefined') return 1400;
  const w = window.innerWidth;
  if (w < 640) return 800;
  if (w < 1024) return 1100;
  return 1400;
}

export const FALLBACK_ANIME_POSTER =
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';

export const FALLBACK_ANIME_BANNER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1400&auto=format&fit=crop&q=80';

const HERO_PLACEHOLDER_CACHE = new Map<string, string>();

const HERO_GRADIENT_PALETTES: Array<[string, string, string]> = [
  ['#050A14', '#0F2547', '#1E88FF'],
  ['#060B18', '#15223D', '#00CFFF'],
  ['#050914', '#1A1E3F', '#3B82F6'],
  ['#040A16', '#0D2A3F', '#0EA5E9'],
];

function encodeSvgBase64(svg: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return `data:image/svg+xml;base64,${window.btoa(svg)}`;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) {
    return `data:image/svg+xml;base64,${(globalThis as any).Buffer.from(svg, 'utf8').toString('base64')}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a lightweight, deterministic blurry base64 SVG placeholder
 * so hero banners display an atmospheric blurred backdrop immediately on frame 0.
 */
export function getHeroBlurPlaceholder(seed: string = 'default'): string {
  const cached = HERO_PLACEHOLDER_CACHE.get(seed);
  if (cached) return cached;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const [bgDark, bgMid, accent] = HERO_GRADIENT_PALETTES[hash % HERO_GRADIENT_PALETTES.length];
  const cx1 = 55 + (hash % 30);
  const cy1 = 22 + ((hash >> 4) % 25);
  const cx2 = 15 + ((hash >> 8) % 25);
  const cy2 = 55 + ((hash >> 12) % 25);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 36" preserveAspectRatio="none">` +
    `<defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${bgDark}"/>` +
    `<stop offset="55%" stop-color="${bgMid}"/>` +
    `<stop offset="100%" stop-color="${bgDark}"/>` +
    `</linearGradient>` +
    `<filter id="b"><feGaussianBlur stdDeviation="5"/></filter>` +
    `</defs>` +
    `<rect width="64" height="36" fill="url(#g)"/>` +
    `<g filter="url(#b)">` +
    `<circle cx="${cx1}" cy="${cy1}" r="18" fill="${accent}" fill-opacity="0.35"/>` +
    `<circle cx="${cx2}" cy="${cy2}" r="14" fill="#00CFFF" fill-opacity="0.18"/>` +
    `</g>` +
    `</svg>`;

  const dataUri = encodeSvgBase64(svg);
  HERO_PLACEHOLDER_CACHE.set(seed, dataUri);
  return dataUri;
}

export const HERO_BLUR_PLACEHOLDER_BASE64 = getHeroBlurPlaceholder('zynox-hero-default');

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
      if (options.highPriority) {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
      }
      img.onload = () => LOADED_IMAGES_CACHE.add(optUrl);
      img.src = optUrl;
    }
  }
}

export const POSTER_IMAGE_SIZES = '(max-width: 639px) 120px, (max-width: 1023px) 132px, 160px';

/**
 * Generates a responsive srcset for poster cards capped at <= 240px width.
 * Only emits srcset for URLs that support CDN width parameters.
 */
export function getOptimizedPosterSrcSet(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const isResizable =
    trimmed.includes('googleusercontent.com/d/') ||
    trimmed.includes('drive.google.com') ||
    trimmed.includes('docs.google.com') ||
    trimmed.includes('images.unsplash.com');

  if (!isResizable) return undefined;

  const w160 = getOptimizedImageUrl(trimmed, { width: 160, fallbackType: 'poster' });
  const w240 = getOptimizedImageUrl(trimmed, { width: 240, fallbackType: 'poster' });
  return `${w160} 160w, ${w240} 240w`;
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

  // Compact width default (240px for posters is crisp for 2:3 cards and fast to load)
  const targetWidth = options.width || (options.fallbackType === 'poster' ? 240 : 300);

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
