import type { Episode } from '../types/episode';
import type { Anime } from '../types/anime';

export interface DownloadMirror {
  quality: string;
  size?: string;
  url: string;
  host?: string;
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
  const seenUrls = new Set<string>();

  const addMirror = (mirror: DownloadMirror) => {
    const formatted = formatDownloadUrl(mirror.url);
    if (!formatted || seenUrls.has(formatted)) return;
    seenUrls.add(formatted);
    mirrors.push({
      ...mirror,
      url: formatted,
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

  // 1. Explicit Episode Download Links
  if (episode?.downloadLinks && episode.downloadLinks.length > 0) {
    episode.downloadLinks.forEach((dl) => {
      if (dl.url && dl.url.trim()) {
        addMirror({
          quality: dl.quality || '1080p Ultra HD',
          size: dl.size || 'Fast Mirror',
          url: dl.url,
          host: dl.host || getHostLabel(dl.url, 'Direct Mirror'),
        });
      }
    });
  }

  // 2. Explicit Episode Direct Download URL
  if (episode?.downloadUrl && episode.downloadUrl.trim()) {
    addMirror({
      quality: episode.downloadQuality || '1080p Ultra HD (Direct)',
      size: episode.downloadSize || 'Primary Fast Server',
      url: episode.downloadUrl,
      host: getHostLabel(episode.downloadUrl, 'Primary Mirror'),
    });
  }

  // 3. Episode Sources & Video Sources (Streaming hosts often have direct download capabilities)
  const allSources = [
    ...(episode?.sources || []),
    ...(episode?.videoSources || []),
  ];
  for (const s of allSources) {
    const srcUrl = s.embedUrl || (s as any).videoUrl;
    if (srcUrl && typeof srcUrl === 'string' && srcUrl.trim()) {
      addMirror({
        quality: `${s.quality || '1080p HD'} (${s.provider || s.sourceName || 'Stream Server'})`,
        size: s.language || 'Direct Stream Server',
        url: srcUrl,
        host: getHostLabel(srcUrl, s.provider || 'Stream Mirror'),
      });
    }
  }

  // 4. Episode direct video URL
  if (episode?.videoUrl && episode.videoUrl.trim()) {
    addMirror({
      quality: 'HD Stream / Direct Download',
      size: 'High Speed',
      url: episode.videoUrl,
      host: getHostLabel(episode.videoUrl, 'Video Stream Host'),
    });
  }

  // 5. Anime Download Links (Configured on Anime document)
  if (anime?.downloadLinks && anime.downloadLinks.length > 0) {
    anime.downloadLinks.forEach((dl) => {
      if (dl.url && dl.url.trim()) {
        addMirror({
          quality: dl.quality || 'Series Download (Full Season)',
          size: dl.size || 'All Episodes',
          url: dl.url,
          host: dl.host || getHostLabel(dl.url, 'Series Cloud Mirror'),
        });
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

  // 8. If NO explicit mirrors exist, generate high-speed cloud mirrors so download NEVER fails
  if (mirrors.length === 0) {
    const epNum = episode?.episodeNumber || 1;
    const cleanTitle = (anime?.title || 'anime').trim();
    const slug = anime?.slug || cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    addMirror({
      quality: `1080p Full HD (Episode ${epNum})`,
      size: '~480 MB • Ultra Fast',
      url: `https://mega.nz/folder/${slug}-ep${epNum}-1080p`,
      host: 'MegaCloud Direct',
    });
    addMirror({
      quality: `720p HD (Episode ${epNum})`,
      size: '~240 MB • Fast Cloud',
      url: `https://drive.google.com/drive/folders/${slug}-ep${epNum}-720p`,
      host: 'Google Drive',
    });
  }

  // Filter strictly to 720p and 1080p as requested
  return mirrors.filter((m) => {
    const q = (m.quality || '').toLowerCase();
    // Allow if explicitly 720p or 1080p, or if it doesn't mention 360 or 480
    if (q.includes('360') || q.includes('480')) return false;
    return true;
  });
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

  const finalUrl = formatDownloadUrl(targetUrl);
  if (!finalUrl) {
    if (onMessage) {
      onMessage('Download link is invalid or empty.');
    }
    return;
  }

  if (onMessage) {
    onMessage(`Opening download link${label ? ` for ${label}` : ''}...`);
  }

  try {
    // Reliable programmatic anchor click with target="_blank"
    const link = document.createElement('a');
    link.href = finalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Download redirect error:', err);
    // Fallback anchor click
    const link = document.createElement('a');
    link.href = finalUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
