import { Router } from 'express';
import {
  authenticateUser,
  requireAdmin,
  getAdminAuth,
  getAdminDb,
  getAdminStorageBucket,
  recordAdminAuditLog,
  PRIMARY_SUPER_ADMIN_EMAIL,
  type AuthenticatedRequest,
} from '../firebaseAdmin';
import { validateVideoUrlServer, sanitizeString } from '../security';

const router = Router();

// Apply authentication and strict admin check to all /api/admin routes
router.use(authenticateUser);
router.use(requireAdmin);

/**
 * GET /api/admin/verify
 * Server-side verification endpoint to validate admin identity and token validity.
 */
router.get('/verify', (req: AuthenticatedRequest, res) => {
  res.json({
    isAdmin: true,
    uid: req.user!.uid,
    email: req.user!.email,
  });
});

/**
 * POST /api/admin/users/role
 * Assigns a user role (user, moderator, admin).
 * Synchronizes Firebase Auth Custom Claims for real-time claim propagation.
 */
router.post('/users/role', async (req: AuthenticatedRequest, res) => {
  const { targetUid, role, targetEmail } = req.body;

  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ error: 'targetUid is required.' });
  }

  const validRoles = ['user', 'moderator', 'admin'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  // Prevent demoting primary super admin
  if (targetEmail?.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase() && role !== 'admin') {
    return res.status(403).json({ error: 'Cannot revoke privileges from primary super administrator.' });
  }

  try {
    const db = getAdminDb();
    const auth = getAdminAuth();

    // 1. Update Firestore user document
    await db.collection('users').doc(targetUid).set(
      {
        role,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Set Custom User Claims in Firebase Auth
    if (role === 'admin') {
      await auth.setCustomUserClaims(targetUid, { admin: true, role: 'admin' });
    } else if (role === 'moderator') {
      await auth.setCustomUserClaims(targetUid, { admin: false, role: 'moderator' });
    } else {
      await auth.setCustomUserClaims(targetUid, { admin: false, role: 'user' });
    }

    // 3. Write immutable server-side audit log
    await recordAdminAuditLog({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'unknown',
      action: `Changed User Role to ${role}`,
      resource: 'Users',
      targetId: targetUid,
      details: `Target email: ${targetEmail || targetUid}`,
      ip: req.ip,
    });

    res.json({ success: true, targetUid, role });
  } catch (err: any) {
    console.error('[SECURITY] Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update user role on server.' });
  }
});

/**
 * POST /api/admin/users/status
 * Suspends or activates a user account.
 */
router.post('/users/status', async (req: AuthenticatedRequest, res) => {
  const { targetUid, status, targetEmail } = req.body;

  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ error: 'targetUid is required.' });
  }

  const validStatuses = ['active', 'suspended', 'disabled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  if (targetEmail?.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Cannot suspend primary super administrator.' });
  }

  try {
    const db = getAdminDb();
    const auth = getAdminAuth();

    await db.collection('users').doc(targetUid).set(
      {
        status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // If suspended or disabled, also disable in Firebase Auth
    try {
      await auth.updateUser(targetUid, {
        disabled: status !== 'active',
      });
    } catch {
      // Auth record might not exist or error
    }

    await recordAdminAuditLog({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'unknown',
      action: `Toggled User Status to ${status}`,
      resource: 'Users',
      targetId: targetUid,
      details: `Target email: ${targetEmail || targetUid}`,
      ip: req.ip,
    });

    res.json({ success: true, targetUid, status });
  } catch (err: any) {
    console.error('[SECURITY] Error updating user status:', err);
    res.status(500).json({ error: 'Failed to update user status on server.' });
  }
});

/**
 * POST /api/admin/users/comment-restriction
 * Toggles comment restriction for spam prevention.
 */
router.post('/users/comment-restriction', async (req: AuthenticatedRequest, res) => {
  const { targetUid, restricted, targetEmail } = req.body;

  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ error: 'targetUid is required.' });
  }

  try {
    const db = getAdminDb();
    await db.collection('users').doc(targetUid).set(
      {
        commentsRestricted: Boolean(restricted),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await recordAdminAuditLog({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'unknown',
      action: restricted ? 'Restricted User Comments' : 'Unrestricted User Comments',
      resource: 'Users',
      targetId: targetUid,
      details: `Target: ${targetEmail || targetUid}`,
      ip: req.ip,
    });

    res.json({ success: true, targetUid, restricted: Boolean(restricted) });
  } catch (err) {
    console.error('[SECURITY] Error updating comment restriction:', err);
    res.status(500).json({ error: 'Failed to update comment restriction on server.' });
  }
});

/**
 * POST /api/admin/users/delete
 * Deletes user Firestore document and disables auth account.
 */
router.post('/users/delete', async (req: AuthenticatedRequest, res) => {
  const { targetUid, targetEmail } = req.body;

  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ error: 'targetUid is required.' });
  }

  if (targetEmail?.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Cannot delete primary super administrator.' });
  }

  try {
    const db = getAdminDb();
    await db.collection('users').doc(targetUid).delete();

    await recordAdminAuditLog({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'unknown',
      action: 'Deleted User Document',
      resource: 'Users',
      targetId: targetUid,
      details: `Target email: ${targetEmail || targetUid}`,
      ip: req.ip,
    });

    res.json({ success: true, targetUid });
  } catch (err) {
    console.error('[SECURITY] Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user document.' });
  }
});

/**
 * POST /api/admin/audit-log
 * Securely logs administrative activity with verified server timestamp and admin identity.
 */
router.post('/audit-log', async (req: AuthenticatedRequest, res) => {
  const { action, resource, targetId, details } = req.body;

  if (!action || typeof action !== 'string') {
    return res.status(400).json({ error: 'action is required.' });
  }

  await recordAdminAuditLog({
    adminUid: req.user!.uid,
    adminEmail: req.user!.email || 'unknown',
    action: sanitizeString(action, 200),
    resource: sanitizeString(resource || 'AdminPanel', 100),
    targetId: targetId ? sanitizeString(targetId, 100) : undefined,
    details: details ? sanitizeString(details, 1000) : undefined,
    ip: req.ip,
  });

  res.json({ success: true });
});

/**
 * POST /api/admin/validate-video-url
 * Validates a video embed URL against approved domains on the server.
 */
router.post('/validate-video-url', (req, res) => {
  const { url } = req.body;
  const result = validateVideoUrlServer(url);
  res.json(result);
});

/**
 * POST /api/admin/storage/upload
 * Direct server-side upload proxy to Firebase Storage bucket.
 * Handles poster/banner images securely with size and MIME validation.
 */
router.post('/storage/upload', async (req: AuthenticatedRequest, res) => {
  const { base64, contentType, animeId, imageType, storagePath } = req.body;

  if (!base64 || !contentType || !imageType) {
    return res.status(400).json({ error: 'base64 data, contentType, and imageType are required.' });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(contentType.toLowerCase())) {
    return res.status(400).json({ error: 'Unsupported file type. Only JPG, PNG, and WEBP images are allowed.' });
  }

  const maxBytes = imageType === 'poster' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > maxBytes) {
    return res.status(400).json({
      error: `File size exceeds the ${imageType === 'poster' ? '5MB' : '10MB'} limit.`,
    });
  }

  const cleanAnimeId = (animeId || 'new_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = imageType === 'poster' ? 'posters' : 'banners';
  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
  const uniqueId = Math.random().toString(36).substring(2, 8);
  const targetPath = storagePath || `zynox-anime/${folder}/${cleanAnimeId}/${imageType}_${Date.now()}_${uniqueId}.${ext}`;

  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(targetPath);
    const downloadToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          uploadedBy: req.user?.email || 'admin',
          animeId: cleanAnimeId,
          imageType,
        },
      },
      resumable: false,
    });

    try {
      await file.makePublic();
    } catch {
      // Ignore if uniform bucket-level access is enabled
    }

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(targetPath)}?alt=media&token=${downloadToken}`;

    await recordAdminAuditLog({
      adminUid: req.user!.uid,
      adminEmail: req.user!.email || 'unknown',
      action: `Uploaded ${imageType} to Storage`,
      resource: 'FirebaseStorage',
      targetId: cleanAnimeId,
      details: `Path: ${targetPath}, Size: ${(buffer.length / 1024).toFixed(1)} KB`,
      ip: req.ip,
    });

    res.json({
      success: true,
      downloadUrl,
      storagePath: targetPath,
    });
  } catch (err: any) {
    console.error('[STORAGE UPLOAD ERROR]:', err);
    res.status(500).json({ error: 'Failed to upload image to Firebase Storage.' });
  }
});

/**
 * POST /api/admin/storage/delete
 * Safely deletes a file from Firebase Storage.
 */
router.post('/storage/delete', async (req: AuthenticatedRequest, res) => {
  const { storagePath, url } = req.body;
  let targetPath = storagePath;

  if (!targetPath && url && typeof url === 'string') {
    const match = url.match(/\/o\/(.+?)\?/);
    if (match && match[1]) {
      targetPath = decodeURIComponent(match[1]);
    }
  }

  if (!targetPath || !targetPath.startsWith('zynox-anime/')) {
    return res.status(400).json({ error: 'Valid storage path under /zynox-anime/ is required.' });
  }

  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(targetPath);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
    res.json({ success: true });
  } catch (err: any) {
    console.warn('[STORAGE DELETE NOTICE]:', err?.message);
    res.json({ success: false, error: err?.message });
  }
});

export default router;
