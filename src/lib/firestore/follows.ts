import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AnimeFollowItem } from '../../types/library';
import { createNotification } from './notifications';

const ANIME_FOLLOWS_COLLECTION = 'animeFollows';

export async function isFollowingAnime(userId: string, animeId: string): Promise<boolean> {
  try {
    const followId = `${userId}_${animeId}`;
    const docSnap = await getDoc(doc(db, ANIME_FOLLOWS_COLLECTION, followId));
    return docSnap.exists();
  } catch (err) {
    console.warn(`Failed to check if following anime ${animeId}:`, err);
    return false;
  }
}

export async function followAnime(data: {
  userId: string;
  animeId: string;
  animeTitle: string;
  animeSlug: string;
  animePoster?: string;
}): Promise<void> {
  try {
    const followId = `${data.userId}_${data.animeId}`;
    const docRef = doc(db, ANIME_FOLLOWS_COLLECTION, followId);
    await setDoc(docRef, {
      userId: data.userId,
      animeId: data.animeId,
      animeTitle: data.animeTitle,
      animeSlug: data.animeSlug,
      animePoster: data.animePoster || '',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to follow anime ${data.animeId}:`, err);
    throw err;
  }
}

export async function unfollowAnime(userId: string, animeId: string): Promise<void> {
  try {
    const followId = `${userId}_${animeId}`;
    const docRef = doc(db, ANIME_FOLLOWS_COLLECTION, followId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to unfollow anime ${animeId}:`, err);
    throw err;
  }
}

export async function getUserFollowedAnimes(userId: string): Promise<AnimeFollowItem[]> {
  try {
    const q = query(
      collection(db, ANIME_FOLLOWS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const list: AnimeFollowItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AnimeFollowItem, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error(`Failed to get followed animes for user ${userId}:`, err);
    return [];
  }
}

export async function getAnimeFollowerUserIds(animeId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, ANIME_FOLLOWS_COLLECTION),
      where('animeId', '==', animeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => (d.data() as AnimeFollowItem).userId);
  } catch (err) {
    console.error(`Failed to get followers for anime ${animeId}:`, err);
    return [];
  }
}

/**
 * Triggered when a new episode is released/published by an admin
 */
export async function notifyFollowersNewEpisode(params: {
  animeId: string;
  animeTitle: string;
  animeSlug: string;
  episodeNumber: number;
  episodeTitle?: string;
}): Promise<number> {
  try {
    const followerUserIds = await getAnimeFollowerUserIds(params.animeId);
    if (followerUserIds.length === 0) return 0;

    const promises = followerUserIds.map((uid) =>
      createNotification({
        userId: uid,
        title: `New Episode Released: ${params.animeTitle}`,
        message: `Episode ${params.episodeNumber}${
          params.episodeTitle ? ` - ${params.episodeTitle}` : ''
        } is now available to stream!`,
        link: `/anime/${params.animeSlug}/episode/${params.episodeNumber}`,
        type: 'new_episode',
        read: false,
      })
    );

    await Promise.all(promises);
    return followerUserIds.length;
  } catch (err) {
    console.error('Failed to notify anime followers about new episode:', err);
    return 0;
  }
}
