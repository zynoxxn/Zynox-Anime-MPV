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

export const DEFAULT_DRIVE_FOLDER_ID = '1plDLKivxoAud9ONpLNst36wmZjnNGrLw';
export const DEFAULT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`;

// Pre-indexed fallback list of 23 Google Drive PFPs (using high-speed direct CDN)
export const SEED_DRIVE_FILE_IDS: Array<{ fileId: string; name: string }> = [
  { fileId: '1CxUW6itl6uWm0LNCAgF8TfoVzO9WC7US', name: 'Avatar 1' },
  { fileId: '1OYDF-jW4E8i7_bTlQOjLNpJ_gRmj0PuQ', name: 'Avatar 2' },
  { fileId: '1op6J_ihpSDTIZx6-5JWTrHs8pyrHVjfg', name: 'Avatar 3' },
  { fileId: '1MS-xUbpeydoAoPKFsZHCaMnSSPCojA2t', name: 'Avatar 4' },
  { fileId: '1CIYFCsOLbvHq9q1qG4zBDAeagm8n4H1_', name: 'Avatar 5' },
  { fileId: '1D-2qB6i0jeK8EXHlv8WCPWhOYEjKJFDx', name: 'Avatar 6' },
  { fileId: '16BqsROivfR0FZoohbP_sneWjKiTwJA32', name: 'Avatar 7' },
  { fileId: '1Gzb2Bi90sD7PkQaI7k85_fmQxYwYmo9v', name: 'Avatar 8' },
  { fileId: '18BEwociugOaGOAaXqHA1RtwstSWi21gD', name: 'Avatar 9' },
  { fileId: '1waWMXteXrsnj_5I6z9QijGyAf5bgZjXS', name: 'Avatar 10' },
  { fileId: '1Vp_qkk3mwF0wOXeAV7Nl6NHkaD0yCrK4', name: 'Avatar 11' },
  { fileId: '1zmElazCQypdz4CScOoo0NzjYauXt6BM2', name: 'Avatar 12' },
  { fileId: '1IRJUwTV-ZxuQVHjO1Ok8vlPDKvwN6MX3', name: 'Avatar 13' },
  { fileId: '1beLVHar_yjHfB0_s3TBe9Kr6GpMvNCul', name: 'Avatar 14' },
  { fileId: '1jFHMUv-6HiaG0sLbRbHWZw22GGuzADQ_', name: 'Avatar 15' },
  { fileId: '17-0qYBNQ4UIkRQn9H67WHpbBhAsGQbQa', name: 'Avatar 16' },
  { fileId: '14XQo442ZPBvFnzGk8yhlxk2wIEZT7eHM', name: 'Avatar 17' },
  { fileId: '1OnD4Yi6PVuzn17wgVNe4njwHGETIdd1B', name: 'Avatar 18' },
  { fileId: '1LIA96r01Jz-vCFuvhC2O-q-27qZk1rBB', name: 'Avatar 19' },
  { fileId: '1o2WMIXnIvhVUui4aYrP3JN_sLjc5kRh1', name: 'Avatar 20' },
  { fileId: '1kDXX2GQQxQTR3zPqXX_F5N6g3rT4GPAm', name: 'Avatar 21' },
  { fileId: '14YntEyXgqLQMXcvMPQyF5xfvCjcIwidM', name: 'Avatar 22' },
  { fileId: '12Uw6vubqpLrWTwQl9BhZgI0vqqQ7K96Q', name: 'Avatar 23' },
];

export const FALLBACK_DRIVE_AVATARS: AnimeAvatar[] = SEED_DRIVE_FILE_IDS.map((item) => ({
  id: `gdrive-${item.fileId}`,
  url: `https://lh3.googleusercontent.com/d/${item.fileId}`,
  name: item.name,
  anime: 'Google Drive PFP',
  category: 'Popular',
  accentColor: '#1683FF',
}));

let cachedAvatars: AnimeAvatar[] | null = null;
let lastDriveFetch = 0;

/**
 * Fetch avatars dynamically from Google Drive folder via backend API
 */
export async function fetchDriveFolderAvatars(
  folderId = DEFAULT_DRIVE_FOLDER_ID,
  forceRefresh = false
): Promise<AnimeAvatar[]> {
  try {
    const res = await fetch(`/api/drive-avatars?folderId=${encodeURIComponent(folderId)}${forceRefresh ? '&refresh=true' : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.avatars) && data.avatars.length > 0) {
        lastDriveFetch = Date.now();
        return data.avatars;
      }
    }
  } catch (err) {
    console.warn('Could not fetch from /api/drive-avatars, using cached fallback:', err);
  }

  return FALLBACK_DRIVE_AVATARS;
}

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

    for (let i = 0; i < allDocs.length; i += 40) {
      const batch = writeBatch(db);
      const chunk = allDocs.slice(i, i + 40);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    const metaRef = doc(db, CMS_AVATARS_COLLECTION, META_DOC_ID);
    await setDoc(metaRef, { initialized: true, cleared: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Failed to clear all avatars from Firestore:', err);
  }
}

export async function syncDriveAvatarsToFirestore(folderId = DEFAULT_DRIVE_FOLDER_ID): Promise<number> {
  const driveAvatars = await fetchDriveFolderAvatars(folderId, true);
  if (driveAvatars.length === 0) return 0;

  try {
    for (let i = 0; i < driveAvatars.length; i += 20) {
      const batch = writeBatch(db);
      const chunk = driveAvatars.slice(i, i + 20);
      for (const item of chunk) {
        const docRef = doc(db, CMS_AVATARS_COLLECTION, item.id);
        batch.set(
          docRef,
          {
            id: item.id,
            url: item.url,
            name: item.name,
            anime: item.anime || 'Google Drive PFP',
            category: item.category || 'Popular',
            accentColor: item.accentColor || '#1683FF',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to sync Drive avatars to Firestore:', err);
  }

  await getAnimeAvatars(true);
  return driveAvatars.length;
}

export async function getAnimeAvatars(forceRefresh = false): Promise<AnimeAvatar[]> {
  if (!forceRefresh && cachedAvatars !== null && cachedAvatars.length > 0) {
    return cachedAvatars;
  }

  // Check localStorage cache
  if (!forceRefresh) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LS_AVATARS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
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

  // 1. Fetch Drive avatars dynamically
  const driveAvatars = await fetchDriveFolderAvatars(DEFAULT_DRIVE_FOLDER_ID, forceRefresh);

  // 2. Fetch from Firestore (read-only: strictly avoid write side-effects on reads)
  const firestoreItems: AnimeAvatar[] = [];
  try {
    const snap = await getDocs(collection(db, CMS_AVATARS_COLLECTION));

    if (!snap.empty) {
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
            firestoreItems.push({
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
    }
  } catch (err) {
    console.warn('Failed to load avatars from Firestore:', err);
  }

  // 3. Merge: Firestore custom avatars + Drive avatars, deduplicating by URL
  const seenUrls = new Set<string>();
  const combined: AnimeAvatar[] = [];

  for (const item of firestoreItems) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      combined.push(item);
    }
  }

  for (const item of driveAvatars) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      combined.push(item);
    }
  }

  cachedAvatars = combined;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_AVATARS_KEY, JSON.stringify(combined));
    }
  } catch {}

  return combined;
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
