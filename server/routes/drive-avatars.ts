import { Router } from 'express';

const router = Router();

export const DEFAULT_DRIVE_FOLDER_ID = '1plDLKivxoAud9ONpLNst36wmZjnNGrLw';

interface CachedDriveData {
  folderId: string;
  timestamp: number;
  avatars: Array<{
    id: string;
    fileId: string;
    url: string;
    name: string;
    anime: string;
    category: string;
    accentColor: string;
  }>;
}

// In-memory cache with 5 minute TTL (300,000 ms)
const folderCache = new Map<string, CachedDriveData>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchGoogleDriveFolderAvatars(folderId: string = DEFAULT_DRIVE_FOLDER_ID, forceRefresh = false) {
  const cached = folderCache.get(folderId);
  const now = Date.now();

  if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.avatars;
  }

  const cleanFolderId = folderId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanFolderId) {
    throw new Error('Invalid Google Drive folder ID');
  }

  const folderUrl = `https://drive.google.com/drive/folders/${cleanFolderId}`;
  
  const response = await fetch(folderUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Drive folder (HTTP ${response.status})`);
  }

  const html = await response.text();

  const items: Array<{
    id: string;
    fileId: string;
    url: string;
    name: string;
    anime: string;
    category: string;
    accentColor: string;
  }> = [];
  const seenIds = new Set<string>();

  // Primary Regex: extract aria-label name and ssk fileId
  // e.g. aria-label="IMG-20261028-WA0000.jpg Image Shared" ... ssk="5:auSv138:1CxUW6itl6uWm0LNCAgF8TfoVzO9WC7US-0-16"
  const regex = /aria-label="([^"]+?)\s+Image\s+[^"]*"[^>]*ssk=["'][^:"']*:([^:"']+):([a-zA-Z0-9_-]{25,45})/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const rawName = match[1].trim();
    const rawIdPart = match[3];
    // Clean suffix if appended
    const fileId = rawIdPart.replace(/-0-\d+$/, '').replace(/-\d+$/, '');

    if (fileId.length >= 25 && !seenIds.has(fileId)) {
      seenIds.add(fileId);
      items.push({
        id: `gdrive-${fileId}`,
        fileId,
        url: `https://lh3.googleusercontent.com/d/${fileId}`,
        name: rawName.replace(/\.[^/.]+$/, ''), // strip extension for clean title
        anime: 'PFP Collection',
        category: 'Popular',
        accentColor: '#1683FF',
      });
    }
  }

  // Fallback regex if layout differed slightly
  if (items.length === 0) {
    const fallbackRegex = /ssk=["']5:[^:"']*:([a-zA-Z0-9_-]{33})(?:-[^"']*)?["']/g;
    let fbMatch: RegExpExecArray | null;
    let idx = 1;
    while ((fbMatch = fallbackRegex.exec(html)) !== null) {
      const fileId = fbMatch[1];
      if (fileId !== cleanFolderId && !seenIds.has(fileId)) {
        seenIds.add(fileId);
        items.push({
          id: `gdrive-${fileId}`,
          fileId,
          url: `https://lh3.googleusercontent.com/d/${fileId}`,
          name: `Avatar ${idx++}`,
          anime: 'PFP Collection',
          category: 'Popular',
          accentColor: '#1683FF',
        });
      }
    }
  }

  folderCache.set(cleanFolderId, {
    folderId: cleanFolderId,
    timestamp: now,
    avatars: items,
  });

  return items;
}

/**
 * GET /api/drive-avatars
 * Query params:
 *  - folderId: string (optional, defaults to user's folder)
 *  - refresh: boolean (optional, bypasses cache)
 */
router.get('/', async (req, res) => {
  try {
    const folderId = typeof req.query.folderId === 'string' && req.query.folderId.trim()
      ? req.query.folderId.trim()
      : DEFAULT_DRIVE_FOLDER_ID;

    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';

    const avatars = await fetchGoogleDriveFolderAvatars(folderId, forceRefresh);

    res.json({
      success: true,
      folderId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      count: avatars.length,
      cached: !forceRefresh && folderCache.has(folderId),
      avatars,
    });
  } catch (error: any) {
    console.error('[DRIVE AVATARS ERROR]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch avatars from Google Drive',
      avatars: [],
    });
  }
});

export default router;
