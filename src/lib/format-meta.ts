import type { Anime } from '../types/anime';
import type { VideoSource } from '../types/episode';
import type { DownloadMirror } from './downloadRedirect';

/**
 * Normalizes audio label for poster cards (max ~14 chars).
 * Long/combined strings like "Hindi Dub & Japanese Sub" become "Multi audio".
 */
export function formatCardAudioLabel(anime: Partial<Anime> & Record<string, any>): string {
  const rawAudio = (anime.audioLanguage || anime.language || '').trim();
  const lower = rawAudio.toLowerCase();

  if (rawAudio) {
    if (
      lower.includes('&') ||
      lower.includes('+') ||
      lower.includes('/') ||
      lower.includes(',') ||
      lower.includes('multi') ||
      (lower.includes('hindi') && (lower.includes('sub') || lower.includes('jap') || lower.includes('eng'))) ||
      rawAudio.length > 14
    ) {
      return 'Multi audio';
    }
    if (lower === 'hindi' || lower === 'hi' || lower === 'hindi dub') return 'Hindi Dub';
    if (lower === 'english' || lower === 'en' || lower === 'eng dub' || lower === 'english dub') return 'English Dub';
    if (lower === 'sub' || lower === 'subbed' || lower === 'japanese sub') return 'Sub';
    if (lower === 'dub' || lower === 'dubbed') return 'Dub';
    return rawAudio;
  }

  if (Array.isArray(anime.audioTags) && anime.audioTags.length > 0) {
    if (anime.audioTags.length > 1) return 'Multi audio';
    const tag = String(anime.audioTags[0] || '').trim();
    if (tag.length > 14) return 'Multi audio';
    if (tag) return tag;
  }

  const hasSub = anime.hasSub !== false;
  const hasDub = Boolean(anime.hasDub);
  const hasHindi = Boolean(
    anime.hasHindiDub ||
      (Array.isArray(anime.languages) && anime.languages.some((l) => String(l).toLowerCase().includes('hindi')))
  );

  if (hasHindi && hasSub && anime.languages && anime.languages.length > 1) return 'Multi audio';
  if (hasHindi) return 'Hindi Dub';
  if (hasDub && hasSub) return 'Multi audio';
  if (hasDub) return 'Dub';
  return 'Sub';
}

/**
 * Formats total episodes count for anime poster card bottom-corner badges.
 * Handles single-season, multi-season sum, active season overrides, and movies.
 */
export function formatCardEpisodesBadge(anime: Partial<Anime> & Record<string, any>): {
  prefix: string;
  count: string;
  fullLabel: string;
} {
  const isMovie = String(anime.type || '').trim().toLowerCase() === 'movie';
  const directCount = Number(anime.totalEpisodes || anime.episodesCount || 0) || 0;

  let resolvedCount = directCount;

  if (Array.isArray(anime.seasonsList) && anime.seasonsList.length > 0) {
    if (anime.activeSeasonNumber) {
      const activeSeason = anime.seasonsList.find(
        (s) => Number(s.seasonNumber) === Number(anime.activeSeasonNumber)
      );
      if (activeSeason?.totalEpisodes && Number(activeSeason.totalEpisodes) > 0) {
        resolvedCount = Number(activeSeason.totalEpisodes);
      }
    } else if (anime.seasonsList.length > 1) {
      const seasonsSum = anime.seasonsList.reduce(
        (sum, s) => sum + (Number(s.totalEpisodes) || 0),
        0
      );
      if (seasonsSum > 0) {
        resolvedCount = Math.max(directCount, seasonsSum);
      }
    } else if (resolvedCount <= 0) {
      const firstSeasonEps = Number(anime.seasonsList[0]?.totalEpisodes || 0);
      if (firstSeasonEps > 0) {
        resolvedCount = firstSeasonEps;
      }
    }
  }

  if (isMovie && resolvedCount <= 1) {
    return { prefix: '', count: 'Movie', fullLabel: 'Movie' };
  }

  if (resolvedCount > 0) {
    return {
      prefix: 'EP',
      count: String(resolvedCount),
      fullLabel: `EP ${resolvedCount}`,
    };
  }

  if (String(anime.status || '').trim().toLowerCase() === 'upcoming') {
    return { prefix: '', count: 'TBA', fullLabel: 'TBA' };
  }

  return { prefix: 'EP', count: '12', fullLabel: 'EP 12' };
}

/**
 * Formats episode duration cleanly as "24 min" (never "24:00m" or "24m").
 */
export function formatDurationMinutes(raw?: string | number | null): string {
  if (raw === null || raw === undefined || raw === '') return '24 min';

  if (typeof raw === 'number' && !isNaN(raw)) {
    const mins = raw > 300 ? Math.round(raw / 60) : Math.round(raw);
    return `${Math.max(1, mins)} min`;
  }

  const str = String(raw).trim();
  if (!str) return '24 min';

  // Handle MM:SS or HH:MM:SS (e.g. "24:00", "24:00m", "01:02:00")
  const colonMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (colonMatch) {
    if (colonMatch[3] !== undefined) {
      const totalMins = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
      return `${Math.max(1, totalMins)} min`;
    }
    const mins = parseInt(colonMatch[1], 10);
    return `${Math.max(1, mins)} min`;
  }

  // Extract first integer number
  const numMatch = str.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return `${num} min`;
    }
  }

  return '24 min';
}

/**
 * Generates unique display labels ("Server 1", "Server 2", ...) for a list of servers.
 * Automatically numbers any duplicate or generic labels.
 */
export function getUniqueServerLabels(servers: VideoSource[]): string[] {
  const counts = new Map<string, number>();

  const normalizedNames = servers.map((s, idx) => {
    const raw = (s.name || s.sourceName || '').trim();
    const cleaned = raw
      .replace(/\(.*?\)/g, '')
      .replace(/\b(dub|sub|hindi|english)\b/gi, '')
      .trim();
    const lower = cleaned.toLowerCase();
    if (!cleaned || lower === 'server' || lower === 'hd server' || /^hd server \d+$/i.test(lower)) {
      return `Server ${idx + 1}`;
    }
    return cleaned;
  });

  normalizedNames.forEach((name) => {
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  const seenCounter = new Map<string, number>();
  return normalizedNames.map((name, idx) => {
    const total = counts.get(name) || 1;
    if (total > 1) {
      const nextNum = (seenCounter.get(name) || 0) + 1;
      seenCounter.set(name, nextNum);
      if (/^server(\s+\d+)?$/i.test(name)) {
        return `Server ${idx + 1}`;
      }
      return `${name} ${nextNum}`;
    }
    return name;
  });
}

export interface FormattedDownloadRow {
  mirror: DownloadMirror;
  title: string;
  meta: string;
  sortWeight: number;
}

/**
 * Formats and sorts download mirrors cleanly:
 * - Title: "1080p · Dub" / "720p · Sub"
 * - Meta: "player.host.com · ~350 MB"
 * - Sorted descending by resolution quality.
 */
export function formatAndSortDownloadMirrors(
  mirrors: DownloadMirror[],
  fallbackAudio: string = 'Sub'
): FormattedDownloadRow[] {
  const rows: FormattedDownloadRow[] = mirrors.map((m) => {
    const combined = `${m.quality || ''} ${m.size || ''}`;
    const qLower = combined.toLowerCase();

    // Resolution detection & sort score
    let resLabel = 'HD';
    let sortWeight = 500;
    if (qLower.includes('2160') || qLower.includes('4k')) {
      resLabel = '4K';
      sortWeight = 2160;
    } else if (qLower.includes('1080')) {
      resLabel = '1080p';
      sortWeight = 1080;
    } else if (qLower.includes('720')) {
      resLabel = '720p';
      sortWeight = 720;
    } else if (qLower.includes('480')) {
      resLabel = '480p';
      sortWeight = 480;
    } else if (qLower.includes('360')) {
      resLabel = '360p';
      sortWeight = 360;
    } else if (qLower.includes('batch')) {
      resLabel = 'Batch HD';
      sortWeight = 900;
    }

    // Audio tag detection (remove raw "(server 1) DUB" noise)
    let audioLabel = fallbackAudio;
    if (qLower.includes('hindi')) {
      audioLabel = 'Hindi Dub';
    } else if (qLower.includes('dual')) {
      audioLabel = 'Dual Audio';
    } else if (qLower.includes('multi')) {
      audioLabel = 'Multi Audio';
    } else if (qLower.includes('dub')) {
      audioLabel = fallbackAudio.toLowerCase().includes('dub') ? fallbackAudio : 'Dub';
    } else if (qLower.includes('sub')) {
      audioLabel = 'Sub';
    }

    // Hostname extraction
    let hostDomain = 'mirror';
    try {
      const parsed = new URL(m.url);
      hostDomain = parsed.hostname.replace(/^www\./, '');
    } catch {
      hostDomain = (m.host || 'mirror').replace(/\s+/g, '').toLowerCase();
    }

    // Size formatting
    const rawSize = (m.size || '')
      .replace(/•.*$/, '')
      .replace(/\b(dub|sub|hindi|english|stream server|direct stream server|primary fast server|fast mirror)\b/gi, '')
      .trim();

    const sizePart =
      rawSize && /\d+\s*(mb|gb|kb)/i.test(rawSize)
        ? rawSize
        : resLabel === '1080p'
        ? '~350 MB'
        : resLabel === '720p'
        ? '~180 MB'
        : 'Fast link';

    return {
      mirror: m,
      title: `${resLabel} · ${audioLabel}`,
      meta: `${hostDomain} · ${sizePart}`,
      sortWeight,
    };
  });

  return rows.sort((a, b) => b.sortWeight - a.sortWeight);
}
