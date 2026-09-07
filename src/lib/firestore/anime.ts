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

const ANIME_COLLECTION = 'anime';
const DELETED_IDS_STORAGE_KEY = 'zynox_deleted_anime_ids';
const DELETED_ANIMES_DOC = 'deleted_anime_ids';

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

const OLD_REMOVED_ANIME_IDS = new Set([
  'anime-wistoria',
  'anime-solo-leveling',
  'anime-demon-slayer',
  'anime-frieren',
  'anime-jujutsu-kaisen',
  'anime-attack-on-titan',
  'anime-one-piece',
  'anime-mushoku-tensei',
  'anime-vinland-saga',
  'anime-chainsaw-man',
  'anime-hells-paradise',
  'anime-oshi-no-ko',
  'anime-death-note',
  'anime-dr-stone',
  'anime-bleach-tybw',
  'anime-my-hero-academia',
  'anime-the-eminence-in-shadow',
  'anime-fullmetal-alchemist',
  'anime-dandadan',
  'anime-kaiju-no-8',
  'anime-wind-breaker',
  'anime-blue-lock-s2',
  'anime-spy-x-family-s2',
  'anime-re-zero-s3',
  'solo-leveling',
  'wistoria-wand-and-sword',
  'demon-slayer-hashira-training',
  'frieren-beyond-journeys-end',
  'jujutsu-kaisen-season-2',
  'attack-on-titan-final-season',
  'one-piece-egghead',
  'mushoku-tensei-s2',
  'vinland-saga-season-2',
  'chainsaw-man',
  'hells-paradise',
  'oshi-no-ko-s2',
  'death-note',
  'dr-stone-new-world',
  'bleach-thousand-year-blood-war',
  'my-hero-academia-s7',
  'the-eminence-in-shadow-s2',
  'fullmetal-alchemist-brotherhood',
  'dandadan',
  'kaiju-no-8',
  'wind-breaker',
  'blue-lock-vs-u20-japan',
  'spy-x-family-season-2',
  're-zero-starting-life-in-another-world-s3',
]);

let cachedDeletedIds: Set<string> | null = null;

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

export function getLocalDeletedAnimeIds(): Set<string> {
  if (!cachedDeletedIds) {
    cachedDeletedIds = new Set<string>(OLD_REMOVED_ANIME_IDS);
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DELETED_IDS_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => cachedDeletedIds!.add(id));
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
          if (id) set.add(id);
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
  const set = getLocalDeletedAnimeIds();
  return set.has(idOrSlug);
}

function mergeWithDefaultAnimes(firestoreList: Anime[], publishedOnly: boolean = true): Anime[] {
  const result: Anime[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const deletedSet = getLocalDeletedAnimeIds();

  // 1. Overlay Firestore documents first (they take precedence)
  for (const fsItem of firestoreList) {
    if ((fsItem as any).isDeleted === true) continue;
    if (publishedOnly && fsItem.published === false) {
      continue;
    }

    const id = fsItem.id || fsItem.slug;
    const slug = fsItem.slug || fsItem.id;
    if (!id) continue;

    // Filter out deleted animes
    if (deletedSet.has(id) || (slug && deletedSet.has(slug))) {
      continue;
    }

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

    const mergedItem: Anime = matchingDef
      ? { ...matchingDef, ...fsItem, id, slug }
      : { ...fsItem, id, slug };

    result.push(mergedItem);
  }

  // 2. Add default catalog animes that haven't been overridden, duplicated, or deleted
  for (const def of DEFAULT_ANIMES) {
    if (publishedOnly && def.published === false) continue;
    if (deletedSet.has(def.id) || (def.slug && deletedSet.has(def.slug))) {
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

export async function getPublishedAnimes(): Promise<Anime[]> {
  try {
    await fetchDeletedAnimeIds();
    const q = query(
      collection(db, ANIME_COLLECTION),
      where('published', '==', true)
    );
    const snapshot = await getDocs(q);
    const list: Anime[] = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Omit<Anime, 'id'>),
      id: docSnap.id,
    }));

    const merged = mergeWithDefaultAnimes(list, true);
    return merged.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    });
  } catch (err) {
    console.warn('Failed to get published animes from Firestore, using default catalog:', err);
    const deletedSet = getLocalDeletedAnimeIds();
    return DEFAULT_ANIMES.filter((a) => a.published !== false && !deletedSet.has(a.id) && (!a.slug || !deletedSet.has(a.slug)));
  }
}

export async function getAllAnimes(): Promise<Anime[]> {
  try {
    await fetchDeletedAnimeIds();
    const snapshot = await getDocs(collection(db, ANIME_COLLECTION));
    const list: Anime[] = snapshot.docs.map((docSnap) => ({
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
  } catch (err) {
    console.warn('Failed to get all animes from Firestore, using default catalog:', err);
    const deletedSet = getLocalDeletedAnimeIds();
    return DEFAULT_ANIMES.filter((a) => !deletedSet.has(a.id) && (!a.slug || !deletedSet.has(a.slug)));
  }
}

export async function getAnimeBySlug(rawSlug: string): Promise<Anime | null> {
  if (!rawSlug) return null;
  const slug = decodeURIComponent(rawSlug).trim();
  const lowerSlug = slug.toLowerCase();

  try {
    // 1. Check exact slug match in Firestore
    const q = query(
      collection(db, ANIME_COLLECTION),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Anime;
        if (!(data as any).isDeleted) {
          return {
            id: docSnap.id,
            ...data,
          };
        }
      }
    }

    // 2. Check lowercased slug match in Firestore
    if (lowerSlug !== slug) {
      const qLower = query(
        collection(db, ANIME_COLLECTION),
        where('slug', '==', lowerSlug)
      );
      const snapLower = await getDocs(qLower);
      if (!snapLower.empty) {
        for (const docSnap of snapLower.docs) {
          const data = docSnap.data() as Anime;
          if (!(data as any).isDeleted) {
            return {
              id: docSnap.id,
              ...data,
            };
          }
        }
      }
    }

    // 3. Check if slug was actually a Firestore doc ID
    try {
      const docRef = doc(db, ANIME_COLLECTION, slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Anime;
        if (!(data as any).isDeleted) {
          return {
            id: docSnap.id,
            ...data,
          };
        }
      }
    } catch {}

    // 4. Scan in all published animes (fallback for custom slugs or docIds)
    const all = await getAllAnimes();
    const match = all.find(
      (a) =>
        a.slug === slug ||
        a.slug?.toLowerCase() === lowerSlug ||
        a.id === slug ||
        a.id?.toLowerCase() === lowerSlug
    );
    if (match) return match;

    const found = DEFAULT_ANIMES.find((a) => (a.slug === slug || a.id === slug || a.slug?.toLowerCase() === lowerSlug));
    return found || null;
  } catch (err) {
    console.warn(`Failed to get anime by slug ${slug}, checking defaults:`, err);
    const found = DEFAULT_ANIMES.find((a) => (a.slug === slug || a.id === slug || a.slug?.toLowerCase() === lowerSlug));
    return found || null;
  }
}

export async function getAnimeById(id: string): Promise<Anime | null> {
  if (!id) return null;
  const cleanId = decodeURIComponent(id).trim();

  try {
    const docRef = doc(db, ANIME_COLLECTION, cleanId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Anime;
      if (!(data as any).isDeleted) {
        return {
          id: docSnap.id,
          ...data,
        };
      }
    }

    // Check if id was actually a slug
    try {
      const q = query(
        collection(db, ANIME_COLLECTION),
        where('slug', '==', cleanId)
      );
      const slugSnap = await getDocs(q);
      if (!slugSnap.empty) {
        for (const slugDoc of slugSnap.docs) {
          const data = slugDoc.data() as Anime;
          if (!(data as any).isDeleted) {
            return {
              id: slugDoc.id,
              ...data,
            };
          }
        }
      }
    } catch {}

    const found = DEFAULT_ANIMES.find((a) => a.id === cleanId || a.slug === cleanId);
    return found || null;
  } catch (err) {
    console.warn(`Failed to get anime by id ${id}, checking defaults:`, err);
    const found = DEFAULT_ANIMES.find((a) => a.id === cleanId || a.slug === cleanId);
    return found || null;
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

export async function getFeaturedAnimes(): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
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

export async function getTrendingAnimes(limitCount: number = 10): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
    return all
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, limitCount);
  } catch (err) {
    console.error('Failed to get trending animes:', err);
    return [];
  }
}

export async function getPopularAnimes(limitCount: number = 10): Promise<Anime[]> {
  try {
    const all = await getPublishedAnimes();
    return all
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
        const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    } else {
      // default: latest
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    }

    return filtered;
  } catch (err) {
    console.error('Failed to search and filter animes:', err);
    return [];
  }
}

export async function createAnime(data: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const cleaned = sanitizeData(data);
    const docRef = await addDoc(collection(db, ANIME_COLLECTION), {
      ...cleaned,
      viewsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to create anime:', err);
    throw err;
  }
}

export async function updateAnime(id: string, data: Partial<Anime>): Promise<void> {
  try {
    const cleaned = sanitizeData(data);
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
    console.error(`Failed to update anime ${id}:`, err);
    throw err;
  }
}

export async function deleteAnime(id: string): Promise<void> {
  try {
    const set = getLocalDeletedAnimeIds();
    set.add(id);

    // 1. Identify all identifier aliases (ID, slug, default match)
    let slug = '';
    const fsDocRef = doc(db, ANIME_COLLECTION, id);
    try {
      const snap = await getDoc(fsDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.slug) {
          slug = data.slug;
          set.add(slug);
        }
      }
    } catch {}

    const defaultMatch = DEFAULT_ANIMES.find((a) => a.id === id || a.slug === id);
    if (defaultMatch) {
      set.add(defaultMatch.id);
      if (defaultMatch.slug) set.add(defaultMatch.slug);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
      }
    } catch {}

    const allIds = Array.from(new Set([id, slug, defaultMatch?.id, defaultMatch?.slug].filter(Boolean) as string[]));

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
    try {
      await deleteDoc(fsDocRef);
    } catch (e) {
      console.warn(`Failed to deleteDoc for anime ${id}:`, e);
      try {
        await setDoc(fsDocRef, { isDeleted: true, published: false }, { merge: true });
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
