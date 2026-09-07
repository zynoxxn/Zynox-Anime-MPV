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
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Episode } from '../../types/episode';
import type { Anime } from '../../types/anime';
import { getAnimeById, getPublishedAnimes, isAnimeDeleted } from './anime';
import { notifyFollowersNewEpisode } from './follows';
import { DEFAULT_EPISODES, DEFAULT_ANIMES } from '../../data/defaultCatalog';

const EPISODES_COLLECTION = 'episodes';

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
  if (isAnimeDeleted(animeId)) return [];
  if (DEFAULT_EPISODES[animeId]) {
    return DEFAULT_EPISODES[animeId].map(sanitizeEpisodeStreamUrls);
  }
  // Try matching by checking DEFAULT_ANIMES by slug or ID
  const matchedAnime = DEFAULT_ANIMES.find((a) => (a.id === animeId || a.slug === animeId) && !isAnimeDeleted(a.id) && (!a.slug || !isAnimeDeleted(a.slug)));
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
  if (isAnimeDeleted(animeId)) return [];
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
      const snapshot = await getDocs(q);
      list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Episode, 'id'>),
      }));
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
        .filter((ep) => ep.published !== false);
    }

    const defaults = generateFallbackEpisodes(animeId);
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
    return generateFallbackEpisodes(animeId);
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
    const snapshot = await getDocs(collection(db, EPISODES_COLLECTION));
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
  try {
    const docRef = doc(db, EPISODES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Episode;
      if (isAnimeDeleted(data.animeId)) return null;
      return sanitizeEpisodeStreamUrls({
        id: docSnap.id,
        ...data,
      });
    }
    // Search default catalog
    for (const [aId, epList] of Object.entries(DEFAULT_EPISODES)) {
      if (isAnimeDeleted(aId)) continue;
      const match = epList.find((e) => e.id === id);
      if (match) return sanitizeEpisodeStreamUrls(match);
    }
    return null;
  } catch (err) {
    console.warn(`Failed to get episode by id ${id}:`, err);
    for (const [aId, epList] of Object.entries(DEFAULT_EPISODES)) {
      if (isAnimeDeleted(aId)) continue;
      const match = epList.find((e) => e.id === id);
      if (match) return sanitizeEpisodeStreamUrls(match);
    }
    return null;
  }
}

export async function getEpisodeByAnimeAndNumber(animeId: string, episodeNumber: number): Promise<Episode | null> {
  if (isAnimeDeleted(animeId)) return null;
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
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        return sanitizeEpisodeStreamUrls({
          id: firstDoc.id,
          ...(firstDoc.data() as Omit<Episode, 'id'>),
        });
      }
    } catch {
      const q = query(
        collection(db, EPISODES_COLLECTION),
        where('animeId', '==', animeId),
        where('episodeNumber', '==', episodeNumber)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        return sanitizeEpisodeStreamUrls({
          id: firstDoc.id,
          ...(firstDoc.data() as Omit<Episode, 'id'>),
        });
      }
    }

    const fallbacks = generateFallbackEpisodes(animeId);
    const matched = fallbacks.find((e) => e.episodeNumber === episodeNumber);
    return matched ? sanitizeEpisodeStreamUrls(matched) : null;
  } catch (err) {
    console.warn(`Failed to get episode by anime ${animeId} and number ${episodeNumber}:`, err);
    const fallbacks = generateFallbackEpisodes(animeId);
    const matched = fallbacks.find((e) => e.episodeNumber === episodeNumber);
    return matched ? sanitizeEpisodeStreamUrls(matched) : null;
  }
}

export interface LatestEpisodeItem {
  episode: Episode;
  animeTitle: string;
  animeSlug: string;
  animePoster: string;
}

export async function getLatestReleasedEpisodes(limitCount: number = 12): Promise<LatestEpisodeItem[]> {
  try {
    let firestoreEpisodes: Episode[] = [];
    try {
      const q = query(
        collection(db, EPISODES_COLLECTION),
        where('published', '==', true)
      );
      const snapshot = await getDocs(q);
      firestoreEpisodes = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Episode, 'id'>),
        }))
        .filter((ep) => ep.published !== false && !isAnimeDeleted(ep.animeId));
    } catch (qErr) {
      console.warn('Failed query published episodes, falling back to all docs:', qErr);
      const snapshot = await getDocs(collection(db, EPISODES_COLLECTION));
      firestoreEpisodes = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Episode, 'id'>),
        }))
        .filter((ep) => ep.published !== false && !isAnimeDeleted(ep.animeId));
    }

    // Flatten default episodes
    const defaultEpisodes: Episode[] = [];
    for (const [animeId, epList] of Object.entries(DEFAULT_EPISODES)) {
      if (isAnimeDeleted(animeId)) continue;
      defaultEpisodes.push(...epList);
    }

    // Merge episodes with season-aware key
    const epMap = new Map<string, Episode>();
    for (const ep of defaultEpisodes) {
      if (isAnimeDeleted(ep.animeId)) continue;
      const key = `${ep.animeId}-s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`;
      epMap.set(key, ep);
    }
    for (const ep of firestoreEpisodes) {
      if (isAnimeDeleted(ep.animeId)) continue;
      const naturalKey = `${ep.animeId}-s${ep.seasonNumber || ep.season || 1}-e${ep.episodeNumber}`;
      // Remove any matching default key so Firestore episode cleanly overrides
      epMap.delete(naturalKey);
      const uniqueKey = ep.id || naturalKey;
      epMap.set(uniqueKey, ep);
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
    const animeLookup = new Map<string, { title: string; slug: string; poster: string }>();
    try {
      const allAnimes = await getPublishedAnimes();
      for (const a of allAnimes) {
        const data = {
          title: a.title,
          slug: a.slug || a.id,
          poster: a.poster || a.banner || '',
        };
        if (a.id) animeLookup.set(a.id, data);
        if (a.slug) animeLookup.set(a.slug, data);
      }
    } catch (err) {
      console.warn('Failed to pre-fetch anime lookup for latest episodes:', err);
    }

    for (const a of DEFAULT_ANIMES) {
      const data = {
        title: a.title,
        slug: a.slug || a.id,
        poster: a.poster || a.banner || '',
      };
      if (a.id && !animeLookup.has(a.id)) animeLookup.set(a.id, data);
      if (a.slug && !animeLookup.has(a.slug)) animeLookup.set(a.slug, data);
    }

    const result: LatestEpisodeItem[] = [];

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
            animeInfo = {
              title: anime.title,
              slug: anime.slug || anime.id || ep.animeId,
              poster: anime.poster || anime.banner || '',
            };
            if (anime.id) animeLookup.set(anime.id, animeInfo);
            if (anime.slug) animeLookup.set(anime.slug, animeInfo);
          }
        } catch {}
      }

      if (animeInfo) {
        result.push({
          episode: ep,
          animeTitle: animeInfo.title,
          animeSlug: animeInfo.slug,
          animePoster: ep.thumbnail || animeInfo.poster,
        });
      } else {
        result.push({
          episode: ep,
          animeTitle: (ep as any).animeTitle || ep.title || 'Anime Series',
          animeSlug: (ep as any).animeSlug || ep.animeId,
          animePoster: ep.thumbnail || '',
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
  try {
    const cleaned = sanitizeData(data);
    const docRef = await addDoc(collection(db, EPISODES_COLLECTION), {
      ...cleaned,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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
  } catch (err) {
    console.error('Failed to create episode:', err);
    throw err;
  }
}

export async function updateEpisode(id: string, data: Partial<Episode>): Promise<void> {
  try {
    const cleaned = sanitizeData(data);
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
    console.error(`Failed to update episode ${id}:`, err);
    throw err;
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
