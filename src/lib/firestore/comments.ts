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
import type {
  CommentItem,
  CommentReportItem,
  CommentReportReason,
  CommentReportStatus,
  UserBlockItem,
} from '../../types/library';
import { createNotification } from './notifications';

const COMMENTS_COLLECTION = 'comments';
const COMMENT_LIKES_COLLECTION = 'commentLikes';
const COMMENT_REPORTS_COLLECTION = 'commentReports';
const USER_BLOCKS_COLLECTION = 'userBlocks';

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

/**
 * Fetch top-level comments for an anime or specific episode
 */
export async function getComments(params: {
  targetType: 'anime' | 'episode';
  animeId: string;
  episodeNumber?: number;
  sortBy?: 'newest' | 'oldest' | 'most_liked';
  blockedUserIds?: string[];
  limitCount?: number;
}): Promise<CommentItem[]> {
  try {
    let q = query(
      collection(db, COMMENTS_COLLECTION),
      where('targetType', '==', params.targetType),
      where('animeId', '==', params.animeId)
    );

    if (params.targetType === 'episode' && typeof params.episodeNumber === 'number') {
      q = query(
        collection(db, COMMENTS_COLLECTION),
        where('targetType', '==', 'episode'),
        where('animeId', '==', params.animeId),
        where('episodeNumber', '==', params.episodeNumber)
      );
    }

    const snapshot = await getDocs(q);
    let comments: CommentItem[] = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommentItem, 'id'>),
      }))
      // Only show top-level comments (parentId is null or undefined or empty)
      .filter((c) => !c.parentId && !c.isHidden);

    // Filter out comments from blocked users
    if (params.blockedUserIds && params.blockedUserIds.length > 0) {
      const blockedSet = new Set(params.blockedUserIds);
      comments = comments.filter((c) => !blockedSet.has(c.userId));
    }

    // Sort in memory for accurate multi-field ordering
    const sortBy = params.sortBy || 'newest';
    comments.sort((a, b) => {
      if (sortBy === 'most_liked') {
        const diffLikes = (b.likesCount || 0) - (a.likesCount || 0);
        if (diffLikes !== 0) return diffLikes;
      }
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });

    if (params.limitCount && params.limitCount > 0) {
      comments = comments.slice(0, params.limitCount);
    }

    return comments;
  } catch (err) {
    console.error('Failed to get comments:', err);
    return [];
  }
}

/**
 * Fetch nested replies for a parent comment
 */
export async function getCommentReplies(
  parentId: string,
  blockedUserIds: string[] = []
): Promise<CommentItem[]> {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('parentId', '==', parentId)
    );
    const snapshot = await getDocs(q);
    let replies: CommentItem[] = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommentItem, 'id'>),
      }))
      .filter((c) => !c.isHidden);

    if (blockedUserIds.length > 0) {
      const blockedSet = new Set(blockedUserIds);
      replies = replies.filter((c) => !blockedSet.has(c.userId));
    }

    replies.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeA - timeB; // replies in chronological order
    });

    return replies;
  } catch (err) {
    console.error(`Failed to get replies for comment ${parentId}:`, err);
    return [];
  }
}

/**
 * Create a new comment or reply
 */
export async function createComment(data: {
  targetType: 'anime' | 'episode';
  animeId: string;
  animeSlug?: string;
  animeTitle?: string;
  episodeId?: string;
  episodeNumber?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: 'user' | 'moderator' | 'admin';
  content: string;
  isSpoiler?: boolean;
  parentId?: string | null;
  replyToUser?: string;
}): Promise<string> {
  try {
    const content = data.content.trim();
    if (!content) throw new Error('Comment content cannot be empty.');
    if (content.length > 500) throw new Error('Comment exceeds 500 characters limit.');

    const newCommentData = sanitizeData({
      targetType: data.targetType,
      animeId: data.animeId,
      animeSlug: data.animeSlug || '',
      animeTitle: data.animeTitle || '',
      episodeId: data.episodeId || '',
      episodeNumber: data.episodeNumber || null,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar || '',
      userRole: data.userRole || 'user',
      content,
      isSpoiler: Boolean(data.isSpoiler),
      likesCount: 0,
      repliesCount: 0,
      parentId: data.parentId || null,
      replyToUser: data.replyToUser || '',
      isEdited: false,
      isHidden: false,
      reportsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), newCommentData);

    // If this is a reply to an existing comment, increment the parent comment's reply counter
    if (data.parentId) {
      try {
        const parentDocRef = doc(db, COMMENTS_COLLECTION, data.parentId);
        const parentSnap = await getDoc(parentDocRef);
        if (parentSnap.exists()) {
          await updateDoc(parentDocRef, {
            repliesCount: increment(1),
          });

          // Send notification to the author of the parent comment
          const parentData = parentSnap.data() as CommentItem;
          if (parentData.userId && parentData.userId !== data.userId) {
            const targetLink =
              data.targetType === 'episode' && data.animeSlug && data.episodeNumber
                ? `/anime/${data.animeSlug}/episode/${data.episodeNumber}`
                : data.animeSlug
                ? `/anime/${data.animeSlug}`
                : `/browse`;

            await createNotification({
              userId: parentData.userId,
              title: 'New Reply to Your Comment',
              message: `${data.userName} replied: "${content.slice(0, 80)}${
                content.length > 80 ? '...' : ''
              }"`,
              link: targetLink,
              type: 'comment_reply',
              read: false,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to update parent comment or notify author:', err);
      }
    }

    return docRef.id;
  } catch (err) {
    console.error('Failed to create comment:', err);
    throw err;
  }
}

/**
 * Edit an existing comment
 */
export async function editComment(
  commentId: string,
  content: string,
  isSpoiler?: boolean
): Promise<void> {
  try {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Comment content cannot be empty.');
    if (trimmed.length > 500) throw new Error('Comment exceeds 500 characters limit.');

    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await updateDoc(docRef, {
      content: trimmed,
      ...(isSpoiler !== undefined ? { isSpoiler } : {}),
      isEdited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to edit comment ${commentId}:`, err);
    throw err;
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, parentId?: string | null): Promise<void> {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await deleteDoc(docRef);

    // If it was a reply, decrement parent comment's repliesCount
    if (parentId) {
      try {
        const parentDocRef = doc(db, COMMENTS_COLLECTION, parentId);
        await updateDoc(parentDocRef, {
          repliesCount: increment(-1),
        });
      } catch (e) {
        console.warn('Failed to decrement parent replies count:', e);
      }
    }
  } catch (err) {
    console.error(`Failed to delete comment ${commentId}:`, err);
    throw err;
  }
}

/**
 * Toggle Like on a comment
 */
export async function toggleCommentLike(
  commentId: string,
  userId: string,
  userName?: string
): Promise<{ liked: boolean; newLikesCount: number }> {
  try {
    const likeDocId = `${commentId}_${userId}`;
    const likeDocRef = doc(db, COMMENT_LIKES_COLLECTION, likeDocId);
    const likeSnap = await getDoc(likeDocRef);
    const commentDocRef = doc(db, COMMENTS_COLLECTION, commentId);
    const commentSnap = await getDoc(commentDocRef);

    let currentLikes = 0;
    let commentAuthorId = '';
    let animeSlug = '';
    let episodeNumber = 0;
    let targetType = 'anime';

    if (commentSnap.exists()) {
      const cData = commentSnap.data() as CommentItem;
      currentLikes = cData.likesCount || 0;
      commentAuthorId = cData.userId;
      animeSlug = cData.animeSlug || '';
      episodeNumber = cData.episodeNumber || 1;
      targetType = cData.targetType || 'anime';
    }

    if (likeSnap.exists()) {
      // User already liked -> Unlike
      await deleteDoc(likeDocRef);
      const newCount = Math.max(0, currentLikes - 1);
      await updateDoc(commentDocRef, {
        likesCount: increment(-1),
      });
      return { liked: false, newLikesCount: newCount };
    } else {
      // User has not liked -> Like
      await setDoc(likeDocRef, {
        commentId,
        userId,
        createdAt: serverTimestamp(),
      });
      const newCount = currentLikes + 1;
      await updateDoc(commentDocRef, {
        likesCount: increment(1),
      });

      // Send notification to author if author != liking user
      if (commentAuthorId && commentAuthorId !== userId) {
        const targetLink =
          targetType === 'episode' && animeSlug && episodeNumber
            ? `/anime/${animeSlug}/episode/${episodeNumber}`
            : animeSlug
            ? `/anime/${animeSlug}`
            : `/browse`;

        createNotification({
          userId: commentAuthorId,
          title: 'Someone Liked Your Comment',
          message: `${userName || 'A user'} liked your comment.`,
          link: targetLink,
          type: 'comment_like',
          read: false,
        }).catch((e) => console.warn('Failed to send like notification:', e));
      }

      return { liked: true, newLikesCount: newCount };
    }
  } catch (err) {
    console.error(`Failed to toggle like for comment ${commentId}:`, err);
    throw err;
  }
}

/**
 * Fetch list of comment IDs that the current user has liked
 */
export async function getUserLikedCommentIds(userId: string): Promise<Set<string>> {
  try {
    const q = query(
      collection(db, COMMENT_LIKES_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const set = new Set<string>();
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.commentId) set.add(data.commentId);
    });
    return set;
  } catch (err) {
    console.error('Failed to get user liked comment IDs:', err);
    return new Set();
  }
}

/**
 * Submit a report for a comment
 */
export async function reportComment(data: {
  commentId: string;
  commentContent: string;
  commentAuthorId: string;
  commentAuthorName: string;
  targetType: 'anime' | 'episode';
  animeId: string;
  animeTitle?: string;
  episodeNumber?: number;
  reporterUserId: string;
  reporterName?: string;
  reason: CommentReportReason;
  details?: string;
}): Promise<string> {
  try {
    // Check if user already reported this comment
    const q = query(
      collection(db, COMMENT_REPORTS_COLLECTION),
      where('commentId', '==', data.commentId),
      where('reporterUserId', '==', data.reporterUserId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      throw new Error('You have already submitted a report for this comment.');
    }

    const reportDoc = sanitizeData({
      commentId: data.commentId,
      commentContent: data.commentContent,
      commentAuthorId: data.commentAuthorId,
      commentAuthorName: data.commentAuthorName,
      targetType: data.targetType,
      animeId: data.animeId,
      animeTitle: data.animeTitle || '',
      episodeNumber: data.episodeNumber || null,
      reporterUserId: data.reporterUserId,
      reporterName: data.reporterName || 'Anonymous',
      reason: data.reason,
      details: data.details || '',
      status: 'pending' as CommentReportStatus,
      createdAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, COMMENT_REPORTS_COLLECTION), reportDoc);

    // Increment reportsCount on the comment
    try {
      const commentDocRef = doc(db, COMMENTS_COLLECTION, data.commentId);
      await updateDoc(commentDocRef, {
        reportsCount: increment(1),
      });
    } catch (e) {
      console.warn('Failed to increment comment report counter:', e);
    }

    return docRef.id;
  } catch (err) {
    console.error('Failed to report comment:', err);
    throw err;
  }
}

/**
 * Get all blocked users for a specific user
 */
export async function getUserBlocks(userId: string): Promise<UserBlockItem[]> {
  try {
    const q = query(
      collection(db, USER_BLOCKS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserBlockItem, 'id'>),
    }));
  } catch (err) {
    console.error(`Failed to get blocks for user ${userId}:`, err);
    return [];
  }
}

/**
 * Block a user
 */
export async function blockUser(
  userId: string,
  blockedUserId: string,
  blockedUserName?: string
): Promise<void> {
  try {
    if (userId === blockedUserId) throw new Error('You cannot block yourself.');
    const blockDocId = `${userId}_${blockedUserId}`;
    const docRef = doc(db, USER_BLOCKS_COLLECTION, blockDocId);
    await setDoc(docRef, {
      userId,
      blockedUserId,
      blockedUserName: blockedUserName || 'User',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to block user ${blockedUserId}:`, err);
    throw err;
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  try {
    const blockDocId = `${userId}_${blockedUserId}`;
    const docRef = doc(db, USER_BLOCKS_COLLECTION, blockDocId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to unblock user ${blockedUserId}:`, err);
    throw err;
  }
}

/**
 * Admin: Get all comments with search/filter capabilities
 */
export async function getAllCommentsAdmin(): Promise<CommentItem[]> {
  try {
    const snapshot = await getDocs(collection(db, COMMENTS_COLLECTION));
    const list: CommentItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CommentItem, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get all comments for admin:', err);
    return [];
  }
}

/**
 * Admin: Toggle comment visibility (Hide / Unhide)
 */
export async function toggleHideCommentAdmin(
  commentId: string,
  isHidden: boolean
): Promise<void> {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await updateDoc(docRef, {
      isHidden,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to toggle hide comment ${commentId}:`, err);
    throw err;
  }
}

/**
 * Admin: Get all comment reports
 */
export async function getAllCommentReports(): Promise<CommentReportItem[]> {
  try {
    const snapshot = await getDocs(collection(db, COMMENT_REPORTS_COLLECTION));
    const list: CommentReportItem[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CommentReportItem, 'id'>),
    }));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to get comment reports:', err);
    return [];
  }
}

/**
 * Admin: Update comment report status (reviewed / resolved / dismissed)
 */
export async function updateCommentReportStatus(
  reportId: string,
  status: CommentReportStatus
): Promise<void> {
  try {
    const docRef = doc(db, COMMENT_REPORTS_COLLECTION, reportId);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.error(`Failed to update comment report status ${reportId}:`, err);
    throw err;
  }
}
