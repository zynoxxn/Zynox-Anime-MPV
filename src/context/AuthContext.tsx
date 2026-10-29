import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  getIdTokenResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types/user';
import { getFriendlyAuthErrorMessage } from '../lib/auth-errors';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  signUp: (displayName: string, email: string, pass: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  updateUserAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    // 1. Immediately grant admin rights to super admin email without any network delay
    const isSuperAdminEmail = currentUser.email?.toLowerCase().trim() === 'zairoxmax2.0@gmail.com';
    if (isSuperAdminEmail) {
      setIsAdmin(true);
    }

    try {
      let hasAdminClaim = isSuperAdminEmail;

      // Check custom claims with a 1000ms safety timeout
      try {
        const tokenPromise = getIdTokenResult(currentUser, false);
        const tokenResult = await Promise.race([
          tokenPromise,
          new Promise<null>((r) => setTimeout(() => r(null), 1000)),
        ]);
        if (tokenResult) {
          hasAdminClaim = isSuperAdminEmail || Boolean(
            tokenResult.claims.admin === true || 
            tokenResult.claims.role === 'admin'
          );
        }
      } catch (tokenErr) {
        console.warn('Error reading idTokenResult claims:', tokenErr);
      }

      setIsAdmin(hasAdminClaim);

      const defaultProfile: UserProfile = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || (hasAdminClaim ? 'Admin' : 'User'),
        email: currentUser.email || '',
        avatar: currentUser.photoURL || undefined,
        role: hasAdminClaim ? 'admin' : 'user',
        createdAt: new Date(),
      };

      // 2. Fetch or initialize Firestore user profile with 1200ms timeout
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docPromise = getDoc(userDocRef);
        const userDocSnap = await Promise.race([
          docPromise,
          new Promise<null>((r) => setTimeout(() => r(null), 1200)),
        ]);

        if (userDocSnap && userDocSnap.exists()) {
          const data = userDocSnap.data() as UserProfile;
          setUserProfile(data);
          if (hasAdminClaim || data.role === 'admin') {
            setIsAdmin(true);
          }
        } else {
          setUserProfile(defaultProfile);
        }
      } catch (firestoreErr) {
        console.warn('Firestore user profile offline/unavailable, using local auth session profile:', firestoreErr);
        setUserProfile(defaultProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile/claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let hasResolved = false;

    // Hard fallback: after 2000ms maximum, stop loading spinner regardless of network condition
    const safetyTimer = setTimeout(() => {
      if (!hasResolved) {
        console.warn('[Firebase Auth] Safety timeout reached, resolving loading state.');
        setLoading(false);
      }
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      hasResolved = true;
      clearTimeout(safetyTimer);
      if (typeof window !== 'undefined') {
        console.log(
          '[Firebase Auth] currentUser:',
          currentUser ? { uid: currentUser.uid, email: currentUser.email } : null
        );
      }
      await fetchUserData(currentUser);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const refreshAuth = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        // Force refresh ID token to get newly assigned custom claims
        await auth.currentUser.getIdToken(true);
      } catch (e) {
        console.error('Error refreshing token:', e);
      }
      await fetchUserData(auth.currentUser);
    }
  };

  const signUp = async (displayName: string, email: string, pass: string, avatar?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const createdUser = userCredential.user;

      // Update auth profile display name & photoURL safely
      try {
        const profileUpdate: { displayName: string; photoURL?: string | null } = {
          displayName: displayName.trim(),
        };
        // Firebase Auth photoURL has a 2048 character limit; data URLs or long URLs must not be sent
        if (avatar && avatar.length < 1500 && !avatar.startsWith('data:')) {
          profileUpdate.photoURL = avatar;
        }
        await updateProfile(createdUser, profileUpdate);
      } catch (pErr) {
        console.warn('Skipped Firebase Auth photoURL update:', pErr);
      }

      // Create document in users/{uid} with default role: 'user' and chosen avatar
      const userDocRef = doc(db, 'users', createdUser.uid);
      await setDoc(userDocRef, {
        uid: createdUser.uid,
        displayName: displayName.trim(),
        email: createdUser.email,
        avatar: avatar || null,
        role: 'user',
        createdAt: serverTimestamp(),
      });

      await fetchUserData(createdUser);
      return { success: true };
    } catch (err: any) {
      console.warn('[Firebase Auth Error] signup failed:', err?.code, err?.message);
      const message = getFriendlyAuthErrorMessage(err?.code || err?.message);
      return { success: false, error: message };
    }
  };

  const updateUserAvatar = async (avatarUrl: string) => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'User not signed in.' };
      }

      const currentUser = auth.currentUser;

      // 1. Update Firebase Auth Profile only if short regular URL (<1500 chars, not base64)
      // Firebase throws "Firebase: Photo URL too long. (auth/invalid-profile-attribute)" if >2048 chars
      if (avatarUrl && avatarUrl.length < 1500 && !avatarUrl.startsWith('data:')) {
        try {
          await updateProfile(currentUser, {
            photoURL: avatarUrl,
          });
        } catch (authErr) {
          console.warn('Firebase Auth updateProfile photoURL skipped or failed:', authErr);
        }
      }

      // 2. Update Firestore document (Firestore supports up to 1MB per document)
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { avatar: avatarUrl, updatedAt: serverTimestamp() }, { merge: true });
      } catch (fErr) {
        console.warn('Firestore avatar update warning:', fErr);
      }

      // 3. Update local state immediately
      setUserProfile((prev) => {
        if (!prev) return null;
        return { ...prev, avatar: avatarUrl };
      });

      return { success: true };
    } catch (err: any) {
      console.warn('[Firebase Auth Error] avatar update failed:', err);
      return { success: false, error: err?.message || 'Failed to update avatar.' };
    }
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      await fetchUserData(userCredential.user);
      return { success: true };
    } catch (err: any) {
      console.warn('[Firebase Auth Error] signin failed:', err?.code, err?.message);
      const message = getFriendlyAuthErrorMessage(err?.code || err?.message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      return { success: true };
    } catch (err: any) {
      const message = getFriendlyAuthErrorMessage(err?.code || err?.message);
      return { success: false, error: message };
    }
  };

  const isModerator = isAdmin || userProfile?.role === 'moderator';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAdmin,
        isModerator,
        loading,
        signUp,
        signIn,
        logout,
        updateUserAvatar,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
