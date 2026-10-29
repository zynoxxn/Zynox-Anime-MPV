import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import rawConfig from '../../firebase-applet-config.json';

// Configure Firestore SDK logging to silent to suppress transient connection retry notices
try {
  setLogLevel('silent');
} catch {
  // Ignore
}

const firebaseConfig = {
  apiKey: rawConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: rawConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: rawConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: rawConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: rawConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: rawConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Developer diagnostics (No sensitive keys or secrets)
if (typeof window !== 'undefined') {
  console.log('[Firebase Init] projectId:', firebaseConfig.projectId);
  console.log('[Firebase Init] auth initialized:', Boolean(auth));
}

const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const isDefaultAppletProject = !envProjectId || envProjectId === rawConfig.projectId;

// Use provisioned firestore database ID only for default applet project or when explicitly provided in env
const envDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;
const databaseId = envDatabaseId 
  ? (envDatabaseId !== '(default)' ? envDatabaseId : undefined)
  : (isDefaultAppletProject && rawConfig.firestoreDatabaseId && rawConfig.firestoreDatabaseId !== '(default)' 
      ? rawConfig.firestoreDatabaseId 
      : undefined);

let firestoreInstance: Firestore;
try {
  // Initialize Firestore with standard default WebChannel configuration (WebSocket with auto-detected long-polling fallback)
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
} catch {
  try {
    firestoreInstance = databaseId
      ? initializeFirestore(app, {}, databaseId)
      : initializeFirestore(app, {});
  } catch {
    firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db: Firestore = firestoreInstance;

export default app;
