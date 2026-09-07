import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { SystemAnnouncement } from '../../types/library';
import { createNotification } from './notifications';
import { getAllUsers } from './admin-users';
import { getAnimeFollowerUserIds } from './follows';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

function sanitizeData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        typeof (value as any).toMillis !== 'function'
      ) {
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

export async function getAllAnnouncements(): Promise<SystemAnnouncement[]> {
  try {
    const snapshot = await getDocs(collection(db, ANNOUNCEMENTS_COLLECTION));
    const list: SystemAnnouncement[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SystemAnnouncement, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get announcements:', err);
    return [];
  }
}

export async function getPublishedAnnouncements(): Promise<SystemAnnouncement[]> {
  try {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      where('publishStatus', '==', 'published')
    );
    const snapshot = await getDocs(q);
    const list: SystemAnnouncement[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SystemAnnouncement, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get published announcements:', err);
    return [];
  }
}

export async function createAnnouncement(
  data: Omit<SystemAnnouncement, 'id' | 'createdAt'>,
  dispatchNotifications: boolean = true
): Promise<string> {
  try {
    const cleaned = sanitizeData({
      ...data,
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), cleaned);

    if (dispatchNotifications && data.publishStatus === 'published') {
      let recipientUserIds: string[] = [];

      if (data.targetAudience === 'all') {
        const users = await getAllUsers();
        recipientUserIds = users.map((u) => u.uid);
      } else if (data.targetAudience === 'anime_followers' && data.targetAnimeId) {
        recipientUserIds = await getAnimeFollowerUserIds(data.targetAnimeId);
      }

      if (recipientUserIds.length > 0) {
        const promises = recipientUserIds.map((uid) =>
          createNotification({
            userId: uid,
            title: data.title,
            message: data.message,
            link: data.link || '/notifications',
            type: 'announcement',
            read: false,
          })
        );
        await Promise.all(promises);
      }
    }

    return docRef.id;
  } catch (err) {
    console.error('Failed to create announcement:', err);
    throw err;
  }
}

export async function updateAnnouncementStatus(
  id: string,
  publishStatus: SystemAnnouncement['publishStatus']
): Promise<void> {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(docRef, { publishStatus });
  } catch (err) {
    console.error(`Failed to update announcement ${id}:`, err);
    throw err;
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete announcement ${id}:`, err);
    throw err;
  }
}
