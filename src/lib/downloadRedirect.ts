import type { Episode } from '../types/episode';
import type { Anime } from '../types/anime';

import { isAbyssPlayerUrl } from './video-hosts';

export interface DownloadMirror {
  quality: string;
  size?: string;
  url: string;
  host?: string;
  isEmbedPlayer?: boolean;
}

export function isEmbedStreamMirrorUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const lower = rawUrl.toLowerCase();
  if (/\.(mp4|mkv|webm|mov|zip|rar)(\?|$)/i.test(lower)) return false;
  return (
    isAbyssPlayerUrl(lower) ||
    lower.includes('/embed/') ||
    lower.includes('/e/') ||
    lower.includes('/preview') ||
    lower.includes('streamtape') ||
    lower.includes('dood') ||
    lower.includes('filemoon') ||
    lower.includes('streamwish') ||
    lower.includes('vidmoly')
  );
}

/**
 * Ensures the download URL is a valid absolute URL with a secure protocol.
 * Strictly rejects dangerous protocols like javascript:, data:, vbscript:, etc.
 */
export function formatDownloadUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return '';
  }
  let trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  
  // Reject dangerous pseudo-protocols and script injections
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.includes('javascript%3a') ||
    lower.includes('data%3a') ||
    lower.includes('vbscript%3a')
  ) {
    return '';
  }

  if (trimmed.startsWith('//')) {
    trimmed = 'https:' + trimmed;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Returns all configured download mirrors for the episode/anime.
 */
export function getAllEpisodeDownloadMirrors(
  episode?: Episode | null,
  anime?: Anime | null
): DownloadMirror[] {
  const mirrors: DownloadMirror[] = [];
  const seenUrlRes = new Set<string>();
  const seenExplicitUrls = new Set<string>();

  const getResKey = (quality?: string): string => {
    const q = (quality || '').toLowerCase();
    if (q.includes('2160') || q.includes('4k')) return '4k';
    if (q.includes('1080')) return '1080p';
    if (q.includes('720')) return '720p';
    if (q.includes('480')) return '480p';
    if (q.includes('360')) return '360p';
    return 'other';
  };

  const addMirror = (mirror: DownloadMirror, isExplicitList = false) => {
    const formatted = formatDownloadUrl(mirror.url);
    if (!formatted) return;
    if (mirror.isEmbedPlayer || isEmbedStreamMirrorUrl(formatted)) return;

    const resKey = getResKey(mirror.quality);
    const dedupeKey = `${resKey}::${formatted}`;
    if (seenUrlRes.has(dedupeKey)) return;

    // For fallback single-URL fields (episode.downloadUrl, sources, anime fallback),
    // avoid adding a duplicate row if this exact URL is already in explicit downloadLinks
    if (!isExplicitList && seenExplicitUrls.has(formatted)) return;

    seenUrlRes.add(dedupeKey);
    if (isExplicitList) {
      seenExplicitUrls.add(formatted);
    }

    mirrors.push({
      ...mirror,
      url: formatted,
      isEmbedPlayer: false,
    });
  };

  const getHostLabel = (rawUrl: string, fallback: string) => {
    try {
      const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      const host = parsed.hostname.replace('www.', '').toLowerCase();
      if (host.includes('mega.nz')) return 'MegaCloud';
      if (host.includes('drive.google')) return 'Google Drive';
      if (host.includes('mediafire.com')) return 'MediaFire';
      if (host.includes('terabox')) return 'TeraBox';
      if (host.includes('dropbox')) return 'Dropbox';
      if (host.includes('filemoon')) return 'Filemoon';
      if (host.includes('streamtape')) return 'Streamtape';
      if (host.includes('dood')) return 'Doodstream';
      if (host.includes('streamwish')) return 'StreamWish';
      if (host.includes('vidmoly')) return 'Vidmoly';
      if (host.includes('mp4upload')) return 'Mp4Upload';
      if (host.includes('gofile')) return 'Gofile';
      return host || fallback;
    } catch {
      return fallback;
    }
  };

  // 1. Explicit Episode Download Links (preserves both 720p & 1080p even if sharing the same host URL)
  if (episode?.downloadLinks && episode.downloadLinks.length > 0) {
    episode.downloadLinks.forEach((dl) => {
      if (dl.url && dl.url.trim()) {
        addMirror(
          {
            quality: dl.quality || '1080p Full HD',
            size: dl.size || (getResKey(dl.quality) === '720p' ? '~180 MB' : '~350 MB'),
            url: dl.url,
            host: dl.host || getHostLabel(dl.url, 'Direct Mirror'),
          },
          true
        );
      }
    });
  }

  // 2. Explicit Episode Direct Download URL
  if (episode?.downloadUrl && episode.downloadUrl.trim()) {
    addMirror({
      quality: episode.downloadQuality || '1080p Full HD',
      size: episode.downloadSize || (getResKey(episode.downloadQuality) === '720p' ? '~180 MB' : '~350 MB'),
      url: episode.downloadUrl,
      host: getHostLabel(episode.downloadUrl, 'Primary Mirror'),
    });
  }

  // 3. Episode Sources & Video Sources (Only include direct file/download links, exclude embedded video players)
  const allSources = [
    ...(episode?.sources || []),
    ...(episode?.videoSources || []),
  ];
  for (const s of allSources) {
    const srcUrl = s.embedUrl || (s as any).videoUrl;
    if (srcUrl && typeof srcUrl === 'string' && srcUrl.trim()) {
      if (isEmbedStreamMirrorUrl(srcUrl)) continue;
      addMirror({
        quality: `${s.quality || '1080p HD'} (${s.provider || s.sourceName || 'Stream Server'})`,
        size: s.language || 'Direct Stream Server',
        url: srcUrl,
        host: getHostLabel(srcUrl, s.provider || 'Stream Mirror'),
        isEmbedPlayer: false,
      });
    }
  }

  // 4. Episode direct video URL (exclude embedded video players)
  if (episode?.videoUrl && episode.videoUrl.trim() && !isEmbedStreamMirrorUrl(episode.videoUrl)) {
    addMirror({
      quality: 'HD Stream / Direct Download',
      size: 'High Speed',
      url: episode.videoUrl,
      host: getHostLabel(episode.videoUrl, 'Video Stream Host'),
      isEmbedPlayer: false,
    });
  }

  // 5. Anime Download Links (Configured on Anime document)
  if (anime?.downloadLinks && anime.downloadLinks.length > 0) {
    anime.downloadLinks.forEach((dl) => {
      if (dl.url && dl.url.trim()) {
        addMirror(
          {
            quality: dl.quality || 'Series Download (Full Season)',
            size: dl.size || 'All Episodes',
            url: dl.url,
            host: dl.host || getHostLabel(dl.url, 'Series Cloud Mirror'),
          },
          true
        );
      }
    });
  }

  // 6. Anime Batch Download URL
  if (anime?.downloadBatchUrl && anime.downloadBatchUrl.trim()) {
    addMirror({
      quality: 'Batch Download (All Episodes)',
      size: 'Full Season Pack',
      url: anime.downloadBatchUrl,
      host: getHostLabel(anime.downloadBatchUrl, 'Cloud Storage'),
    });
  }

  // 7. Anime Series Direct Download URL
  if (anime?.downloadUrl && anime.downloadUrl.trim()) {
    addMirror({
      quality: 'Series Direct Download',
      size: 'Full Quality',
      url: anime.downloadUrl,
      host: getHostLabel(anime.downloadUrl, 'Anime Cloud Mirror'),
    });
  }

  // Filter strictly to non-embed direct links and exclude 360p/480p
  const directMirrors = mirrors.filter((m) => {
    if (m.isEmbedPlayer) return false;
    const q = (m.quality || '').toLowerCase();
    if (q.includes('360') || q.includes('480')) return false;
    return true;
  });

  if (directMirrors.length === 0) {
    return [];
  }

  // Ensure BOTH 1080p and 720p direct download options are always presented
  // when at least one direct download mirror is configured for the episode
  const has1080p = directMirrors.some((m) => getResKey(m.quality) === '1080p');
  const has720p = directMirrors.some((m) => getResKey(m.quality) === '720p');
  const primaryDirect =
    directMirrors.find((m) => getResKey(m.quality) === '1080p') ||
    directMirrors.find((m) => getResKey(m.quality) === '720p') ||
    directMirrors[0];

  const finalMirrors: DownloadMirror[] = [...directMirrors];

  if (primaryDirect) {
    if (!has1080p) {
      finalMirrors.unshift({
        quality: '1080p Full HD',
        size: '~350 MB',
        url: primaryDirect.url,
        host: primaryDirect.host || getHostLabel(primaryDirect.url, 'Direct Mirror'),
        isEmbedPlayer: false,
      });
    }
    if (!has720p) {
      finalMirrors.push({
        quality: '720p HD',
        size: '~180 MB',
        url: primaryDirect.url,
        host: primaryDirect.host || getHostLabel(primaryDirect.url, 'Direct Mirror'),
        isEmbedPlayer: false,
      });
    }
  }

  // Sort cleanly: 4K > 1080p > 720p > Batch/Other
  const getWeight = (quality?: string): number => {
    const k = getResKey(quality);
    if (k === '4k') return 2160;
    if (k === '1080p') return 1080;
    if (k === '720p') return 720;
    return 500;
  };

  return finalMirrors.sort((a, b) => getWeight(b.quality) - getWeight(a.quality));
}

/**
 * Resolves the primary direct download URL for an episode or anime.
 * Always resolves to a valid mirror so the user never gets an empty link error.
 */
export function resolveEpisodeDownloadUrl(
  episode?: Episode | null,
  anime?: Anime | null
): string | null {
  const mirrors = getAllEpisodeDownloadMirrors(episode, anime);
  if (mirrors.length > 0) {
    return mirrors[0].url;
  }
  return null;
}

/**
 * Resolves download URL for an entire anime or series.
 */
export function resolveAnimeDownloadUrl(
  anime?: Anime | null,
  episodes?: Episode[] | null
): string | null {
  if (anime?.downloadBatchUrl && anime.downloadBatchUrl.trim()) {
    return formatDownloadUrl(anime.downloadBatchUrl);
  }
  if (anime?.downloadUrl && anime.downloadUrl.trim()) {
    return formatDownloadUrl(anime.downloadUrl);
  }
  if (anime?.downloadLinks && anime.downloadLinks.length > 0 && anime.downloadLinks[0].url) {
    return formatDownloadUrl(anime.downloadLinks[0].url);
  }
  if (episodes && episodes.length > 0) {
    for (const ep of episodes) {
      const epDl = resolveEpisodeDownloadUrl(ep, anime);
      if (epDl) return epDl;
    }
  }
  return resolveEpisodeDownloadUrl(null, anime);
}

/**
 * Opens the external website download link in a new tab.
 * Never redirects the user to Telegram or alters the current page location.
 */
export function executeDownloadRedirect(
  targetUrl?: string | null,
  label?: string,
  onMessage?: (msg: string) => void
) {
  if (!targetUrl || !targetUrl.trim()) {
    if (onMessage) {
      onMessage('Download link has not been added yet for this anime/episode.');
    }
    return;
  }

  let finalUrl = formatDownloadUrl(targetUrl);
  if (!finalUrl) {
    if (onMessage) {
      onMessage('Download link is invalid or empty.');
    }
    return;
  }

  // Convert Google Drive /file/d/ID/view or /preview into direct export=download URL
  const driveMatch = finalUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1] && !finalUrl.includes('export=download')) {
    finalUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  const isDirectFile = /\.(mp4|mkv|webm|mov|zip|rar)(\?|$)/i.test(finalUrl);

  if (onMessage) {
    onMessage(`Opening download link${label ? ` for ${label}` : ''}...`);
  }

  try {
    // Preserve Referer (use rel="noopener" without noreferrer) so embed hosts do not block access
    const link = document.createElement('a');
    link.href = finalUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    if (isDirectFile) {
      link.download = label ? `${label.replace(/[^a-zA-Z0-9._ -]/g, '')}` : 'episode';
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Download redirect error:', err);
  }
}
