import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from './firebase';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const POSTER_MAX_SIZE_MB = 5;
export const BANNER_MAX_SIZE_MB = 10;

/**
 * Validates selected image file type and size.
 */
export function validateImageFile(file: File, type: 'poster' | 'banner'): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file was selected.' };
  }

  // 1. Verify mime type
  const isImage = file.type.startsWith('image/');
  const isAccepted = ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase());
  if (!isImage || !isAccepted) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please upload JPG, PNG, or WEBP.`,
    };
  }

  // 2. Verify file size
  const maxMb = type === 'poster' ? POSTER_MAX_SIZE_MB : BANNER_MAX_SIZE_MB;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds ${maxMb}MB limit. Selected image is ${sizeMb}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Helper to determine clean file extension.
 */
function getExtension(file: File): string {
  if (file.name && file.name.includes('.')) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  }
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/png') return 'png';
  return 'jpg';
}

/**
 * Checks if a given URL is a Firebase Storage download URL.
 */
export function isFirebaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com')
  );
}

/**
 * Extracts storage path from a Firebase Storage download URL if possible.
 */
export function extractStoragePathFromUrl(url: string): string | null {
  if (!isFirebaseStorageUrl(url)) return null;
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/o\/(.+)$/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Ignore invalid URLs
  }
  return null;
}

/**
 * Safely deletes a previously uploaded file from Firebase Storage.
 * Fails silently so replacing never breaks if old URL is an external link or already deleted.
 */
export async function safeDeleteStorageFile(pathOrUrl: string): Promise<boolean> {
  if (!pathOrUrl) return false;
  try {
    const path = pathOrUrl.startsWith('http')
      ? extractStoragePathFromUrl(pathOrUrl)
      : pathOrUrl;

    if (!path) return false;

    // Only delete files under /zynox-anime/
    if (!path.startsWith('zynox-anime/')) return false;

    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return true;
  } catch (err: any) {
    // If client delete is forbidden or file doesn't exist, try server route or ignore
    console.warn('[Storage] Notice during delete operation (safely handled):', err?.message || err);
    return false;
  }
}

export interface UploadOptions {
  file: File;
  animeId?: string;
  type: 'poster' | 'banner';
  onProgress?: (percentage: number) => void;
}

/**
 * Uploads an anime poster or banner directly to Firebase Storage.
 * Automatically tries client-side direct upload first, and falls back to
 * secure server-side admin upload if client network or rule restrictions occur.
 */
export async function uploadAnimeImage({
  file,
  animeId,
  type,
  onProgress,
}: UploadOptions): Promise<{ downloadUrl: string; storagePath: string }> {
  // Validate before attempting
  const validation = validateImageFile(file, type);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  // Determine organized path according to user requirements:
  // /zynox-anime/posters/{animeId}/{filename}
  // /zynox-anime/banners/{animeId}/{filename}
  const folder = type === 'poster' ? 'posters' : 'banners';
  const cleanAnimeId = (animeId || 'new_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = getExtension(file);
  const uniqueId = Math.random().toString(36).substring(2, 8);
  const filename = `${type}_${Date.now()}_${uniqueId}.${ext}`;
  const storagePath = `zynox-anime/${folder}/${cleanAnimeId}/${filename}`;

  // 1. Try Direct Client Upload using Firebase Storage SDK
  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type || (ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg'),
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        animeId: cleanAnimeId,
        imageType: type,
        uploader: auth.currentUser?.email || 'admin',
      },
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(pct);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve(url);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    return { downloadUrl, storagePath };
  } catch (clientErr: any) {
    console.warn('[Storage] Client direct upload failed, attempting secure server proxy fallback:', clientErr?.message || clientErr);

    // 2. Fallback: Server-side upload route via Firebase Admin SDK
    return await uploadViaServerProxy(file, cleanAnimeId, type, storagePath, onProgress);
  }
}

/**
 * Fallback uploader that sends the image to the backend server endpoint
 * when direct client Firebase Storage upload encounters permission or network issues.
 */
async function uploadViaServerProxy(
  file: File,
  animeId: string,
  type: 'poster' | 'banner',
  storagePath: string,
  onProgress?: (pct: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (onProgress) onProgress(20);

  const base64Data = await fileToBase64(file);
  if (onProgress) onProgress(50);

  // Force refresh token if needed so we never pass an expired or stale ID token to the server
  let token: string | undefined;
  try {
    token = await auth.currentUser?.getIdToken(true);
  } catch (tokenErr) {
    console.warn('[Storage] Notice fetching fresh ID token:', tokenErr);
    token = await auth.currentUser?.getIdToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/admin/storage/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base64: base64Data,
      contentType: file.type,
      animeId,
      imageType: type,
      storagePath,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson.error || `Upload failed with HTTP status ${response.status}`;
    throw new Error(message);
  }

  const result = await response.json();
  if (onProgress) onProgress(100);

  return {
    downloadUrl: result.downloadUrl,
    storagePath: result.storagePath || storagePath,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      // Extract pure base64 without prefix if present
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
