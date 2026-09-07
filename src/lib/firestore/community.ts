import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  AnimeRequest,
  EpisodeReport,
  RequestStatus,
  ReportStatus,
} from '../../types/library';
import { createNotification } from './notifications';

const REQUESTS_COLLECTION = 'animeRequests';
const REPORTS_COLLECTION = 'episodeReports';

// ----------------------------------------------------
// ANIME REQUESTS
// ----------------------------------------------------

export async function submitAnimeRequest(data: {
  userId?: string;
  userName?: string;
  userEmail?: string;
  animeTitle: string;
  reason: string;
  message?: string;
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
      ...data,
      status: 'pending' as RequestStatus,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to submit anime request:', err);
    throw err;
  }
}

export async function getUserAnimeRequests(userId: string): Promise<AnimeRequest[]> {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const list: AnimeRequest[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AnimeRequest, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error(`Failed to get requests for user ${userId}:`, err);
    return [];
  }
}

export async function getAllAnimeRequests(): Promise<AnimeRequest[]> {
  try {
    const snapshot = await getDocs(collection(db, REQUESTS_COLLECTION));
    const list: AnimeRequest[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AnimeRequest, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get anime requests:', err);
    throw err;
  }
}

export async function updateRequestStatus(id: string, status: RequestStatus): Promise<void> {
  try {
    const docRef = doc(db, REQUESTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    await updateDoc(docRef, { status });

    if (snap.exists()) {
      const data = snap.data() as AnimeRequest;
      if (data.userId) {
        const statusLabel =
          status === 'approved'
            ? 'Approved'
            : status === 'completed'
            ? 'Added to Catalog'
            : status === 'rejected'
            ? 'Declined'
            : 'Pending';

        createNotification({
          userId: data.userId,
          title: `Anime Request Update: ${data.animeTitle}`,
          message: `Your request for "${data.animeTitle}" has been marked as ${statusLabel}.`,
          link: '/notifications',
          type: 'request_update',
          read: false,
        }).catch((e) => console.warn('Failed to send request update notification:', e));
      }
    }
  } catch (err) {
    console.error(`Failed to update request status ${id}:`, err);
    throw err;
  }
}

export async function deleteAnimeRequest(id: string): Promise<void> {
  try {
    const docRef = doc(db, REQUESTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete anime request ${id}:`, err);
    throw err;
  }
}

// ----------------------------------------------------
// EPISODE PROBLEM REPORTS
// ----------------------------------------------------

export async function submitEpisodeReport(data: {
  userId?: string;
  userEmail?: string;
  animeId: string;
  animeTitle: string;
  episodeId?: string;
  episodeNumber: number;
  reason: EpisodeReport['reason'];
  details?: string;
}): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
      ...data,
      status: 'open' as ReportStatus,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to submit episode report:', err);
    throw err;
  }
}

export async function getAllEpisodeReports(): Promise<EpisodeReport[]> {
  try {
    const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
    const list: EpisodeReport[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EpisodeReport, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get episode reports:', err);
    throw err;
  }
}

export async function updateReportStatus(id: string, status: ReportStatus): Promise<void> {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, id);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.error(`Failed to update report status ${id}:`, err);
    throw err;
  }
}

export async function deleteEpisodeReport(id: string): Promise<void> {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete episode report ${id}:`, err);
    throw err;
  }
}
