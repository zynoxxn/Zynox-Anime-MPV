import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ANIME_AVATARS, AnimeAvatar } from '../../data/avatars';
import { compressAvatarImage } from '../image-compress';

export const CMS_AVATARS_COLLECTION = 'cms_avatars';
const LS_AVATARS_KEY = 'zynox_cms_anime_avatars';
const META_DOC_ID = 'cms_catalog_meta';

let cachedAvatars: AnimeAvatar[] | null = null;

// Initial immediate clear of any legacy cached preset avatars
try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(LS_AVATARS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some((a: any) => a.id === 'erza-scarlet-1' || a.id === 'sinon-sao-1' || a.id === 'asta-bc')) {
        localStorage.removeItem(LS_AVATARS_KEY);
        cachedAvatars = [];
      }
    }
  }
} catch {}

export async function clearAllAnimeAvatars(): Promise<void> {
  cachedAvatars = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LS_AVATARS_KEY);
    }
  } catch {}

  try {
    const snap = await getDocs(collection(db, CMS_AVATARS_COLLECTION));
    const allDocs = snap.docs;

    // Process deletes in chunks of 40 to avoid write-stream exhaustion
    for (let i = 0; i < allDocs.length; i += 40) {
      const batch = writeBatch(db);
      const chunk = allDocs.slice(i, i + 40);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Mark cleared meta once at the end
    const metaRef = doc(db, CMS_AVATARS_COLLECTION, META_DOC_ID);
    await setDoc(metaRef, { initialized: true, cleared: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Failed to clear all avatars from Firestore:', err);
  }
}

export async function getAnimeAvatars(forceRefresh = false): Promise<AnimeAvatar[]> {
  if (!forceRefresh && cachedAvatars !== null) {
    return cachedAvatars;
  }

  // Check localStorage cache
  if (!forceRefresh) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LS_AVATARS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Check if old demo avatars
            if (!parsed.some((a: any) => a.id === 'erza-scarlet-1' || a.id === 'sinon-sao-1')) {
              cachedAvatars = parsed;
              return parsed;
            }
          }
        }
      }
    } catch (e) {}
  }

  // Fetch from Firestore (read-only: strictly avoid write side-effects on reads)
  try {
    const snap = await getDocs(collection(db, CMS_AVATARS_COLLECTION));

    if (!snap.empty) {
      const items: AnimeAvatar[] = [];
      snap.forEach((d) => {
        if (d.id !== META_DOC_ID && d.id !== '__meta__') {
          // If it is one of the old seeded demo IDs, skip it
          if (
            d.id.startsWith('erza-') ||
            d.id.startsWith('sinon-') ||
            d.id.startsWith('asta-') ||
            d.id === 'l-lawliet' ||
            d.id === 'bakugo-katsuki' ||
            d.id === 'tanjiro-kamado' ||
            d.id === 'sasuke-sakura-pair'
          ) {
            return;
          }

          const data = d.data();
          if (data && data.url) {
            items.push({
              id: d.id,
              url: data.url,
              name: data.name || '',
              anime: data.anime || '',
              category: data.category || 'Custom',
              accentColor: data.accentColor || '#1683FF',
            });
          }
        }
      });

      cachedAvatars = items;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LS_AVATARS_KEY, JSON.stringify(items));
        }
      } catch {}
      return items;
    }
  } catch (err) {
    console.warn('Failed to load avatars from Firestore:', err);
  }

  cachedAvatars = [];
  return [];
}

export async function saveAnimeAvatar(avatar: Partial<AnimeAvatar> & { url: string }): Promise<AnimeAvatar> {
  const avatarId = avatar.id || `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  // Compress image if it is a large data URL
  let finalUrl = avatar.url;
  if (finalUrl.startsWith('data:image')) {
    try {
      finalUrl = await compressAvatarImage(finalUrl, 256, 0.82);
    } catch {}
  }

  const itemToSave: AnimeAvatar = {
    id: avatarId,
    url: finalUrl,
    name: avatar.name || '',
    anime: avatar.anime || '',
    category: (avatar.category as any) || 'Popular',
    accentColor: avatar.accentColor || '#1683FF',
  };

  // Update in memory cache and local storage
  const currentList = cachedAvatars ? [...cachedAvatars] : [];
  const existingIdx = currentList.findIndex((a) => a.id === avatarId);
  if (existingIdx >= 0) {
    currentList[existingIdx] = itemToSave;
  } else {
    currentList.unshift(itemToSave);
  }
  cachedAvatars = currentList;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_AVATARS_KEY, JSON.stringify(currentList));
    }
  } catch {}

  // Save to Firestore (only the single document, avoiding hotspotting the meta doc)
  try {
    const docRef = doc(db, CMS_AVATARS_COLLECTION, avatarId);
    await setDoc(docRef, {
      id: avatarId,
      url: itemToSave.url,
      name: itemToSave.name,
      anime: itemToSave.anime,
      category: itemToSave.category,
      accentColor: itemToSave.accentColor,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save avatar in Firestore:', err);
  }

  return itemToSave;
}

export async function saveBulkAnimeAvatars(urls: string[]): Promise<AnimeAvatar[]> {
  const validUrls = urls.map((u) => u.trim()).filter((u) => u.length > 0);
  if (validUrls.length === 0) return [];

  // Compress any data URLs concurrently in small batches
  const compressedUrls: string[] = [];
  for (const url of validUrls) {
    if (url.startsWith('data:image')) {
      try {
        const comp = await compressAvatarImage(url, 256, 0.82);
        compressedUrls.push(comp || url);
      } catch {
        compressedUrls.push(url);
      }
    } else {
      compressedUrls.push(url);
    }
  }

  const newItems: AnimeAvatar[] = compressedUrls.map((url, idx) => ({
    id: `avatar-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    url,
    name: '',
    anime: '',
    category: 'Popular' as any,
    accentColor: '#1683FF',
  }));

  const currentList = cachedAvatars ? [...cachedAvatars] : [];
  const updatedList = [...newItems, ...currentList];
  cachedAvatars = updatedList;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_AVATARS_KEY, JSON.stringify(updatedList));
    }
  } catch {}

  // Save in Firestore batches (max 20 per batch to prevent write stream backoff/exhaustion)
  try {
    for (let i = 0; i < newItems.length; i += 20) {
      const batch = writeBatch(db);
      const chunk = newItems.slice(i, i + 20);
      for (const item of chunk) {
        const docRef = doc(db, CMS_AVATARS_COLLECTION, item.id);
        batch.set(docRef, {
          id: item.id,
          url: item.url,
          name: item.name,
          anime: item.anime,
          category: item.category,
          accentColor: item.accentColor,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to save bulk avatars to Firestore:', err);
  }

  return newItems;
}

export async function deleteAnimeAvatar(avatarId: string): Promise<void> {
  // Update local cache
  if (cachedAvatars) {
    cachedAvatars = cachedAvatars.filter((a) => a.id !== avatarId);
  } else {
    cachedAvatars = [];
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_AVATARS_KEY, JSON.stringify(cachedAvatars));
    }
  } catch {}

  // Delete from Firestore
  try {
    const docRef = doc(db, CMS_AVATARS_COLLECTION, avatarId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete avatar in Firestore:', err);
  }
}

export async function deleteBulkAnimeAvatars(avatarIds: string[]): Promise<void> {
  if (avatarIds.length === 0) return;
  const idSet = new Set(avatarIds);

  if (cachedAvatars) {
    cachedAvatars = cachedAvatars.filter((a) => !idSet.has(a.id));
  } else {
    cachedAvatars = [];
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_AVATARS_KEY, JSON.stringify(cachedAvatars));
    }
  } catch {}

  try {
    // Delete in chunks of 40 docs per batch
    for (let i = 0; i < avatarIds.length; i += 40) {
      const batch = writeBatch(db);
      const chunk = avatarIds.slice(i, i + 40);
      for (const id of chunk) {
        const docRef = doc(db, CMS_AVATARS_COLLECTION, id);
        batch.delete(docRef);
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to delete bulk avatars in Firestore:', err);
  }
}

export async function resetDefaultAnimeAvatars(): Promise<void> {
  await clearAllAnimeAvatars();
}
