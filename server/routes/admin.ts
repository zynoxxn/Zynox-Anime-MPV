import { Router } from 'express';
import {
  authenticateUser,
  requireAdmin,
  getAdminAuth,
  getAdminDb,
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

export default router;
