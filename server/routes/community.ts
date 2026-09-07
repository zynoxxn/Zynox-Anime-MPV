import { Router } from 'express';
import { getAdminDb } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createRateLimiter, sanitizeString } from '../security';

const router = Router();

// Strict rate limiter for community submissions: 15 submissions per 15 minutes per IP
const communitySubmissionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many submissions. Please wait 15 minutes before submitting another request.',
});

/**
 * POST /api/requests
 * Submits an anime request with server-side validation and sanitization.
 */
router.post('/requests', communitySubmissionLimiter, async (req, res) => {
  const { title, animeUrl, preferredLanguage, notes, userEmail, userId } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Anime title is required.' });
  }

  const cleanTitle = sanitizeString(title, 200);
  if (cleanTitle.length < 2) {
    return res.status(400).json({ error: 'Title is too short.' });
  }

  try {
    const db = getAdminDb();
    const docRef = await db.collection('animeRequests').add({
      title: cleanTitle,
      animeUrl: animeUrl ? sanitizeString(animeUrl, 500) : '',
      preferredLanguage: sanitizeString(preferredLanguage || 'HINDI_DUB', 50),
      notes: notes ? sanitizeString(notes, 1000) : '',
      userEmail: userEmail ? sanitizeString(userEmail, 200) : 'Guest',
      userId: userId ? sanitizeString(userId, 128) : null,
      status: 'pending', // Enforce pending status
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error('[SECURITY] Failed to save anime request:', err);
    res.status(500).json({ error: 'Failed to submit anime request.' });
  }
});

/**
 * POST /api/reports
 * Submits an episode playback report with validation and rate limiting.
 */
router.post('/reports', communitySubmissionLimiter, async (req, res) => {
  const { animeId, episodeId, animeTitle, episodeNumber, issueType, details, userEmail, userId } = req.body;

  if (!issueType || typeof issueType !== 'string') {
    return res.status(400).json({ error: 'Issue type is required.' });
  }

  try {
    const db = getAdminDb();
    const docRef = await db.collection('episodeReports').add({
      animeId: animeId ? sanitizeString(animeId, 128) : '',
      episodeId: episodeId ? sanitizeString(episodeId, 128) : '',
      animeTitle: animeTitle ? sanitizeString(animeTitle, 300) : '',
      episodeNumber: Number(episodeNumber) || 1,
      issueType: sanitizeString(issueType, 100),
      details: details ? sanitizeString(details, 1000) : '',
      userEmail: userEmail ? sanitizeString(userEmail, 200) : 'Guest',
      userId: userId ? sanitizeString(userId, 128) : null,
      status: 'open', // Enforce open status
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error('[SECURITY] Failed to save episode report:', err);
    res.status(500).json({ error: 'Failed to submit problem report.' });
  }
});

export default router;
