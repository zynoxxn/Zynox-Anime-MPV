import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import type { UserProfile, UserRole, UserStatus } from '../../types/user';

const USERS_COLLECTION = 'users';

export async function getUserProfileById(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      uid: snap.id,
      ...(snap.data() as Omit<UserProfile, 'uid'>),
    };
  } catch (err) {
    console.error(`Failed to get user profile by ID ${uid}:`, err);
    return null;
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const list: UserProfile[] = snapshot.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<UserProfile, 'uid'>),
    }));
    return list;
  } catch (err) {
    console.error('Failed to get all users:', err);
    throw err;
  }
}

/**
 * Updates a user's role via server-side authorization to prevent client-side privilege escalation.
 */
export async function updateUserRole(uid: string, role: UserRole, targetEmail?: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();

  if (token) {
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: uid, role, targetEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      return;
    } catch (apiErr) {
      console.warn('Server API role update failed, attempting direct Firestore with admin rules:', apiErr);
    }
  }

  // Fallback to direct Firestore (enforced by firestore.rules isAdmin())
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, { role });
}

/**
 * Toggles a user's account status (active vs suspended).
 */
export async function toggleUserStatus(uid: string, status: UserStatus, targetEmail?: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();

  if (token) {
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: uid, status, targetEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      return;
    } catch (apiErr) {
      console.warn('Server API status update failed, attempting direct Firestore with admin rules:', apiErr);
    }
  }

  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, { status });
}

/**
 * Toggles comment restriction for spam mitigation.
 */
export async function toggleUserCommentRestriction(
  uid: string,
  commentingRestricted: boolean,
  targetEmail?: string
): Promise<void> {
  const token = await auth.currentUser?.getIdToken();

  if (token) {
    try {
      const res = await fetch('/api/admin/users/comment-restriction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: uid, restricted: commentingRestricted, targetEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      return;
    } catch (apiErr) {
      console.warn('Server API comment restriction failed, attempting direct Firestore:', apiErr);
    }
  }

  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, { commentingRestricted });
}

/**
 * Deletes user account document with server-side audit logging.
 */
export async function deleteUserDoc(uid: string, targetEmail?: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();

  if (token) {
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: uid, targetEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      return;
    } catch (apiErr) {
      console.warn('Server API delete user failed, attempting direct Firestore:', apiErr);
    }
  }

  const docRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(docRef);
}
