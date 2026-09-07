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
import type { AppNotification } from '../../types/library';
import { getCmsAnnouncements } from './cms';

const NOTIFICATIONS_COLLECTION = 'notifications';

function getReadAnnouncements(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`read_announcements_${userId}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set();
}

function saveReadAnnouncement(userId: string, annId: string) {
  try {
    const current = getReadAnnouncements(userId);
    current.add(annId);
    localStorage.setItem(`read_announcements_${userId}`, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

function getDismissedAnnouncements(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`dismissed_announcements_${userId}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set();
}

function saveDismissedAnnouncement(userId: string, annId: string) {
  try {
    const current = getDismissedAnnouncements(userId);
    current.add(annId);
    localStorage.setItem(`dismissed_announcements_${userId}`, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const list: AppNotification[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AppNotification, 'id'>),
    }));

    // Fetch active CMS Announcements to display exclusively inside Notification Center
    try {
      const cmsList = await getCmsAnnouncements();
      const readSet = getReadAnnouncements(userId);
      const dismissedSet = getDismissedAnnouncements(userId);

      const activeAnnouncements: AppNotification[] = cmsList
        .filter((ann) => ann.active && !dismissedSet.has(ann.id))
        .map((ann) => ({
          id: `announcement-${ann.id}`,
          userId,
          title: `📢 ${ann.title}`,
          message: ann.message,
          link: ann.link || '',
          type: 'system_announcement',
          read: readSet.has(ann.id),
          createdAt: {
            toMillis: () => 9999999999999, // Pin high priority announcements at the top
          },
        }));

      list.push(...activeAnnouncements);
    } catch (cmsErr) {
      console.warn('Could not load announcements for notification center:', cmsErr);
    }

    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get notifications:', err);
    return [];
  }
}

export async function markNotificationRead(id: string, userId?: string): Promise<void> {
  try {
    if (id.startsWith('announcement-')) {
      const actualId = id.replace('announcement-', '');
      if (userId) {
        saveReadAnnouncement(userId, actualId);
      }
      return;
    }
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.error(`Failed to mark notification ${id} as read:`, err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map((d) => updateDoc(d.ref, { read: true }));
    await Promise.all(updates);

    // Also mark all CMS announcements as read for this user
    try {
      const cmsList = await getCmsAnnouncements();
      cmsList.forEach((ann) => saveReadAnnouncement(userId, ann.id));
    } catch {
      // ignore
    }
  } catch (err) {
    console.error('Failed to mark all notifications read:', err);
  }
}

export async function deleteNotification(id: string, userId?: string): Promise<void> {
  try {
    if (id.startsWith('announcement-')) {
      const actualId = id.replace('announcement-', '');
      if (userId) {
        saveDismissedAnnouncement(userId, actualId);
      }
      return;
    }
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete notification ${id}:`, err);
  }
}

export async function createNotification(data: Omit<AppNotification, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to create notification:', err);
    throw err;
  }
}

