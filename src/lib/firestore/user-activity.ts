import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  WatchProgress,
  WatchHistoryItem,
  WatchlistItem,
  FavoriteItem,
  WatchlistStatus,
} from '../../types/library';
import { isAnimeDeleted, fetchDeletedAnimeIds } from './anime';

const PROGRESS_COLLECTION = 'watchProgress';
const HISTORY_COLLECTION = 'watchHistory';
const WATCHLIST_COLLECTION = 'watchlist';
const FAVORITES_COLLECTION = 'favorites';

// LocalStorage Keys for Guests
const LS_PROGRESS = 'zynox_watch_progress';
const LS_HISTORY = 'zynox_watch_history';
const LS_WATCHLIST = 'zynox_watchlist';
const LS_FAVORITES = 'zynox_favorites';

// ----------------------------------------------------
// 1. WATCH PROGRESS / CONTINUE WATCHING
// ----------------------------------------------------

export async function saveWatchProgress(
  userId: string | null,
  data: Omit<WatchProgress, 'id' | 'updatedAt' | 'userId'>
): Promise<void> {
  if (isAnimeDeleted(data.animeId) || isAnimeDeleted(data.animeSlug)) {
    return;
  }

  const percentage = data.duration > 0 ? Math.min(100, Math.round((data.progress / data.duration) * 100)) : 0;
  const isCompleted = percentage >= 90;

  const item: WatchProgress = {
    ...data,
    userId: userId || undefined,
    percentage,
    completed: isCompleted,
    updatedAt: new Date().toISOString(),
  };

  // LocalStorage save (guest & local cache)
  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    let list: WatchProgress[] = raw ? JSON.parse(raw) : [];
    // Remove previous progress for same anime and remove deleted animes
    list = list.filter((p) => p.animeSlug !== data.animeSlug && p.animeId !== data.animeId && !isAnimeDeleted(p.animeId) && !isAnimeDeleted(p.animeSlug));
    list.unshift(item);
    localStorage.setItem(LS_PROGRESS, JSON.stringify(list.slice(0, 7)));
  } catch (e) {
    console.warn('LocalStorage progress save error:', e);
  }

  // Firestore save if logged in
  if (userId) {
    try {
      const docId = `${userId}_${data.animeId}`;
      const docRef = doc(db, PROGRESS_COLLECTION, docId);
      await setDoc(docRef, {
        ...item,
        userId,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore progress save failed:', e);
    }
  }

  // Also record to Watch History
  await recordWatchHistory(userId, {
    animeId: data.animeId,
    animeSlug: data.animeSlug,
    animeTitle: data.animeTitle,
    animePoster: data.animePoster,
    episodeId: data.episodeId,
    episodeNumber: data.episodeNumber,
    episodeTitle: data.episodeTitle,
    progress: data.progress,
    duration: data.duration,
  });
}

export async function getContinueWatching(userId: string | null): Promise<WatchProgress[]> {
  try {
    await fetchDeletedAnimeIds();
  } catch {}

  if (userId) {
    try {
      const q = query(
        collection(db, PROGRESS_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: WatchProgress[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<WatchProgress, 'id'>),
          }))
          .filter((p) => !isAnimeDeleted(p.animeId) && !isAnimeDeleted(p.animeSlug));

        return list.sort((a, b) => {
          const timeA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt?.toMillis?.() || 0;
          const timeB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        }).slice(0, 7);
      }
    } catch (e) {
      console.warn('Firestore getContinueWatching failed, falling back to localStorage:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    if (raw) {
      const parsed: WatchProgress[] = JSON.parse(raw);
      const valid = parsed.filter((p) => !isAnimeDeleted(p.animeId) && !isAnimeDeleted(p.animeSlug));
      if (valid.length !== parsed.length) {
        localStorage.setItem(LS_PROGRESS, JSON.stringify(valid));
      }
      return valid.slice(0, 7);
    }
  } catch (e) {}

  return [];
}

export async function removeWatchProgress(userId: string | null, animeId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    if (raw) {
      const list: WatchProgress[] = JSON.parse(raw);
      const filtered = list.filter((p) => p.animeId !== animeId && p.animeSlug !== animeId);
      localStorage.setItem(LS_PROGRESS, JSON.stringify(filtered));
    }
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}`;
      await deleteDoc(doc(db, PROGRESS_COLLECTION, docId));
    } catch (e) {
      console.warn('Firestore removeWatchProgress failed:', e);
    }
  }
}

// ----------------------------------------------------
// 2. WATCH HISTORY
// ----------------------------------------------------

export async function recordWatchHistory(
  userId: string | null,
  data: Omit<WatchHistoryItem, 'id' | 'watchedAt' | 'userId'>
): Promise<void> {
  if (isAnimeDeleted(data.animeId) || isAnimeDeleted(data.animeSlug)) {
    return;
  }

  const item: WatchHistoryItem = {
    ...data,
    userId: userId || undefined,
    watchedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(LS_HISTORY);
    let list: WatchHistoryItem[] = raw ? JSON.parse(raw) : [];
    // Remove duplicate entry for the exact same episode and remove deleted animes
    list = list.filter(
      (h) => !(h.animeId === data.animeId && h.episodeNumber === data.episodeNumber) &&
             !isAnimeDeleted(h.animeId) && !isAnimeDeleted(h.animeSlug)
    );
    list.unshift(item);
    localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, 100)));
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${data.animeId}_ep${data.episodeNumber}`;
      await setDoc(doc(db, HISTORY_COLLECTION, docId), {
        ...item,
        userId,
        watchedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore recordWatchHistory failed:', e);
    }
  }
}

export async function getWatchHistory(userId: string | null): Promise<WatchHistoryItem[]> {
  try {
    await fetchDeletedAnimeIds();
  } catch {}

  if (userId) {
    try {
      const q = query(
        collection(db, HISTORY_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const list: WatchHistoryItem[] = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WatchHistoryItem, 'id'>),
        }))
        .filter((h) => !isAnimeDeleted(h.animeId) && !isAnimeDeleted(h.animeSlug));

      return list.sort((a, b) => {
        const timeA = typeof a.watchedAt === 'string' ? new Date(a.watchedAt).getTime() : a.watchedAt?.toMillis?.() || 0;
        const timeB = typeof b.watchedAt === 'string' ? new Date(b.watchedAt).getTime() : b.watchedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    } catch (e) {
      console.warn('Firestore getWatchHistory failed, checking localStorage fallback:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LS_HISTORY);
    if (raw) {
      const parsed: WatchHistoryItem[] = JSON.parse(raw);
      const valid = parsed.filter((h) => !isAnimeDeleted(h.animeId) && !isAnimeDeleted(h.animeSlug));
      if (valid.length !== parsed.length) {
        localStorage.setItem(LS_HISTORY, JSON.stringify(valid));
      }
      return valid;
    }
  } catch (e) {}

  return [];
}

export async function removeWatchHistoryItem(
  userId: string | null,
  animeId: string,
  episodeNumber: number
): Promise<void> {
  try {
    const raw = localStorage.getItem(LS_HISTORY);
    if (raw) {
      const list: WatchHistoryItem[] = JSON.parse(raw);
      const filtered = list.filter(
        (h) => !(h.animeId === animeId && h.episodeNumber === episodeNumber) && h.animeSlug !== animeId
      );
      localStorage.setItem(LS_HISTORY, JSON.stringify(filtered));
    }
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}_ep${episodeNumber}`;
      await deleteDoc(doc(db, HISTORY_COLLECTION, docId));
    } catch (e) {
      console.warn('Firestore removeWatchHistoryItem failed:', e);
    }
  }

  // Also remove from watch progress / continue watching
  await removeWatchProgress(userId, animeId);
}

export async function clearWatchHistory(userId: string | null): Promise<void> {
  try {
    localStorage.removeItem(LS_HISTORY);
    localStorage.removeItem(LS_PROGRESS);
  } catch (e) {}

  if (userId) {
    try {
      // 1. Delete all watch history documents in chunks
      const qHist = query(
        collection(db, HISTORY_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshotHist = await getDocs(qHist);
      const docsHist = snapshotHist.docs;
      for (let i = 0; i < docsHist.length; i += 40) {
        const batch = writeBatch(db);
        docsHist.slice(i, i + 40).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // 2. Delete all watch progress / continue watching documents in chunks
      const qProg = query(
        collection(db, PROGRESS_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshotProg = await getDocs(qProg);
      const docsProg = snapshotProg.docs;
      for (let i = 0; i < docsProg.length; i += 40) {
        const batch = writeBatch(db);
        docsProg.slice(i, i + 40).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('Firestore clearWatchHistory failed:', e);
    }
  }
}

export async function clearContinueWatching(userId: string | null): Promise<void> {
  try {
    localStorage.removeItem(LS_PROGRESS);
  } catch (e) {}

  if (userId) {
    try {
      const qProg = query(
        collection(db, PROGRESS_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshotProg = await getDocs(qProg);
      const docsProg = snapshotProg.docs;
      for (let i = 0; i < docsProg.length; i += 40) {
        const batch = writeBatch(db);
        docsProg.slice(i, i + 40).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('Firestore clearContinueWatching failed:', e);
    }
  }
}

// ----------------------------------------------------
// 3. WATCHLIST
// ----------------------------------------------------

export async function setWatchlistStatus(
  userId: string | null,
  animeId: string,
  animeSlug: string,
  animeTitle: string,
  animePoster: string,
  status: WatchlistStatus,
  genres?: string[],
  rating?: number,
  completedEpisodes?: number,
  totalEpisodes?: number
): Promise<void> {
  if (isAnimeDeleted(animeId) || isAnimeDeleted(animeSlug)) {
    return;
  }

  const item: WatchlistItem = {
    userId: userId || undefined,
    animeId,
    animeSlug,
    animeTitle,
    animePoster,
    status,
    genres,
    rating,
    completedEpisodes,
    totalEpisodes,
    updatedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(LS_WATCHLIST);
    let list: WatchlistItem[] = raw ? JSON.parse(raw) : [];
    const existing = list.find((w) => w.animeId === animeId);
    list = list.filter((w) => w.animeId !== animeId && !isAnimeDeleted(w.animeId) && !isAnimeDeleted(w.animeSlug));
    list.unshift({
      ...existing,
      ...item,
      completedEpisodes: completedEpisodes !== undefined ? completedEpisodes : existing?.completedEpisodes,
      totalEpisodes: totalEpisodes !== undefined ? totalEpisodes : existing?.totalEpisodes,
    });
    localStorage.setItem(LS_WATCHLIST, JSON.stringify(list));
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}`;
      const payload: Record<string, any> = {
        ...item,
        userId,
        updatedAt: serverTimestamp(),
      };
      if (completedEpisodes !== undefined) payload.completedEpisodes = completedEpisodes;
      if (totalEpisodes !== undefined) payload.totalEpisodes = totalEpisodes;
      await setDoc(doc(db, WATCHLIST_COLLECTION, docId), payload, { merge: true });
    } catch (e) {
      console.warn('Firestore setWatchlistStatus failed:', e);
    }
  }
}

export async function updateWatchlistEpisodeProgress(
  userId: string | null,
  animeId: string,
  completedEpisodes: number,
  totalEpisodes?: number
): Promise<void> {
  if (isAnimeDeleted(animeId)) return;

  let updatedStatus: WatchlistStatus | undefined;
  if (totalEpisodes && completedEpisodes >= totalEpisodes) {
    updatedStatus = 'completed';
  } else if (completedEpisodes > 0) {
    updatedStatus = 'watching';
  }

  try {
    const raw = localStorage.getItem(LS_WATCHLIST);
    if (raw) {
      const list: WatchlistItem[] = JSON.parse(raw);
      const updated = list
        .filter((w) => !isAnimeDeleted(w.animeId) && !isAnimeDeleted(w.animeSlug))
        .map((w) => {
          if (w.animeId === animeId || w.animeSlug === animeId) {
            return {
              ...w,
              completedEpisodes,
              ...(totalEpisodes ? { totalEpisodes } : {}),
              ...(updatedStatus ? { status: updatedStatus } : {}),
              updatedAt: new Date().toISOString(),
            };
          }
          return w;
        });
      localStorage.setItem(LS_WATCHLIST, JSON.stringify(updated));
    }
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}`;
      const updates: Record<string, any> = {
        completedEpisodes,
        updatedAt: serverTimestamp(),
      };
      if (totalEpisodes !== undefined) updates.totalEpisodes = totalEpisodes;
      if (updatedStatus) updates.status = updatedStatus;
      await updateDoc(doc(db, WATCHLIST_COLLECTION, docId), updates);
    } catch (e) {
      console.warn('Firestore updateWatchlistEpisodeProgress failed:', e);
    }
  }
}

export async function removeFromWatchlist(userId: string | null, animeId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LS_WATCHLIST);
    if (raw) {
      const list: WatchlistItem[] = JSON.parse(raw);
      const filtered = list.filter((w) => w.animeId !== animeId && w.animeSlug !== animeId);
      localStorage.setItem(LS_WATCHLIST, JSON.stringify(filtered));
    }
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}`;
      await deleteDoc(doc(db, WATCHLIST_COLLECTION, docId));
    } catch (e) {
      console.warn('Firestore removeFromWatchlist failed:', e);
    }
  }
}

export async function getWatchlist(userId: string | null): Promise<WatchlistItem[]> {
  try {
    await fetchDeletedAnimeIds();
  } catch {}

  if (userId) {
    try {
      const q = query(
        collection(db, WATCHLIST_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: WatchlistItem[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<WatchlistItem, 'id'>),
          }))
          .filter((w) => !isAnimeDeleted(w.animeId) && !isAnimeDeleted(w.animeSlug));

        return list.sort((a, b) => {
          const timeA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt?.toMillis?.() || 0;
          const timeB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      }
    } catch (e) {
      console.warn('Firestore getWatchlist failed, using localStorage:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LS_WATCHLIST);
    if (raw) {
      const parsed: WatchlistItem[] = JSON.parse(raw);
      const valid = parsed.filter((w) => !isAnimeDeleted(w.animeId) && !isAnimeDeleted(w.animeSlug));
      if (valid.length !== parsed.length) {
        localStorage.setItem(LS_WATCHLIST, JSON.stringify(valid));
      }
      return valid;
    }
  } catch (e) {}

  return [];
}

export function isFavoriteCached(animeId: string): boolean {
  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    if (raw) {
      const list: FavoriteItem[] = JSON.parse(raw);
      return list.some((f) => (f.animeId === animeId || f.animeSlug === animeId) && !isAnimeDeleted(f.animeId) && !isAnimeDeleted(f.animeSlug));
    }
  } catch (e) {}
  return false;
}

export function getAnimeWatchlistStatusCached(animeId: string): WatchlistStatus | null {
  try {
    const raw = localStorage.getItem(LS_WATCHLIST);
    if (raw) {
      const list: WatchlistItem[] = JSON.parse(raw);
      const found = list.find((w) => (w.animeId === animeId || w.animeSlug === animeId) && !isAnimeDeleted(w.animeId) && !isAnimeDeleted(w.animeSlug));
      if (found) return found.status;
    }
  } catch (e) {}
  return null;
}

export async function getAnimeWatchlistStatus(
  userId: string | null,
  animeId: string
): Promise<WatchlistStatus | null> {
  if (isAnimeDeleted(animeId)) return null;

  if (userId) {
    try {
      const docRef = doc(db, WATCHLIST_COLLECTION, `${userId}_${animeId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data().status as WatchlistStatus;
      }
    } catch (e) {}
  }

  try {
    const raw = localStorage.getItem(LS_WATCHLIST);
    if (raw) {
      const list: WatchlistItem[] = JSON.parse(raw);
      const found = list.find((w) => (w.animeId === animeId || w.animeSlug === animeId) && !isAnimeDeleted(w.animeId) && !isAnimeDeleted(w.animeSlug));
      if (found) return found.status;
    }
  } catch (e) {}

  return null;
}

// ----------------------------------------------------
// 4. FAVORITES
// ----------------------------------------------------

export async function toggleFavorite(
  userId: string | null,
  animeId: string,
  animeSlug: string,
  animeTitle: string,
  animePoster: string,
  genres?: string[]
): Promise<boolean> {
  if (isAnimeDeleted(animeId) || isAnimeDeleted(animeSlug)) {
    return false;
  }

  let isFav = false;

  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    let list: FavoriteItem[] = raw ? JSON.parse(raw) : [];
    const exists = list.some((f) => f.animeId === animeId || f.animeSlug === animeSlug);

    if (exists) {
      list = list.filter((f) => f.animeId !== animeId && f.animeSlug !== animeSlug);
      isFav = false;
    } else {
      list = list.filter((f) => !isAnimeDeleted(f.animeId) && !isAnimeDeleted(f.animeSlug));
      list.unshift({
        userId: userId || undefined,
        animeId,
        animeSlug,
        animeTitle,
        animePoster,
        genres,
        addedAt: new Date().toISOString(),
      });
      isFav = true;
    }
    localStorage.setItem(LS_FAVORITES, JSON.stringify(list));
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}`;
      const docRef = doc(db, FAVORITES_COLLECTION, docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        await deleteDoc(docRef);
        isFav = false;
      } else {
        await setDoc(docRef, {
          userId,
          animeId,
          animeSlug,
          animeTitle,
          animePoster,
          genres: genres || [],
          addedAt: serverTimestamp(),
        });
        isFav = true;
      }
    } catch (e) {
      console.warn('Firestore toggleFavorite failed:', e);
    }
  }

  return isFav;
}

export async function isFavorite(userId: string | null, animeId: string): Promise<boolean> {
  if (isAnimeDeleted(animeId)) return false;

  if (userId) {
    try {
      const docRef = doc(db, FAVORITES_COLLECTION, `${userId}_${animeId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) return true;
    } catch (e) {}
  }

  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    if (raw) {
      const list: FavoriteItem[] = JSON.parse(raw);
      return list.some((f) => (f.animeId === animeId || f.animeSlug === animeId) && !isAnimeDeleted(f.animeId) && !isAnimeDeleted(f.animeSlug));
    }
  } catch (e) {}

  return false;
}

export async function removeFavorite(userId: string | null, animeId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    if (raw) {
      const list: FavoriteItem[] = JSON.parse(raw);
      const filtered = list.filter((f) => f.animeId !== animeId && f.animeSlug !== animeId);
      localStorage.setItem(LS_FAVORITES, JSON.stringify(filtered));
    }
  } catch (e) {}

  if (userId) {
    try {
      const docId = `${userId}_${animeId}`;
      await deleteDoc(doc(db, FAVORITES_COLLECTION, docId));
    } catch (e) {
      console.warn('Firestore removeFavorite failed:', e);
    }
  }
}

export async function markEpisodeWatched(
  userId: string | null,
  animeId: string,
  animeSlug: string,
  animeTitle: string,
  animePoster: string,
  episodeId: string,
  episodeNumber: number,
  episodeTitle?: string
): Promise<void> {
  if (isAnimeDeleted(animeId) || isAnimeDeleted(animeSlug)) return;

  await saveWatchProgress(userId, {
    animeId,
    animeSlug,
    animeTitle,
    animePoster,
    episodeId,
    episodeNumber,
    episodeTitle,
    progress: 1440,
    duration: 1440,
  });
}

export async function getWatchedEpisodes(
  userId: string | null,
  animeId: string
): Promise<number[]> {
  if (isAnimeDeleted(animeId)) return [];

  const history = await getWatchHistory(userId);
  const matched = history
    .filter((h) => (h.animeId === animeId || h.animeSlug === animeId) && !isAnimeDeleted(h.animeId) && !isAnimeDeleted(h.animeSlug))
    .map((h) => h.episodeNumber);
  return Array.from(new Set(matched));
}

export async function getEpisodeProgress(
  userId: string | null,
  animeId: string
): Promise<WatchProgress | null> {
  if (isAnimeDeleted(animeId)) return null;

  const list = await getContinueWatching(userId);
  return list.find((p) => p.animeId === animeId || p.animeSlug === animeId) || null;
}

export async function getFavorites(userId: string | null): Promise<FavoriteItem[]> {
  try {
    await fetchDeletedAnimeIds();
  } catch {}

  if (userId) {
    try {
      const q = query(
        collection(db, FAVORITES_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: FavoriteItem[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FavoriteItem, 'id'>),
          }))
          .filter((f) => !isAnimeDeleted(f.animeId) && !isAnimeDeleted(f.animeSlug));

        return list.sort((a, b) => {
          const timeA = typeof a.addedAt === 'string' ? new Date(a.addedAt).getTime() : a.addedAt?.toMillis?.() || 0;
          const timeB = typeof b.addedAt === 'string' ? new Date(b.addedAt).getTime() : b.addedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      }
    } catch (e) {
      console.warn('Firestore getFavorites failed, using localStorage:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    if (raw) {
      const parsed: FavoriteItem[] = JSON.parse(raw);
      const valid = parsed.filter((f) => !isAnimeDeleted(f.animeId) && !isAnimeDeleted(f.animeSlug));
      if (valid.length !== parsed.length) {
        localStorage.setItem(LS_FAVORITES, JSON.stringify(valid));
      }
      return valid;
    }
  } catch (e) {}

  return [];
}

/**
 * Purges deleted anime records from all user-activity stores (Firestore and localStorage)
 */
export async function purgeDeletedAnimeFromUserActivity(animeIdentifiers: string[]): Promise<void> {
  if (!animeIdentifiers || animeIdentifiers.length === 0) return;
  const idSet = new Set(animeIdentifiers);

  // 1. Purge LocalStorage stores
  try {
    if (typeof localStorage !== 'undefined') {
      const pRaw = localStorage.getItem(LS_PROGRESS);
      if (pRaw) {
        const pList: WatchProgress[] = JSON.parse(pRaw);
        localStorage.setItem(LS_PROGRESS, JSON.stringify(pList.filter((p) => !idSet.has(p.animeId) && !idSet.has(p.animeSlug))));
      }

      const hRaw = localStorage.getItem(LS_HISTORY);
      if (hRaw) {
        const hList: WatchHistoryItem[] = JSON.parse(hRaw);
        localStorage.setItem(LS_HISTORY, JSON.stringify(hList.filter((h) => !idSet.has(h.animeId) && !idSet.has(h.animeSlug))));
      }

      const wRaw = localStorage.getItem(LS_WATCHLIST);
      if (wRaw) {
        const wList: WatchlistItem[] = JSON.parse(wRaw);
        localStorage.setItem(LS_WATCHLIST, JSON.stringify(wList.filter((w) => !idSet.has(w.animeId) && !idSet.has(w.animeSlug))));
      }

      const fRaw = localStorage.getItem(LS_FAVORITES);
      if (fRaw) {
        const fList: FavoriteItem[] = JSON.parse(fRaw);
        localStorage.setItem(LS_FAVORITES, JSON.stringify(fList.filter((f) => !idSet.has(f.animeId) && !idSet.has(f.animeSlug))));
      }
    }
  } catch (e) {
    console.warn('Failed to clean local storage for deleted anime:', e);
  }

  // 2. Purge Firestore collections
  const collections = [PROGRESS_COLLECTION, HISTORY_COLLECTION, WATCHLIST_COLLECTION, FAVORITES_COLLECTION];
  for (const colName of collections) {
    for (const targetId of animeIdentifiers) {
      try {
        const qByAnimeId = query(collection(db, colName), where('animeId', '==', targetId));
        const snap = await getDocs(qByAnimeId);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }

        const qBySlug = query(collection(db, colName), where('animeSlug', '==', targetId));
        const snapSlug = await getDocs(qBySlug);
        if (!snapSlug.empty) {
          const batch = writeBatch(db);
          snapSlug.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn(`Failed to clean Firestore ${colName} for anime ${targetId}:`, e);
      }
    }
  }
}
