const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { patchUser, grantPresenceXp } = require('../services/users');
const { sanitizeUser } = require('../lib/auth');
const bcrypt = require('bcryptjs');
const { logAuditFromRequest } = require('../services/auditLog');

const router = express.Router();

router.patch('/profile', requireAuth, async (req, res) => {
  const { username, avatar } = req.body || {};

  const updates = {};
  if (typeof username === 'string' && username.trim()) {
    updates.username = username.trim();
  }
  if (typeof avatar === 'string') {
    updates.avatar = avatar;
  }

  const updated = await patchUser(req.auth.user.id, updates);
  await logAuditFromRequest(req, {
    action: 'account_profile_update',
    targetType: 'user',
    targetId: req.auth.user.id,
    meta: { changedFields: Object.keys(updates) },
  });
  return res.json({ user: sanitizeUser(updated) });
});

router.post('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  const isValid = await bcrypt.compare(String(currentPassword), req.auth.user.passwordHash || '');
  if (!isValid) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(String(newPassword), 10);
  const updated = await patchUser(req.auth.user.id, { passwordHash: hash });
  await logAuditFromRequest(req, {
    action: 'account_password_change',
    targetType: 'user',
    targetId: req.auth.user.id,
  });
  return res.json({ user: sanitizeUser(updated) });
});

router.post('/presence', requireAuth, async (req, res) => {
  const updated = await grantPresenceXp(req.auth.user.id, 1, 60000);
  return res.json({ user: sanitizeUser(updated) });
});

module.exports = router;
