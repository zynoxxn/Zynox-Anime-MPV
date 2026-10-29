import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { withTimeout, getStoredCache, setStoredCache } from './fast-cache';
import type { Episode } from '../../types/episode';
import type { Anime } from '../../types/anime';
import { getAnimeById, getPublishedAnimes, isAnimeDeleted } from './anime';
import { notifyFollowersNewEpisode } from './follows';
import { DEFAULT_EPISODES, DEFAULT_ANIMES } from '../../data/defaultCatalog';

const EPISODES_COLLECTION = 'episodes';
const LOCAL_EPISODES_KEY = 'zynox_local_admin_episodes';

export function getLocalStoredEpisodes(): Episode[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_EPISODES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalStoredEpisode(ep: Episode): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getLocalStoredEpisodes();
    const idx = list.findIndex((e) => e.id === ep.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...ep };
    } else {
      list.unshift(ep);
    }
    localStorage.setItem(LOCAL_EPISODES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save episode to local storage:', e);
  }
}

function sanitizeData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && typeof (value as any).toMillis !== 'function') {
        cleaned[key] = sanitizeData(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? sanitizeData(item) : item
        );
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

export function sanitizeEpisodeStreamUrls(ep: Episode): Episode {
  if (!ep) return ep;
  if (ep.status === 'upcoming' || ep.isUpcoming) {
    return ep;
  }
  const fixUrl = (u?: string) => {
    if (!u) return u;
    if (u.includes('commondatastorage.googleapis.com/gtv-videos-bucket/sample/')) {
      if (u.includes('Bunny')) return 'https://media.w3.org/2010/05/bunny/trailer.mp4';
      if (u.includes('Blazes')) return 'https://vjs.zencdn.net/v/oceans.mp4';
      if (u.includes('TearsOfSteel')) return 'https://media.w3.org/2010/05/video/movie_300.mp4';
      return 'https://media.w3.org/2010/05/sintel/trailer.mp4';
    }
    return u;
  };

  const newVideoUrl = fixUrl(ep.videoUrl);
  const newSources = (ep.sources || []).map((s) => ({
    ...s,
    embedUrl: fixUrl(s.embedUrl),
  }));
  const newVideoSources = (ep.videoSources || []).map((s) => ({
    ...s,
    embedUrl: fixUrl(s.embedUrl),
  }));

  return {
    ...ep,
    videoUrl: newVideoUrl || newSources[0]?.embedUrl || 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    sources: newSources.length > 0 ? newSources : undefined,
    videoSources: newVideoSources.length > 0 ? newVideoSources : undefined,
  };
}

function generateFallbackEpisodes(animeId: string): Episode[] {
  if (!animeId) return [];
  const lower = animeId.toLowerCase().trim();
  
  if (DEFAULT_EPISODES[animeId]) {
    return DEFAULT_EPISODES[animeId].map(sanitizeEpisodeStreamUrls);
  }
  if (DEFAULT_EPISODES[lower]) {
    return DEFAULT_EPISODES[lower].map(sanitizeEpisodeStreamUrls);
  }

  // Check aliases
  for (const [key, epList] of Object.entries(DEFAULT_EPISODES)) {
    if (key.toLowerCase() === lower || key.replace(/^anime-/, '') === lower || lower.replace(/^anime-/, '') === key) {
      return epList.map(sanitizeEpisodeStreamUrls);
    }
  }

  // Try matching by checking DEFAULT_ANIMES by slug or ID
  const matchedAnime = DEFAULT_ANIMES.find(
    (a) => a.id.toLowerCase() === lower || a.slug.toLowerCase() === lower || a.id.replace(/^anime-/, '') === lower
  );
  if (matchedAnime) {
    if (DEFAULT_EPISODES[matchedAnime.id]) return DEFAULT_EPISODES[matchedAnime.id].map(sanitizeEpisodeStreamUrls);
    if (matchedAnime.slug && DEFAULT_EPISODES[matchedAnime.slug]) return DEFAULT_EPISODES[matchedAnime.slug].map(sanitizeEpisodeStreamUrls);
  }
  return [];
}

export async function getAllEpisodes(): Promise<Episode[]> {
  return getAllEpisodesByAnimeId();
}

export async function getPublishedEpisodesByAnimeId(animeId: string): Promise<Episode[]> {
  const defaults = generateFallbackEpisodes(animeId);
  try {
    const targetIds = new Set<string>([animeId]);
    try {
      const anime = await getAnimeById(animeId);
      if (anime) {
        if (anime.id) targetIds.add(anime.id);
        if (anime.slug) targetIds.add(anime.slug);
      }
    } catch {}

    const idList = Array.from(targetIds);
    let list: Episode[] = [];

    try {
      const q = query(
        collection(db, EPISODES_COLLECTION),
        where('animeId', 'in', idList.slice(0, 10)),
        where('published', '==', true)
      );
      const snapshot = await withTimeout(getDocs(q), 1800, null);
      if (snapshot && !snapshot.empty) {
        list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Episode, 'id'>),
        }));
      }
    } catch {
      try {
        const q = query(
          collection(db, EPISODES_COLLECTION),
          where('animeId', '==', animeId)
        );
        const snapshot = await withTimeout(getDocs(q), 1500, null);
        if (snapshot && !snapshot.empty) {
          list = snapshot.docs
            .map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Episode, 'id'>),
            }))
            .filter((ep) => ep.published !== false);
        }
      } catch {}
    }

    if (list.length === 0) {
      return defaults;
    }

    // Merge: Firestore episodes override default ones with same season + episodeNumber
    const map = new Map<string, Episode>();
    for (const d of defaults) {
      const key = `s${d.seasonNumber || d.season || 1}-e${d.episodeNumber}`;
      map.set(key, d);
    }
    for (const ep of list) {
      const key = `s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`;
      map.set(key, ep);
    }
    return Array.from(map.values()).map(sanitizeEpisodeStreamUrls).sort((a, b) => {
      const sA = a.seasonNumber || a.season || 1;
      const sB = b.seasonNumber || b.season || 1;
      if (sA !== sB) return sA - sB;
      return a.episodeNumber - b.episodeNumber;
    });
  } catch (err) {
    console.warn(`Failed to get published episodes for anime ${animeId}, checking default catalog:`, err);
    return defaults;
  }
}

export async function getAllEpisodesByAnimeId(animeId?: string): Promise<Episode[]> {
  if (animeId && isAnimeDeleted(animeId)) return [];
  try {
    let list: Episode[] = [];
    if (animeId) {
      const targetIds = new Set<string>([animeId]);
      try {
        const anime = await getAnimeById(animeId);
        if (anime) {
          if (anime.id) targetIds.add(anime.id);
          if (anime.slug) targetIds.add(anime.slug);
        }
      } catch {}
      const idList = Array.from(targetIds);

      try {
        const q = query(
          collection(db, EPISODES_COLLECTION),
          where('animeId', 'in', idList.slice(0, 10))
        );
        const snapshot = await getDocs(q);
        list = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Episode, 'id'>),
          }))
          .filter((ep) => !isAnimeDeleted(ep.animeId));
      } catch {
        const q = query(
          collection(db, EPISODES_COLLECTION),
          where('animeId', '==', animeId)
        );
        const snapshot = await getDocs(q);
        list = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Episode, 'id'>),
          }))
          .filter((ep) => !isAnimeDeleted(ep.animeId));
      }

      const defaults = generateFallbackEpisodes(animeId);
      if (list.length === 0) return defaults;
      const map = new Map<string, Episode>();
      for (const d of defaults) {
        map.set(`s${d.seasonNumber || d.season || 1}-e${d.episodeNumber}`, d);
      }
      for (const ep of list) {
        map.set(`s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`, ep);
      }
      return Array.from(map.values()).map(sanitizeEpisodeStreamUrls).sort((a, b) => {
        const sA = a.seasonNumber || a.season || 1;
        const sB = b.seasonNumber || b.season || 1;
        if (sA !== sB) return sA - sB;
        return a.episodeNumber - b.episodeNumber;
      });
    }

    // If no animeId specified, combine all Firestore and default catalog episodes
    const snapshot = await withTimeout(getDocs(collection(db, EPISODES_COLLECTION)), 1800, null);
      if (!snapshot) throw new Error('Timeout fetching fallback episodes');
    list = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Episode, 'id'>),
      }))
      .filter((ep) => !isAnimeDeleted(ep.animeId));

    const map = new Map<string, Episode>();
    for (const [aId, epList] of Object.entries(DEFAULT_EPISODES)) {
      if (isAnimeDeleted(aId)) continue;
      for (const ep of epList) {
        map.set(`${ep.animeId}-s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`, ep);
      }
    }
    for (const ep of list) {
      map.set(`${ep.animeId}-s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`, ep);
    }
    return Array.from(map.values()).map(sanitizeEpisodeStreamUrls).sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return a.episodeNumber - b.episodeNumber;
    });
  } catch (err) {
    console.warn('Failed to get all episodes:', err);
    if (animeId) {
      return generateFallbackEpisodes(animeId);
    }
    const allDefaults: Episode[] = [];
    for (const [aId, epList] of Object.entries(DEFAULT_EPISODES)) {
      if (isAnimeDeleted(aId)) continue;
      allDefaults.push(...epList.map(sanitizeEpisodeStreamUrls));
    }
    return allDefaults;
  }
}

export async function getEpisodeById(id: string): Promise<Episode | null> {
  if (!id) return null;
  // 1. Quick check default catalog first
  for (const [, epList] of Object.entries(DEFAULT_EPISODES)) {
    const match = epList.find((e) => e.id === id);
    if (match) return sanitizeEpisodeStreamUrls(match);
  }

  try {
    const docRef = doc(db, EPISODES_COLLECTION, id);
    const docSnap = await withTimeout(getDoc(docRef), 1800, null);
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data() as Episode;
      if (isAnimeDeleted(data.animeId)) return null;
      return sanitizeEpisodeStreamUrls({
        id: docSnap.id,
        ...data,
      });
    }
    return null;
  } catch (err) {
    console.warn(`Failed to get episode by id ${id}:`, err);
    return null;
  }
}

export async function getEpisodeByAnimeAndNumber(animeId: string, episodeNumber: number): Promise<Episode | null> {
  if (!animeId || isNaN(episodeNumber)) return null;

  // 1. Quick check default catalog first
  const fallbacks = generateFallbackEpisodes(animeId);
  const defaultMatch = fallbacks.find((e) => Number(e.episodeNumber) === Number(episodeNumber));

  try {
    const targetIds = new Set<string>([animeId]);
    try {
      const anime = await getAnimeById(animeId);
      if (anime) {
        if (anime.id) targetIds.add(anime.id);
        if (anime.slug) targetIds.add(anime.slug);
      }
    } catch {}

    const idList = Array.from(targetIds);
    try {
      const q = query(
        collection(db, EPISODES_COLLECTION),
        where('animeId', 'in', idList.slice(0, 10)),
        where('episodeNumber', '==', episodeNumber)
      );
      const snapshot = await withTimeout(getDocs(q), 1800, null);
      if (snapshot && !snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        return sanitizeEpisodeStreamUrls({
          id: firstDoc.id,
          ...defaultMatch,
          ...(firstDoc.data() as Omit<Episode, 'id'>),
        });
      }
    } catch {
      try {
        const q = query(
          collection(db, EPISODES_COLLECTION),
          where('animeId', '==', animeId),
          where('episodeNumber', '==', episodeNumber)
        );
        const snapshot = await withTimeout(getDocs(q), 1500, null);
        if (snapshot && !snapshot.empty) {
          const firstDoc = snapshot.docs[0];
          return sanitizeEpisodeStreamUrls({
            id: firstDoc.id,
            ...defaultMatch,
            ...(firstDoc.data() as Omit<Episode, 'id'>),
          });
        }
      } catch {}
    }

    return defaultMatch ? sanitizeEpisodeStreamUrls(defaultMatch) : null;
  } catch (err) {
    console.warn(`Failed to get episode by anime ${animeId} and number ${episodeNumber}:`, err);
    return defaultMatch ? sanitizeEpisodeStreamUrls(defaultMatch) : null;
  }
}

export interface LatestEpisodeItem {
  episode: Episode;
  animeTitle: string;
  animeSlug: string;
  animePoster: string;
  animeBanner?: string;
}

export async function getLatestReleasedEpisodes(limitCount: number = 12): Promise<LatestEpisodeItem[]> {
  try {
    let firestoreEpisodes: Episode[] = [];
    try {
      const q = query(
        collection(db, EPISODES_COLLECTION),
        where('published', '==', true)
      );
      const snapshot = await withTimeout(getDocs(q), 1800, null);
      if (snapshot && !snapshot.empty) {
        firestoreEpisodes = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Episode, 'id'>),
          }))
          .filter((ep) => ep.published !== false && !isAnimeDeleted(ep.animeId));
      }
    } catch (qErr) {
      console.warn('Failed query published episodes, falling back to all docs:', qErr);
      try {
        const snapshot = await withTimeout(getDocs(collection(db, EPISODES_COLLECTION)), 1500, null);
        if (snapshot && !snapshot.empty) {
          firestoreEpisodes = snapshot.docs
            .map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Episode, 'id'>),
            }))
            .filter((ep) => ep.published !== false && !isAnimeDeleted(ep.animeId));
        }
      } catch {}
    }

    // Flatten default episodes
    const defaultEpisodes: Episode[] = [];
    for (const [animeId, epList] of Object.entries(DEFAULT_EPISODES)) {
      if (isAnimeDeleted(animeId)) continue;
      defaultEpisodes.push(...epList);
    }

    // Merge episodes with season-aware key (guarantee no duplicates)
    const epMap = new Map<string, Episode>();
    for (const ep of defaultEpisodes) {
      if (isAnimeDeleted(ep.animeId) || ep.status === 'upcoming' || ep.isUpcoming) continue;
      const key = `${ep.animeId}-s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`;
      epMap.set(key, ep);
    }
    for (const ep of firestoreEpisodes) {
      if (isAnimeDeleted(ep.animeId) || ep.status === 'upcoming' || ep.isUpcoming) continue;
      const naturalKey = `${ep.animeId}-s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`;
      // Firestore episode overrides default cleanly with the exact same naturalKey
      epMap.set(naturalKey, ep);
    }

    const allEpisodes = Array.from(epMap.values());

    // Helper to get reliable timestamp for sorting latest episodes (newest first)
    const getEpTimestamp = (ep: Episode): number => {
      if (ep.createdAt) {
        if (typeof (ep.createdAt as any).toMillis === 'function') {
          return (ep.createdAt as any).toMillis();
        }
        if (typeof (ep.createdAt as any).toDate === 'function') {
          return (ep.createdAt as any).toDate().getTime();
        }
        if (ep.createdAt instanceof Date) return ep.createdAt.getTime();
        if (typeof ep.createdAt === 'number') return ep.createdAt;
        const parsed = new Date(ep.createdAt).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (ep.updatedAt) {
        if (typeof (ep.updatedAt as any).toMillis === 'function') {
          return (ep.updatedAt as any).toMillis();
        }
        if (typeof (ep.updatedAt as any).toDate === 'function') {
          return (ep.updatedAt as any).toDate().getTime();
        }
        if (ep.updatedAt instanceof Date) return ep.updatedAt.getTime();
        if (typeof ep.updatedAt === 'number') return ep.updatedAt;
        const parsed = new Date(ep.updatedAt).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (ep.releaseDate) {
        const parsed = new Date(ep.releaseDate).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      return 1000;
    };

    // Sort by latest timestamp descending (newest episodes first!)
    allEpisodes.sort((a, b) => {
      const timeA = getEpTimestamp(a);
      const timeB = getEpTimestamp(b);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return b.episodeNumber - a.episodeNumber;
    });

    // Pre-cache anime metadata lookup
    const animeLookup = new Map<string, { title: string; slug: string; poster: string; banner: string }>();
    try {
      const allAnimes = await getPublishedAnimes();
      for (const a of allAnimes) {
        const bannerImg = a.banner || (a as any).bannerUrl || a.poster || '';
        const data = {
          title: a.title,
          slug: a.slug || a.id,
          poster: a.poster || bannerImg,
          banner: bannerImg,
        };
        if (a.id) animeLookup.set(a.id, data);
        if (a.slug) animeLookup.set(a.slug, data);
      }
    } catch (err) {
      console.warn('Failed to pre-fetch anime lookup for latest episodes:', err);
    }

    for (const a of DEFAULT_ANIMES) {
      const bannerImg = a.banner || a.poster || '';
      const data = {
        title: a.title,
        slug: a.slug || a.id,
        poster: a.poster || bannerImg,
        banner: bannerImg,
      };
      if (a.id && !animeLookup.has(a.id)) animeLookup.set(a.id, data);
      if (a.slug && !animeLookup.has(a.slug)) animeLookup.set(a.slug, data);
    }

    const result: LatestEpisodeItem[] = [];
    const seenAnimeKeys = new Set<string>();

    for (const ep of allEpisodes) {
      if (result.length >= limitCount) break;

      let animeInfo = animeLookup.get(ep.animeId);
      if (!animeInfo && (ep as any).animeSlug) {
        animeInfo = animeLookup.get((ep as any).animeSlug);
      }

      if (!animeInfo) {
        try {
          const anime = await getAnimeById(ep.animeId);
          if (anime) {
            const bannerImg = anime.banner || (anime as any).bannerUrl || anime.poster || '';
            animeInfo = {
              title: anime.title,
              slug: anime.slug || anime.id || ep.animeId,
              poster: anime.poster || bannerImg,
              banner: bannerImg,
            };
            if (anime.id) animeLookup.set(anime.id, animeInfo);
            if (anime.slug) animeLookup.set(anime.slug, animeInfo);
          }
        } catch {}
      }

      const dedupeKey = animeInfo?.slug || animeInfo?.title || (ep as any).animeSlug || ep.animeId;
      if (dedupeKey && seenAnimeKeys.has(dedupeKey)) {
        continue; // Prevent adding the same anime multiple times
      }
      if (dedupeKey) seenAnimeKeys.add(dedupeKey);

      if (animeInfo) {
        const episodeBanner = animeInfo.banner || animeInfo.poster || ep.thumbnail || '';
        result.push({
          episode: {
            ...ep,
            thumbnail: episodeBanner,
          },
          animeTitle: animeInfo.title,
          animeSlug: animeInfo.slug,
          animePoster: animeInfo.poster || episodeBanner,
          animeBanner: episodeBanner,
        });
      } else {
        result.push({
          episode: ep,
          animeTitle: (ep as any).animeTitle || ep.title || 'Anime Series',
          animeSlug: (ep as any).animeSlug || ep.animeId,
          animePoster: ep.thumbnail || '',
          animeBanner: ep.thumbnail || '',
        });
      }
    }

    return result;
  } catch (err) {
    console.error('Failed to get latest released episodes:', err);
    return [];
  }
}

export async function incrementEpisodeViews(id: string): Promise<void> {
  try {
    const docRef = doc(db, EPISODES_COLLECTION, id);
    await updateDoc(docRef, {
      viewsCount: increment(1),
    });
  } catch (err) {
    console.warn('Failed to increment episode views:', err);
  }
}

export async function createEpisode(data: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  let thumbnail = data.thumbnail;
  if (!thumbnail && data.animeId) {
    const anime = await getAnimeById(data.animeId).catch(() => null);
    if (anime) thumbnail = anime.banner || (anime as any).bannerUrl || anime.poster || '';
  }
  const cleaned = sanitizeData({
    ...data,
    thumbnail: thumbnail || data.thumbnail || '',
  });
  const fallbackId = `ep-${data.animeId || 'custom'}-s${data.seasonNumber || data.season || 1}-e${data.episodeNumber}-${Date.now()}`;

  try {
    const docRef = await addDoc(collection(db, EPISODES_COLLECTION), {
      ...cleaned,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    saveLocalStoredEpisode({
      id: docRef.id,
      ...cleaned,
      viewsCount: 0,
      published: data.published !== false,
    } as Episode);

    // Notify anime followers if episode is published
    if (data.published !== false && data.animeId) {
      getAnimeById(data.animeId).then((anime) => {
        if (anime) {
          notifyFollowersNewEpisode({
            animeId: data.animeId,
            animeTitle: anime.title,
            animeSlug: anime.slug,
            episodeNumber: data.episodeNumber,
            episodeTitle: data.title,
          }).catch((err) => console.warn('Failed to dispatch follower alerts:', err));
        }
      }).catch((e) => console.warn('Failed to load anime for follower alert:', e));
    }

    return docRef.id;
  } catch (err: any) {
    console.warn('Firestore createEpisode encountered an error, saving to local storage fallback:', err);
    const localEp: Episode = {
      id: fallbackId,
      ...cleaned,
      viewsCount: 0,
      published: data.published !== false,
    } as Episode;
    saveLocalStoredEpisode(localEp);
    return fallbackId;
  }
}

export async function updateEpisode(id: string, data: Partial<Episode>): Promise<void> {
  const cleaned = sanitizeData(data);
  saveLocalStoredEpisode({ id, ...cleaned } as Episode);

  try {
    const docRef = doc(db, EPISODES_COLLECTION, id);

    // If updating a default catalog episode that was not yet persisted to Firestore, include base metadata
    const baseData: Record<string, any> = {};
    for (const [, epList] of Object.entries(DEFAULT_EPISODES)) {
      const match = epList.find((e) => e.id === id);
      if (match) {
        Object.assign(baseData, match);
        break;
      }
    }

    await setDoc(
      docRef,
      {
        ...baseData,
        ...cleaned,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn(`Firestore updateEpisode ${id} error, preserved in local storage:`, err);
  }
}

export async function deleteEpisode(id: string): Promise<void> {
  try {
    const docRef = doc(db, EPISODES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete episode ${id}:`, err);
    throw err;
  }
}

export interface BulkEpisodeItemInput {
  episodeNumber: number;
  title?: string;
  seasonNumber?: number;
  season?: number;
  language?: string;
  quality?: string;
  duration?: string;
  published?: boolean;
  videoUrl?: string;
  defaultCategory?: 'sub' | 'dub';
  sources?: any[];
  videoSources?: any[];
  downloadUrl?: string;
  downloadQuality?: string;
  downloadSize?: string;
  downloadLinks?: {
    quality: string;
    url: string;
    size?: string;
    host?: string;
  }[];
}

export async function bulkCreateEpisodes(
  animeId: string,
  episodes: BulkEpisodeItemInput[],
  options?: {
    overwriteExisting?: boolean;
    updateAnimeStats?: boolean;
    animeTitle?: string;
    animeSlug?: string;
    animePoster?: string;
    animeBanner?: string;
  }
): Promise<{ added: number; updated: number; failed: number }> {
  if (!animeId || !episodes || episodes.length === 0) {
    return { added: 0, updated: 0, failed: 0 };
  }

  try {
    let fallbackBanner = options?.animeBanner || options?.animePoster || '';
    if (!fallbackBanner && animeId) {
      try {
        const a = await getAnimeById(animeId);
        if (a) fallbackBanner = a.banner || (a as any).bannerUrl || a.poster || '';
      } catch {}
    }

    // 1. Fetch existing episodes for this anime to see which ones already exist
    const existingSnap = await getDocs(
      query(collection(db, EPISODES_COLLECTION), where('animeId', '==', animeId))
    );
    const existingMap = new Map<string, string>(); // composite key (season_episode) -> docId
    existingSnap.forEach((d) => {
      const data = d.data() as Episode;
      if (typeof data.episodeNumber === 'number') {
        const sNum = data.seasonNumber || data.season || 1;
        existingMap.set(`${sNum}_${data.episodeNumber}`, d.id);
        existingMap.set(`single_${data.episodeNumber}`, d.id);
      }
    });

    let addedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Chunk in batches of 400 (Firestore max operations per batch is 500)
    const BATCH_SIZE = 400;
    for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
      const chunk = episodes.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        try {
          const sNum = item.seasonNumber || item.season || 1;
          const key = `${sNum}_${item.episodeNumber}`;
          const singleKey = `single_${item.episodeNumber}`;
          const existingDocId = existingMap.get(key) || existingMap.get(singleKey);

          const episodePayload: Record<string, any> = {
            animeId,
            animeTitle: options?.animeTitle || '',
            animeSlug: options?.animeSlug || '',
            season: sNum,
            seasonNumber: sNum,
            episodeNumber: item.episodeNumber,
            title: item.title || `Episode ${item.episodeNumber}`,
            thumbnail: (item as any).thumbnail || fallbackBanner,
            language: item.language || 'DUB',
            quality: item.quality || '1080p',
            duration: item.duration || '24m',
            published: item.published !== false,
            updatedAt: serverTimestamp(),
          };

          if (item.videoUrl) {
            episodePayload.videoUrl = item.videoUrl;
          }
          if (item.sources && item.sources.length > 0) {
            episodePayload.sources = item.sources;
            episodePayload.videoSources = item.sources;
          } else if (item.videoUrl) {
            const defaultSrc = {
              id: 'srv-1',
              name: 'Server 1',
              provider: 'Server 1',
              sourceName: 'Server 1',
              type: 'embed',
              embedUrl: item.videoUrl,
              category: item.defaultCategory || 'dub',
              quality: item.quality || '1080p',
              priority: 1,
              active: true,
              isDefault: true,
            };
            episodePayload.sources = [defaultSrc];
            episodePayload.videoSources = [defaultSrc];
          }

          if (item.downloadUrl) {
            episodePayload.downloadUrl = item.downloadUrl;
          }
          if (item.downloadLinks && item.downloadLinks.length > 0) {
            episodePayload.downloadLinks = item.downloadLinks;
          }

          const cleanedPayload = sanitizeData(episodePayload);

          if (existingDocId) {
            if (options?.overwriteExisting !== false) {
              const docRef = doc(db, EPISODES_COLLECTION, existingDocId);
              batch.set(docRef, cleanedPayload, { merge: true });
              updatedCount++;
            }
          } else {
            const newDocRef = doc(collection(db, EPISODES_COLLECTION));
            batch.set(newDocRef, {
              ...cleanedPayload,
              viewsCount: 0,
              createdAt: serverTimestamp(),
            });
            addedCount++;
          }
        } catch (itemErr) {
          console.error('Error preparing bulk episode item:', itemErr);
          failedCount++;
        }
      }

      await batch.commit();
    }

    // Optionally update Anime's total/released episodes count
    if (options?.updateAnimeStats !== false && episodes.length > 0) {
      try {
        const animeDocRef = doc(db, 'anime', animeId);
        const animeSnap = await getDoc(animeDocRef);
        if (animeSnap.exists()) {
          const currentData = animeSnap.data();
          const maxEpInBatch = Math.max(...episodes.map((e) => e.episodeNumber));
          const currentReleased = currentData.releasedEpisodes || 0;
          if (maxEpInBatch > currentReleased) {
            await updateDoc(animeDocRef, {
              releasedEpisodes: maxEpInBatch,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (animeErr) {
        console.warn('Failed to update anime releasedEpisodes count during bulk add:', animeErr);
      }
    }

    return { added: addedCount, updated: updatedCount, failed: failedCount };
  } catch (err) {
    console.error('bulkCreateEpisodes failed:', err);
    throw err;
  }
}

