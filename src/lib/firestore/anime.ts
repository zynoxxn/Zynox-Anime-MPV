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
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Anime, AnimeStatus, AnimeType } from '../../types/anime';
import { DEFAULT_ANIMES } from '../../data/defaultCatalog';
import { deleteHeroBannersForAnime } from './cms';
import { withTimeout, getStoredCache, setStoredCache } from './fast-cache';

const ANIME_COLLECTION = 'anime';
const DELETED_IDS_STORAGE_KEY = 'zynox_deleted_anime_ids';
const DELETED_ANIMES_DOC = 'deleted_anime_ids';

let memoryPublishedAnimes: Anime[] | null = null;
let inFlightPublishedPromise: Promise<Anime[]> | null = null;

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

export function cleanAnimeTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[\(\[]\s*upcoming(?:\s+show)?\s*[\)\]]/gi, '')
    .replace(/\s*-\s*upcoming(?:\s+show)?\s*$/gi, '')
    .replace(/\s+upcoming(?:\s+show)?\s*$/gi, '')
    .trim();
}

const OLD_REMOVED_ANIME_IDS = new Set<string>();

let cachedDeletedIds: Set<string> | null = null;

export function deleteLocalStoredAnime(idOrSlug: string): void {
  if (typeof localStorage === 'undefined' || !idOrSlug) return;
  try {
    const raw = localStorage.getItem(LOCAL_ANIMES_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      const lower = idOrSlug.toLowerCase();
      const filtered = list.filter(
        (a: any) =>
          a.id !== idOrSlug &&
          a.slug !== idOrSlug &&
          a.id?.toLowerCase() !== lower &&
          a.slug?.toLowerCase() !== lower
      );
      localStorage.setItem(LOCAL_ANIMES_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

// Initial immediate cleanup of local storage for deleted items (e.g. dandadan)
try {
  if (typeof localStorage !== 'undefined') {
    ['zynox_watch_progress', 'zynox_watch_history', 'zynox_watchlist', 'zynox_favorites'].forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((item: any) =>
              !OLD_REMOVED_ANIME_IDS.has(item.animeId) &&
              !OLD_REMOVED_ANIME_IDS.has(item.animeSlug) &&
              !OLD_REMOVED_ANIME_IDS.has(item.id)
            );
            if (filtered.length !== parsed.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          }
        } catch {}
      }
    });
  }
} catch {}

export function undeleteAnime(idOrSlug: string): void {
  if (!idOrSlug) return;
  OLD_REMOVED_ANIME_IDS.delete(idOrSlug);
  const set = getLocalDeletedAnimeIds();
  set.delete(idOrSlug);
  set.delete(idOrSlug.toLowerCase());
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((x: string) => x !== idOrSlug && x !== idOrSlug.toLowerCase());
          localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    }
  } catch {}
}

export function getLocalDeletedAnimeIds(): Set<string> {
  if (!cachedDeletedIds) {
    cachedDeletedIds = new Set<string>(OLD_REMOVED_ANIME_IDS);
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DELETED_IDS_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (id) {
              cachedDeletedIds!.add(id);
              cachedDeletedIds!.add(id.toLowerCase());
            }
          });
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  return cachedDeletedIds;
}

export async function fetchDeletedAnimeIds(): Promise<Set<string>> {
  const set = getLocalDeletedAnimeIds();
  try {
    const docRef = doc(db, 'siteSettings', DELETED_ANIMES_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.ids)) {
        data.ids.forEach((id: string) => {
          if (id) {
            set.add(id);
            set.add(id.toLowerCase());
          }
        });
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
          }
        } catch {}
      }
    }
  } catch (err) {
    // Non-blocking
  }
  return set;
}

export function isAnimeDeleted(idOrSlug?: string | null): boolean {
  if (!idOrSlug) return false;
  const clean = idOrSlug.toLowerCase().trim();
  const set = getLocalDeletedAnimeIds();
  return set.has(idOrSlug) || set.has(clean);
}

const LOCAL_ANIMES_KEY = 'zynox_local_admin_animes';

export function getLocalStoredAnimes(): Anime[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ANIMES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalStoredAnime(anime: Anime): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getLocalStoredAnimes();
    const idx = list.findIndex(
      (a) => (anime.id && a.id === anime.id) || (anime.slug && a.slug === anime.slug)
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...anime };
    } else {
      list.unshift(anime);
    }
    localStorage.setItem(LOCAL_ANIMES_KEY, JSON.stringify(list));
    memoryPublishedAnimes = null;
  } catch (e) {
    console.warn('Failed to save anime to local storage:', e);
  }
}

function mergeWithDefaultAnimes(firestoreList: Anime[], publishedOnly: boolean = true): Anime[] {
  const result: Anime[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  // 0. Include locally saved admin animes (resilient against database deletion)
  const localList = getLocalStoredAnimes();
  for (const localItem of localList) {
    if ((localItem as any).isDeleted === true) continue;
    if (publishedOnly && localItem.published === false) continue;
    const id = localItem.id || localItem.slug;
    const slug = localItem.slug || localItem.id;
    if (!id) continue;
    if (seenIds.has(id) || (slug && seenSlugs.has(slug))) continue;
    seenIds.add(id);
    if (slug) seenSlugs.add(slug);
    result.push(localItem);
  }

  // 1. Overlay Firestore documents first (they take precedence)
  for (const fsItem of firestoreList) {
    if ((fsItem as any).isDeleted === true) continue;
    if (publishedOnly && fsItem.published === false) {
      continue;
    }

    const id = fsItem.id || fsItem.slug;
    const slug = fsItem.slug || fsItem.id;
    if (!id) continue;

    if (slug) undeleteAnime(slug);
    undeleteAnime(id);

    if (seenIds.has(id) || (slug && seenSlugs.has(slug))) {
      continue;
    }

    seenIds.add(id);
    if (slug) seenSlugs.add(slug);

    // Merge with any matching default catalog anime so full fields are preserved if Firestore doc was a partial update
    const matchingDef = DEFAULT_ANIMES.find(
      (d) => d.id === id || d.slug === slug || (fsItem.slug && d.slug === fsItem.slug)
    );

    if (matchingDef) {
      if (matchingDef.id) seenIds.add(matchingDef.id);
      if (matchingDef.slug) seenSlugs.add(matchingDef.slug);
    }

    const poster = (fsItem as any).posterUrl || (fsItem as any).poster || matchingDef?.poster || '';
    const banner = (fsItem as any).bannerUrl || (fsItem as any).banner || matchingDef?.banner;

    const mergedItem: Anime = matchingDef
      ? { ...matchingDef, ...fsItem, id, slug, poster, posterUrl: poster, banner, bannerUrl: banner }
      : { ...fsItem, id, slug, poster, posterUrl: poster, banner, bannerUrl: banner };

    result.push(mergedItem);
  }

  // 2. Add default catalog animes that haven't been overridden, duplicated, or deleted
  for (const def of DEFAULT_ANIMES) {
    if (publishedOnly && def.published === false) continue;
    if (isAnimeDeleted(def.id) || (def.slug && isAnimeDeleted(def.slug))) {
      continue;
    }
    
    if (seenIds.has(def.id) || (def.slug && seenSlugs.has(def.slug))) {
      continue;
    }

    seenIds.add(def.id);
    if (def.slug) seenSlugs.add(def.slug);
    result.push(def);
  }

  return result;
}

export function getCachedPublishedAnimes(): Anime[] {
  if (memoryPublishedAnimes) {
    return memoryPublishedAnimes;
  }
  const fromStorage = getStoredCache<Anime[]>('published_animes', []);
  if (fromStorage && Array.isArray(fromStorage)) {
    const valid = fromStorage.filter((a) => a && (a.id || a.slug) && a.title && !isAnimeDeleted(a.id) && (!a.slug || !isAnimeDeleted(a.slug)));
    if (valid.length > 0 || fromStorage.length > 0) {
      memoryPublishedAnimes = valid;
      return valid;
    }
  }
  const defaults = DEFAULT_ANIMES.filter(
    (a) => a.published !== false && !isAnimeDeleted(a.id) && (!a.slug || !isAnimeDeleted(a.slug))
  );
  memoryPublishedAnimes = defaults;
  return defaults;
}

export async function getPublishedAnimes(forceFresh: boolean = false): Promise<Anime[]> {
  if (inFlightPublishedPromise) {
    return inFlightPublishedPromise;
  }

  inFlightPublishedPromise = (async () => {
    try {
      // 1. Fetch deleted IDs with quick 1000ms timeout
      await withTimeout(fetchDeletedAnimeIds(), 1000, new Set<string>());

      // 2. Fetch published animes - checks 'anime', and falls back to 'Anime' / 'animes'
      const collectionNames = ['anime', 'Anime', 'animes'];
      const allDocs: any[] = [];
      const seenDocIds = new Set<string>();

      for (const coll of collectionNames) {
        try {
          const q = query(
            collection(db, coll),
            where('published', '==', true)
          );
          const snapshot = await withTimeout(getDocs(q), 1800, null);
          if (snapshot && !snapshot.empty) {
            for (const docSnap of snapshot.docs) {
              if (!seenDocIds.has(docSnap.id)) {
                seenDocIds.add(docSnap.id);
                allDocs.push(docSnap);
              }
            }
          }
        } catch {
          // ignore error per collection
        }
      }

      if (allDocs.length > 0) {
        const list: Anime[] = allDocs.map((docSnap) => ({
          ...(docSnap.data() as Omit<Anime, 'id'>),
          id: docSnap.id,
        }));

        const merged = mergeWithDefaultAnimes(list, true);
        merged.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          if (timeB !== timeA) return timeB - timeA;
          return (b.viewsCount || 0) - (a.viewsCount || 0);
        });
        const finalResult = merged;
        memoryPublishedAnimes = finalResult;
        setStoredCache('published_animes', finalResult);
        return finalResult;
      } else {
        const merged = mergeWithDefaultAnimes([], true);
        memoryPublishedAnimes = merged;
        setStoredCache('published_animes', merged);
        return merged;
      }
    } catch (err) {
      console.warn('Fast fallback for getPublishedAnimes:', err);
    }
    return getCachedPublishedAnimes();
  })().finally(() => {
    inFlightPublishedPromise = null;
  });

  return inFlightPublishedPromise;
}

export async function getAllAnimes(): Promise<Anime[]> {
  try {
    await withTimeout(fetchDeletedAnimeIds(), 1000, new Set<string>());
    const collectionNames = ['anime', 'Anime', 'animes'];
    const allDocs: any[] = [];
    const seenDocIds = new Set<string>();

    for (const coll of collectionNames) {
      try {
        const snapshot = await withTimeout(getDocs(collection(db, coll)), 1800, null);
        if (snapshot && !snapshot.empty) {
          for (const docSnap of snapshot.docs) {
            if (!seenDocIds.has(docSnap.id)) {
              seenDocIds.add(docSnap.id);
              allDocs.push(docSnap);
            }
          }
        }
      } catch {}
    }

    if (allDocs.length > 0) {
      const list: Anime[] = allDocs.map((docSnap) => ({
        ...(docSnap.data() as Omit<Anime, 'id'>),
        id: docSnap.id,
      }));

      const merged = mergeWithDefaultAnimes(list, false);
      return merged.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      });
    }
  } catch (err) {
    console.warn('Failed to get all animes from Firestore, using default catalog:', err);
  }
  return DEFAULT_ANIMES.filter((a) => !isAnimeDeleted(a.id) && (!a.slug || !isAnimeDeleted(a.slug)));
}

export async function getAnimeBySlug(rawSlug: string): Promise<Anime | null> {
  if (!rawSlug) return null;
  const slug = decodeURIComponent(rawSlug).trim();
  const lowerSlug = slug.toLowerCase();
  const slugified = lowerSlug.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  // 1. Instant check in local storage & memory (0ms latency, works offline)
  const localList = getLocalStoredAnimes();
  const localMatch = localList.find((a) => {
    if ((a as any).isDeleted === true) return false;
    const aSlug = a.slug?.trim()?.toLowerCase();
    const aId = a.id?.trim()?.toLowerCase();
    const aTitle = a.title?.trim()?.toLowerCase();
    return (
      a.slug === slug ||
      a.id === slug ||
      aSlug === lowerSlug ||
      aId === lowerSlug ||
      aTitle === lowerSlug ||
      (slugified && (aSlug === slugified || aId === slugified))
    );
  });

  if (localMatch) {
    const poster = (localMatch as any).posterUrl || localMatch.poster || '';
    const banner = (localMatch as any).bannerUrl || localMatch.banner;
    return {
      ...localMatch,
      published: localMatch.published !== false,
      poster,
      posterUrl: poster,
      banner,
      bannerUrl: banner,
    };
  }

  // 2. Check in memory/cached published animes
  const cachedList = getCachedPublishedAnimes();
  const cachedMatch = cachedList.find((a) => {
    if ((a as any).isDeleted === true) return false;
    const aSlug = a.slug?.trim()?.toLowerCase();
    const aId = a.id?.trim()?.toLowerCase();
    const aTitle = a.title?.trim()?.toLowerCase();
    return (
      a.slug === slug ||
      a.id === slug ||
      aSlug === lowerSlug ||
      aId === lowerSlug ||
      aTitle === lowerSlug ||
      (slugified && (aSlug === slugified || aId === slugified))
    );
  });

  if (cachedMatch) {
    return {
      ...cachedMatch,
      published: cachedMatch.published !== false,
    };
  }

  // 3. Check default catalog (if not explicitly deleted)
  const defaultMatch = DEFAULT_ANIMES.find((a) => {
    if (isAnimeDeleted(a.id) || (a.slug && isAnimeDeleted(a.slug))) return false;
    const aSlug = a.slug?.trim()?.toLowerCase();
    const aId = a.id?.trim()?.toLowerCase();
    const aTitle = a.title?.trim()?.toLowerCase();
    return (
      a.slug === slug ||
      a.id === slug ||
      aSlug === lowerSlug ||
      aId === lowerSlug ||
      aTitle === lowerSlug ||
      (slugified && (aSlug === slugified || aId === slugified))
    );
  });

  try {
    const collectionNames = ['anime', 'Anime', 'animes'];
    for (const coll of collectionNames) {
      // 3a. Check exact slug match in Firestore
      try {
        const q = query(collection(db, coll), where('slug', '==', slug));
        const snapshot = await withTimeout(getDocs(q), 2500, null);
        if (snapshot && !snapshot.empty) {
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as Anime;
            if (!(data as any).isDeleted) {
              const poster = (data as any).posterUrl || (data as any).poster || defaultMatch?.poster || '';
              const banner = (data as any).bannerUrl || (data as any).banner || defaultMatch?.banner;
              const result: Anime = {
                id: docSnap.id,
                ...defaultMatch,
                ...data,
                published: data.published !== false,
                poster,
                posterUrl: poster,
                banner,
                bannerUrl: banner,
              };
              saveLocalStoredAnime(result);
              return result;
            }
          }
        }
      } catch {}

      // 3b. Check lowercased slug match in Firestore
      if (lowerSlug !== slug) {
        try {
          const qLower = query(collection(db, coll), where('slug', '==', lowerSlug));
          const snapLower = await withTimeout(getDocs(qLower), 2000, null);
          if (snapLower && !snapLower.empty) {
            for (const docSnap of snapLower.docs) {
              const data = docSnap.data() as Anime;
              if (!(data as any).isDeleted) {
                const poster = (data as any).posterUrl || (data as any).poster || defaultMatch?.poster || '';
                const banner = (data as any).bannerUrl || (data as any).banner || defaultMatch?.banner;
                const result: Anime = {
                  id: docSnap.id,
                  ...defaultMatch,
                  ...data,
                  published: data.published !== false,
                  poster,
                  posterUrl: poster,
                  banner,
                  bannerUrl: banner,
                };
                saveLocalStoredAnime(result);
                return result;
              }
            }
          }
        } catch {}
      }

      // 3c. Check if slug was actually a Firestore doc ID
      try {
        const docRef = doc(db, coll, slug);
        const docSnap = await withTimeout(getDoc(docRef), 2000, null);
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data() as Anime;
          if (!(data as any).isDeleted) {
            const poster = (data as any).posterUrl || (data as any).poster || defaultMatch?.poster || '';
            const banner = (data as any).bannerUrl || (data as any).banner || defaultMatch?.banner;
            const result: Anime = {
              id: docSnap.id,
              ...defaultMatch,
              ...data,
              published: data.published !== false,
              poster,
              posterUrl: poster,
              banner,
              bannerUrl: banner,
            };
            saveLocalStoredAnime(result);
            return result;
          }
        }
      } catch {}
    }

    // 4. Scan in all published animes (fallback for custom slugs or docIds)
    const all = await withTimeout(getAllAnimes(), 2500, []);
    const match = all.find(
      (a) =>
        a.slug === slug ||
        a.slug?.toLowerCase() === lowerSlug ||
        a.id === slug ||
        a.id?.toLowerCase() === lowerSlug ||
        a.title?.toLowerCase() === lowerSlug ||
        (slugified && a.slug?.toLowerCase() === slugified)
    );
    if (match && !(match as any).isDeleted) {
      const fullMatch: Anime = {
        ...match,
        published: match.published !== false,
      };
      saveLocalStoredAnime(fullMatch);
      return fullMatch;
    }

    if (defaultMatch && !isAnimeDeleted(defaultMatch.id) && (!defaultMatch.slug || !isAnimeDeleted(defaultMatch.slug))) {
      return defaultMatch;
    }

    return null;
  } catch (err) {
    console.warn(`Failed to get anime by slug ${slug}, checking defaults:`, err);
    return defaultMatch || null;
  }
}

export async function getAnimeById(id: string): Promise<Anime | null> {
  if (!id) return null;
  const cleanId = decodeURIComponent(id).trim();
  const lowerId = cleanId.toLowerCase();

  // 1. Instant check in local storage & memory
  const localList = getLocalStoredAnimes();
  const localMatch = localList.find((a) => {
    if ((a as any).isDeleted === true) return false;
    return a.id === cleanId || a.id?.toLowerCase() === lowerId || a.slug === cleanId || a.slug?.toLowerCase() === lowerId;
  });
  if (localMatch) {
    return {
      ...localMatch,
      published: localMatch.published !== false,
    };
  }

  const defaultMatch = DEFAULT_ANIMES.find(
    (a) =>
      !isAnimeDeleted(a.id) &&
      (!a.slug || !isAnimeDeleted(a.slug)) &&
      (a.id === cleanId || a.slug === cleanId || a.id?.toLowerCase() === lowerId || a.slug?.toLowerCase() === lowerId)
  );

  try {
    const docRef = doc(db, ANIME_COLLECTION, cleanId);
    const docSnap = await withTimeout(getDoc(docRef), 2500, null);
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data() as Anime;
      if (!(data as any).isDeleted) {
        const poster = (data as any).posterUrl || (data as any).poster || defaultMatch?.poster || '';
        const banner = (data as any).bannerUrl || (data as any).banner || defaultMatch?.banner;
        const result: Anime = {
          id: docSnap.id,
          ...defaultMatch,
          ...data,
          published: data.published !== false,
          poster,
          posterUrl: poster,
          banner,
          bannerUrl: banner,
        };
        saveLocalStoredAnime(result);
        return result;
      }
    }

    // Check if id was actually a slug
    try {
      const q = query(
        collection(db, ANIME_COLLECTION),
        where('slug', '==', cleanId)
      );
      const slugSnap = await withTimeout(getDocs(q), 2000, null);
      if (slugSnap && !slugSnap.empty) {
        for (const slugDoc of slugSnap.docs) {
          const data = slugDoc.data() as Anime;
          if (!(data as any).isDeleted) {
            const poster = (data as any).posterUrl || (data as any).poster || defaultMatch?.poster || '';
            const banner = (data as any).bannerUrl || (data as any).banner || defaultMatch?.banner;
            const result: Anime = {
              id: slugDoc.id,
              ...defaultMatch,
              ...data,
              published: data.published !== false,
              poster,
              posterUrl: poster,
              banner,
              bannerUrl: banner,
            };
            saveLocalStoredAnime(result);
            return result;
          }
        }
      }
    } catch {}

    return defaultMatch || null;
  } catch (err) {
    console.warn(`Failed to get anime by id ${id}, checking defaults:`, err);
    return defaultMatch || null;
  }
}

export async function incrementAnimeViews(id: string): Promise<void> {
  try {
    const docRef = doc(db, ANIME_COLLECTION, id);
    await updateDoc(docRef, {
      viewsCount: increment(1),
    });
  } catch (err) {
    // Non-blocking view counter
    console.warn('Failed to increment anime views:', err);
  }
}

export async function getFeaturedAnimes(sourceList?: Anime[]): Promise<Anime[]> {
  try {
    const all = sourceList && sourceList.length > 0 ? sourceList : await getPublishedAnimes();
    return all.filter((a) => {
      // Must not be explicitly set to false
      if (a.featured === false || a.isFeatured === false) return false;
      return a.featured === true || a.isFeatured === true;
    });
  } catch (err) {
    console.error('Failed to get featured animes:', err);
    return [];
  }
}

export async function getTrendingAnimes(limitCount: number = 10, sourceList?: Anime[]): Promise<Anime[]> {
  try {
    const all = sourceList && sourceList.length > 0 ? sourceList : await getPublishedAnimes();
    return [...all]
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, limitCount);
  } catch (err) {
    console.error('Failed to get trending animes:', err);
    return [];
  }
}

export async function getPopularAnimes(limitCount: number = 10, sourceList?: Anime[]): Promise<Anime[]> {
  try {
    const all = sourceList && sourceList.length > 0 ? sourceList : await getPublishedAnimes();
    return [...all]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, limitCount);
  } catch (err) {
    console.error('Failed to get popular animes:', err);
    return [];
  }
}

export async function getRecentlyUpdatedAnimes(limitCount: number = 10): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
    return all
      .sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .slice(0, limitCount);
  } catch (err) {
    console.error('Failed to get recently updated animes:', err);
    return [];
  }
}

export async function getRelatedAnimes(currentAnime: Anime, limitCount: number = 6): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
    const other = all.filter((a) => a.id !== currentAnime.id && a.slug !== currentAnime.slug);
    
    // Score based on shared genres and type
    const scored = other.map((item) => {
      let score = 0;
      if (item.type && currentAnime.type && item.type === currentAnime.type) score += 2;
      if (item.genres && currentAnime.genres) {
        const shared = item.genres.filter((g) => currentAnime.genres?.includes(g));
        score += shared.length;
      }
      return { anime: item, score };
    });

    scored.sort((a, b) => b.score - a.score || (b.anime.rating || 0) - (a.anime.rating || 0));
    return scored.slice(0, limitCount).map((s) => s.anime);
  } catch (err) {
    console.error('Failed to get related animes:', err);
    return [];
  }
}

export interface SearchAnimeOptions {
  query?: string;
  genre?: string;
  type?: AnimeType | 'ALL';
  status?: AnimeStatus | 'ALL';
  season?: string;
  year?: number | 'ALL';
  language?: 'ALL' | 'DUB' | 'SUB' | 'MULTI' | string;
  audioLanguage?: string;
  ratingMin?: number;
  ratingMax?: number;
  sortBy?: 'latest' | 'popular' | 'rating' | 'trending' | 'updated' | 'az';
  expandSeasons?: boolean;
}

export async function searchAndFilterAnimes(options: SearchAnimeOptions = {}): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
    let filtered = [...all];

    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      const seasonExploded: Anime[] = [];

      filtered.forEach((a) => {
        const titleMatch = (a.title || '').toLowerCase().includes(q);
        const altMatch = a.altTitles?.some((alt) => (alt || '').toLowerCase().includes(q));
        const descMatch = (a.description || '').toLowerCase().includes(q);
        const studioMatch = (a.studio || '').toLowerCase().includes(q);
        const hasBaseMatch = titleMatch || altMatch || descMatch || studioMatch;

        // If anime has multiple seasons configured, return individual seasons as distinct search entries
        if (a.seasonsList && a.seasonsList.length > 1) {
          a.seasonsList.forEach((s) => {
            const sNum = Number(s.seasonNumber) || 1;
            const rawTitle = s.title?.trim() || `Season ${sNum}`;
            let fullSeasonTitle = rawTitle;
            if (!rawTitle.toLowerCase().includes(a.title.toLowerCase())) {
              if (rawTitle.toLowerCase().startsWith('season')) {
                fullSeasonTitle = `${a.title} ${rawTitle}`;
              } else {
                fullSeasonTitle = `${a.title} Season ${sNum}: ${rawTitle}`;
              }
            }

            const seasonTitleMatch = fullSeasonTitle.toLowerCase().includes(q) || rawTitle.toLowerCase().includes(q);
            const seasonDescMatch = (s.description || '').toLowerCase().includes(q);

            // If search query matches the main title or this specific season
            if (hasBaseMatch || seasonTitleMatch || seasonDescMatch) {
              seasonExploded.push({
                ...a,
                id: `${a.id || a.slug}-season-${sNum}`,
                title: fullSeasonTitle,
                poster: s.poster || a.poster,
                banner: s.banner || a.banner || a.poster,
                activeSeasonNumber: sNum,
                seasonTitle: rawTitle,
                year: s.year || a.year,
                totalEpisodes: s.totalEpisodes || a.totalEpisodes,
                status: (s.status as any) || a.status,
                description: s.description || a.description,
              });
            }
          });
        } else if (hasBaseMatch) {
          seasonExploded.push(a);
        }
      });

      filtered = seasonExploded;
    } else if (options.expandSeasons) {
      const seasonExploded: Anime[] = [];
      filtered.forEach((a) => {
        if (a.seasonsList && a.seasonsList.length > 1) {
          a.seasonsList.forEach((s) => {
            const sNum = Number(s.seasonNumber) || 1;
            const rawTitle = s.title?.trim() || `Season ${sNum}`;
            let fullSeasonTitle = rawTitle;
            if (!rawTitle.toLowerCase().includes(a.title.toLowerCase())) {
              if (rawTitle.toLowerCase().startsWith('season')) {
                fullSeasonTitle = `${a.title} ${rawTitle}`;
              } else {
                fullSeasonTitle = `${a.title} Season ${sNum}: ${rawTitle}`;
              }
            }
            seasonExploded.push({
              ...a,
              id: `${a.id || a.slug}-season-${sNum}`,
              title: fullSeasonTitle,
              poster: s.poster || a.poster,
              banner: s.banner || a.banner || a.poster,
              activeSeasonNumber: sNum,
              seasonTitle: rawTitle,
              year: s.year || a.year,
              totalEpisodes: s.totalEpisodes || a.totalEpisodes,
              status: (s.status as any) || a.status,
              description: s.description || a.description,
            });
          });
        } else {
          seasonExploded.push(a);
        }
      });
      filtered = seasonExploded;
    }

    if (options.genre && options.genre !== 'ALL') {
      filtered = filtered.filter((a) =>
        a.genres?.some((g) => (g || '').toLowerCase() === (options.genre || '').toLowerCase())
      );
    }

    if (options.type && options.type !== 'ALL') {
      filtered = filtered.filter((a) => (a.type || '').toLowerCase() === (options.type || '').toLowerCase());
    }

    if (options.status && options.status !== 'ALL') {
      filtered = filtered.filter((a) => (a.status || '').toLowerCase() === (options.status || '').toLowerCase());
    }

    if (options.season && options.season !== 'ALL') {
      filtered = filtered.filter((a) =>
        (a.season || '').toLowerCase().includes((options.season || '').toLowerCase())
      );
    }

    if (options.year && options.year !== 'ALL') {
      filtered = filtered.filter((a) => a.year === Number(options.year));
    }

    if (options.ratingMin !== undefined) {
      filtered = filtered.filter((a) => (a.rating || 0) >= (options.ratingMin ?? 0));
    }
    if (options.ratingMax !== undefined) {
      filtered = filtered.filter((a) => (a.rating || 0) <= (options.ratingMax ?? 10));
    }

    const filterLang = options.audioLanguage || options.language;
    if (filterLang && filterLang !== 'ALL' && filterLang !== 'all') {
      const langLower = filterLang.toLowerCase();
      filtered = filtered.filter((a) => {
        const audioLang = (a.audioLanguage || '').toLowerCase();
        const aTitle = (a.title || '').toLowerCase();
        const aDesc = (a.description || '').toLowerCase();

        if (langLower.includes('dub') || langLower.includes('hindi')) {
          return (
            audioLang.includes('dub') ||
            audioLang.includes('hindi') ||
            a.audioTags?.some((t) => (t || '').toLowerCase().includes('dub')) ||
            a.genres?.some((g) => (g || '').toLowerCase().includes('dub')) ||
            aTitle.includes('dub') ||
            aDesc.includes('dub')
          );
        }
        if (langLower.includes('sub') || langLower.includes('japanese')) {
          return (
            !a.audioLanguage ||
            a.audioTags?.some((t) => (t || '').toLowerCase().includes('sub') || (t || '').toLowerCase().includes('multi')) ||
            audioLang.includes('sub') ||
            audioLang.includes('japanese')
          );
        }
        return true;
      });
    }

    if (options.sortBy === 'trending') {
      filtered.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
    } else if (options.sortBy === 'popular') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.viewsCount || 0) - (a.viewsCount || 0));
    } else if (options.sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (options.sortBy === 'az') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (options.sortBy === 'updated') {
      filtered.sort((a, b) => {
        const timeA = getAnimeUploadTimestamp(a);
        const timeB = getAnimeUploadTimestamp(b);
        return timeB - timeA;
      });
    } else {
      // default: latest
      filtered.sort((a, b) => getAnimeUploadTimestamp(b) - getAnimeUploadTimestamp(a));
    }

    return filtered;
  } catch (err) {
    console.error('Failed to search and filter animes:', err);
    return [];
  }
}

export function getAnimeUploadTimestamp(anime: Anime): number {
  if (anime.createdAt) {
    if (typeof anime.createdAt === 'object' && typeof anime.createdAt.toMillis === 'function') {
      return anime.createdAt.toMillis();
    }
    if (typeof anime.createdAt === 'object' && typeof anime.createdAt.seconds === 'number') {
      return anime.createdAt.seconds * 1000;
    }
    if (anime.createdAt instanceof Date) {
      return anime.createdAt.getTime();
    }
    const parsed = new Date(anime.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (anime.updatedAt) {
    if (typeof anime.updatedAt === 'object' && typeof anime.updatedAt.toMillis === 'function') {
      return anime.updatedAt.toMillis();
    }
    if (typeof anime.updatedAt === 'object' && typeof anime.updatedAt.seconds === 'number') {
      return anime.updatedAt.seconds * 1000;
    }
    if (anime.updatedAt instanceof Date) {
      return anime.updatedAt.getTime();
    }
    const parsed = new Date(anime.updatedAt).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (anime.startDate) {
    const parsed = new Date(anime.startDate).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (anime.year) {
    return new Date(`${anime.year}-01-01`).getTime();
  }
  return 0;
}

export async function getRecentlyAddedAnimes(limitCount: number = 24): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
    return [...all]
      .sort((a, b) => getAnimeUploadTimestamp(b) - getAnimeUploadTimestamp(a))
      .slice(0, limitCount);
  } catch (err) {
    console.error('Failed to get recently added animes:', err);
    return [];
  }
}

export async function createAnime(data: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const posterUrl = data.posterUrl || data.poster;
  const bannerUrl = data.bannerUrl || data.banner;
  const payload = {
    ...data,
    poster: posterUrl,
    posterUrl,
    ...(bannerUrl ? { banner: bannerUrl, bannerUrl } : {}),
  };
  const cleaned = sanitizeData(payload);
  const fallbackId = data.slug ? `anime-${data.slug}` : `anime-${Date.now()}`;

  try {
    const docRef = await addDoc(collection(db, ANIME_COLLECTION), {
      ...cleaned,
      isDeleted: false,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (data.slug) {
      undeleteAnime(data.slug);
    }
    undeleteAnime(docRef.id);

    // Save locally for instant availability
    saveLocalStoredAnime({
      ...cleaned,
      id: docRef.id,
      published: data.published ?? true,
      viewsCount: 0,
    } as Anime);

    return docRef.id;
  } catch (err: any) {
    console.warn('Firestore createAnime encountered an error, saving to persistent local storage:', err);
    // Graceful offline fallback: if database was deleted in Firebase console or connection failed
    const localAnime: Anime = {
      ...cleaned,
      id: fallbackId,
      published: data.published ?? true,
      viewsCount: 0,
    } as Anime;

    saveLocalStoredAnime(localAnime);
    if (data.slug) {
      undeleteAnime(data.slug);
    }
    undeleteAnime(fallbackId);

    return fallbackId;
  }
}

export async function updateAnime(id: string, data: Partial<Anime>): Promise<void> {
  const payload = { ...data };
  if (data.poster || data.posterUrl) {
    const p = data.posterUrl || data.poster;
    payload.poster = p;
    payload.posterUrl = p;
  }
  if (data.banner !== undefined || data.bannerUrl !== undefined) {
    const b = data.bannerUrl || data.banner;
    payload.banner = b;
    payload.bannerUrl = b;
  }
  const cleaned = sanitizeData(payload);

  // Update local storage first so changes are always preserved
  saveLocalStoredAnime({ id, ...cleaned } as Anime);

  try {
    const docRef = doc(db, ANIME_COLLECTION, id);

    // If updating a default catalog anime that was not yet persisted to Firestore, include base metadata
    const def = DEFAULT_ANIMES.find((a) => a.id === id || a.slug === id);
    const baseData: Record<string, any> = {};
    if (def) {
      Object.assign(baseData, def);
    }
    // Ensure published is explicitly preserved or set to true by default unless specified false
    if (data.published === undefined && baseData.published === undefined) {
      baseData.published = true;
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

    // If anime was removed from spotlight / featured, also delete any linked hero banners
    if (data.featured === false || data.isFeatured === false) {
      const targetSlug = data.slug || def?.slug;
      try {
        await deleteHeroBannersForAnime(id);
        if (targetSlug && targetSlug !== id) {
          await deleteHeroBannersForAnime(targetSlug);
        }
      } catch (cmsErr) {
        console.warn('Could not sync hero banner deletion on unfeature:', cmsErr);
      }
    }
  } catch (err) {
    console.warn(`Firestore updateAnime ${id} error, preserved in local storage:`, err);
  }
}

export async function deleteAnime(id: string): Promise<void> {
  try {
    const cleanId = id.trim();
    const lowerId = cleanId.toLowerCase();
    const set = getLocalDeletedAnimeIds();
    set.add(cleanId);
    set.add(lowerId);

    // 1. Identify all identifier aliases (ID, slug, default match)
    let slug = '';
    const fsDocRef = doc(db, ANIME_COLLECTION, cleanId);
    try {
      const snap = await getDoc(fsDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.slug) {
          slug = data.slug.trim();
          set.add(slug);
          set.add(slug.toLowerCase());
        }
      }
    } catch {}

    const defaultMatch = DEFAULT_ANIMES.find(
      (a) =>
        a.id === cleanId ||
        a.slug === cleanId ||
        a.id?.toLowerCase() === lowerId ||
        a.slug?.toLowerCase() === lowerId
    );
    if (defaultMatch) {
      if (defaultMatch.id) {
        set.add(defaultMatch.id);
        set.add(defaultMatch.id.toLowerCase());
      }
      if (defaultMatch.slug) {
        set.add(defaultMatch.slug);
        set.add(defaultMatch.slug.toLowerCase());
      }
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
      }
    } catch {}

    const allIds = Array.from(
      new Set(
        [
          cleanId,
          lowerId,
          slug,
          slug ? slug.toLowerCase() : '',
          defaultMatch?.id,
          defaultMatch?.id ? defaultMatch.id.toLowerCase() : '',
          defaultMatch?.slug,
          defaultMatch?.slug ? defaultMatch.slug.toLowerCase() : '',
        ].filter(Boolean) as string[]
      )
    );

    // Remove from local admin cache immediately
    for (const targetId of allIds) {
      deleteLocalStoredAnime(targetId);
    }

    // Invalidate in-memory and fast-cache
    memoryPublishedAnimes = null;
    try {
      setStoredCache('published_animes', []);
    } catch {}

    // 2. Persist to Firestore siteSettings so all sessions/devices respect this deletion
    try {
      const settingsRef = doc(db, 'siteSettings', DELETED_ANIMES_DOC);
      await setDoc(
        settingsRef,
        {
          ids: arrayUnion(...allIds),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to update deleted_anime_ids setting:', e);
    }

    // 3. Delete or tombstone Firestore anime doc
    for (const targetId of allIds) {
      try {
        await deleteDoc(doc(db, ANIME_COLLECTION, targetId));
      } catch (e) {
        try {
          await setDoc(doc(db, ANIME_COLLECTION, targetId), { isDeleted: true, published: false }, { merge: true });
        } catch {}
      }
    }

    // Also delete linked hero banners
    for (const targetId of allIds) {
      try {
        await deleteHeroBannersForAnime(targetId);
      } catch {}
    }

    // 4. Delete associated episodes from Firestore
    try {
      for (const targetId of allIds) {
        const epQuery = query(collection(db, 'episodes'), where('animeId', '==', targetId));
        const epSnap = await getDocs(epQuery);
        for (const epDoc of epSnap.docs) {
          try {
            await deleteDoc(epDoc.ref);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to delete associated episodes for anime:', e);
    }

    // 5. Purge from watch progress, watch history, watchlist, favorites across Firestore & LocalStorage
    try {
      const { purgeDeletedAnimeFromUserActivity } = await import('./user-activity');
      await purgeDeletedAnimeFromUserActivity(allIds);
    } catch (e) {
      console.warn('Failed to purge deleted anime from user activity:', e);
    }
  } catch (err) {
    console.error(`Failed to delete anime ${id}:`, err);
    throw err;
  }
}

export async function seedDefaultCatalogToFirestore(): Promise<{ animeCount: number; episodeCount: number }> {
  try {
    let aCount = 0;
    let eCount = 0;
    const { DEFAULT_EPISODES } = await import('../../data/defaultCatalog');

    for (const anime of DEFAULT_ANIMES) {
      const docRef = doc(db, ANIME_COLLECTION, anime.id);
      const cleaned = sanitizeData(anime);
      await setDoc(docRef, {
        ...cleaned,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      aCount++;
    }

    for (const [animeId, episodes] of Object.entries(DEFAULT_EPISODES)) {
      for (const ep of episodes) {
        const epRef = doc(db, 'episodes', ep.id);
        const cleanedEp = sanitizeData(ep);
        await setDoc(epRef, {
          ...cleanedEp,
          animeId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        eCount++;
      }
    }

    return { animeCount: aCount, episodeCount: eCount };
  } catch (err) {
    console.error('Failed to seed catalog into Firestore:', err);
    throw err;
  }
}
