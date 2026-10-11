import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import type { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';

export const PRIMARY_SUPER_ADMIN_EMAIL = 'zairoxmax2.0@gmail.com';

// Express request interface augmentation
export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  isAdminUser?: boolean;
}

let adminApp: App | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: Storage | null = null;

// Cache for Google public certificates
let cachedGoogleCerts: Record<string, string> | null = null;
let googleCertsExpiry = 0;

function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && Date.now() < googleCertsExpiry) {
    return Promise.resolve(cachedGoogleCerts);
  }
  return new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const certs = JSON.parse(data);
          const maxAge = res.headers['cache-control']?.match(/max-age=(\d+)/)?.[1];
          googleCertsExpiry = Date.now() + (maxAge ? parseInt(maxAge, 10) * 1000 : 3600000);
          cachedGoogleCerts = certs;
          resolve(certs);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function verifyViaIdentityToolkitApi(token: string, apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ idToken: token });
    const req = https.request(
      {
        hostname: 'identitytoolkit.googleapis.com',
        path: '/v1/accounts:lookup?key=' + apiKey,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode === 200 && json.users && json.users.length > 0) {
              const u = json.users[0];
              resolve({
                uid: u.localId,
                sub: u.localId,
                email: u.email,
                email_verified: Boolean(u.emailVerified),
                name: u.displayName,
                picture: u.photoUrl,
                aud: getAdminApp().options.projectId,
                iss: `https://securetoken.google.com/${getAdminApp().options.projectId}`,
              });
            } else {
              const errMsg = json.error?.message || 'Token verification failed';
              const err = new Error(errMsg);
              (err as any).code = errMsg;
              reject(err);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function verifyViaGoogleCert(token: string, projectId: string): Promise<DecodedIdToken> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token');
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

  if (!header.kid) {
    throw new Error('Token header missing key ID (kid)');
  }

  const certs = await fetchGooglePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown certificate key ID');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(parts[0] + '.' + parts[1]);
  const isValid = verifier.verify(cert, parts[2], 'base64url');
  if (!isValid) {
    throw new Error('Invalid token cryptographic signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    const expired = new Error('auth/id-token-expired');
    (expired as any).code = 'auth/id-token-expired';
    throw expired;
  }

  return {
    uid: payload.sub || payload.user_id,
    sub: payload.sub || payload.user_id,
    email: payload.email,
    email_verified: Boolean(payload.email_verified),
    name: payload.name,
    picture: payload.picture,
    admin: payload.admin,
    role: payload.role,
    aud: payload.aud,
    iss: payload.iss,
    ...payload,
  } as DecodedIdToken;
}

/**
 * Resilient multi-tier Firebase ID Token verification:
 * 1. Firebase Admin SDK verifyIdToken
 * 2. Cryptographic verification using Google public certificates
 * 3. Identity Toolkit lookup REST API
 * 4. Token expiration detection
 */
async function verifyFirebaseIdTokenResilient(token: string): Promise<DecodedIdToken> {
  // Tier 1: Firebase Admin SDK standard verification
  try {
    const auth = getAdminAuth();
    return await auth.verifyIdToken(token);
  } catch (adminErr: any) {
    if (adminErr?.code === 'auth/id-token-expired') {
      throw adminErr;
    }

    // Tier 2: Cryptographic verification using Google Public Certificates
    try {
      const projId = getAdminApp().options.projectId || 'ordinal-summer-jdckx';
      return await verifyViaGoogleCert(token, projId);
    } catch (certErr: any) {
      if (certErr?.code === 'auth/id-token-expired') {
        throw certErr;
      }
    }

    // Tier 3: Check via Identity Toolkit REST API with applet API key
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.apiKey) {
          const userRecord = await verifyViaIdentityToolkitApi(token, parsed.apiKey);
          return userRecord as DecodedIdToken;
        }
      }
    } catch (apiErr: any) {
      if (apiErr?.code === 'TOKEN_EXPIRED') {
        const expired = new Error('auth/id-token-expired');
        (expired as any).code = 'auth/id-token-expired';
        throw expired;
      }
    }

    throw adminErr;
  }
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID;
  let storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'ordinal-summer-jdckx.firebasestorage.app';

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!projectId) {
        projectId = parsed.projectId || parsed.project_id;
      }
      if (parsed.storageBucket) {
        storageBucket = parsed.storageBucket;
      }
    }
  } catch {
    // Fallback
  }

  adminApp = initializeApp({
    projectId: projectId || 'ordinal-summer-jdckx',
    storageBucket: storageBucket,
  });

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getAdminApp());
  }
  return authInstance;
}

export function getAdminDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getAdminApp());
  }
  return firestoreInstance;
}

export function getAdminStorage(): Storage {
  if (!storageInstance) {
    storageInstance = getStorage(getAdminApp());
  }
  return storageInstance;
}

export function getAdminStorageBucket() {
  const st = getAdminStorage();
  return st.bucket();
}

/**
 * Middleware: Verifies Firebase Auth ID Token supplied in Authorization header.
 * Attaches decoded token to req.user.
 * Rejects unauthenticated callers with HTTP 401.
 */
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication token is required.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid Bearer token format.',
      code: 'AUTH_TOKEN_INVALID',
    });
  }

  try {
    const decodedToken = await verifyFirebaseIdTokenResilient(token);
    req.user = decodedToken;
    next();
  } catch (err: any) {
    const isExpired = err?.code === 'auth/id-token-expired';
    return res.status(401).json({
      error: isExpired
        ? 'Authentication token has expired. Please sign in again.'
        : 'Invalid or revoked authentication token.',
      code: isExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
    });
  }
}

/**
 * Checks whether the given user possesses verified administrator privileges.
 */
export async function checkUserIsAdmin(user: DecodedIdToken): Promise<boolean> {
  if (!user || !user.uid) return false;

  const email = (user.email || '').toLowerCase().trim();

  // 1. Primary super admin email match
  if (email === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 2. Custom claims check (admin: true or role: 'admin')
  if (user.admin === true || user.role === 'admin') {
    return true;
  }

  // 3. Check Firestore users collection as verification fallback
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data?.role === 'admin') {
        return true;
      }
    }
  } catch {
    // Continue
  }

  return false;
}

/**
 * Middleware: Strictly requires server-verified administrator access.
 * Returns HTTP 401 if unauthenticated, HTTP 403 if authenticated but not admin.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized: User is not authenticated.',
      code: 'AUTH_REQUIRED',
    });
  }

  const isAdmin = await checkUserIsAdmin(req.user);
  if (!isAdmin) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
    console.warn(`[SECURITY] Unauthorized admin attempt by UID: ${req.user.uid} (${req.user.email}) from IP: ${ip}`);

    return res.status(403).json({
      error: 'Forbidden: Administrator privileges required to access this resource.',
      code: 'FORBIDDEN_ADMIN_REQUIRED',
    });
  }

  req.isAdminUser = true;
  next();
}

/**
 * Records an immutable audit log entry in Firestore.
 */
export async function recordAdminAuditLog(entry: {
  adminUid: string;
  adminEmail: string;
  action: string;
  resource: string;
  targetId?: string;
  details?: string;
  ip?: string;
}) {
  try {
    const db = getAdminDb();
    await db.collection('admin_activity_logs').add({
      adminUid: entry.adminUid,
      adminEmail: entry.adminEmail,
      action: entry.action,
      resource: entry.resource,
      targetId: entry.targetId || null,
      details: entry.details || null,
      ip: entry.ip || 'server',
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[SECURITY] Failed to write admin audit log:', err);
  }
}
