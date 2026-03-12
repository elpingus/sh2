const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { readDb, updateDb } = require('../lib/db');
const { sanitizeUser } = require('../lib/auth');
const { getPlanLimits, PLAN_LIMITS } = require('../lib/plans');
const { logAuditFromRequest, listAuditLogs } = require('../services/auditLog');
const { patchUser, setPassword, getUserById } = require('../services/users');

function requireAdmin(req, res, next) {
  if (!req.auth?.user?.isAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}

const PLAN_PRICES = {
  free: 0,
  basic: 0.99,
  plus: 1.99,
  premium: 3.99,
  ultimate: 9.99,
  lifetime: 25,
};

function adminRoutes() {
  const router = express.Router();

  router.use(requireAuth, requireAdmin);

  router.get('/stats', (req, res) => {
    const db = readDb();
    const users = db.users || [];
    const purchases = Array.isArray(db.purchases) ? db.purchases : [];
    const boostJobs = db.boostJobs && typeof db.boostJobs === 'object' ? db.boostJobs : {};
    const startedJobs = Object.values(boostJobs).filter((job) => job && job.state === 'started');

    const stats = {
      totalUsers: users.length,
      activeUsers: startedJobs.length,
      paidUsers: users.filter((u) => u.plan !== 'free').length,
      totalRevenue: purchases
        .filter((purchase) => purchase && ['paid', 'redeemed'].includes(String(purchase.status)))
        .reduce((acc, purchase) => acc + (Number(purchase.total) || 0), 0),
      planBreakdown: Object.keys(PLAN_PRICES).reduce((acc, plan) => {
        acc[plan] = users.filter((u) => u.plan === plan).length;
        return acc;
      }, {}),
    };

    return res.json({ stats });
  });

  router.get('/users', (req, res) => {
    const db = readDb();
    return res.json({ users: (db.users || []).map(sanitizeUser) });
  });

  router.get('/users/:userId/history', (req, res) => {
    const { userId } = req.params;
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const db = readDb();
    const events = (db.auditLogs || [])
      .filter((entry) => String(entry.actorId) === String(userId) || String(entry.targetId) === String(userId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 50);

    return res.json({
      history: {
        loginHistory: user.loginHistory || [],
        ipAddresses: user.ipAddresses || [],
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIp: user.lastLoginIp || null,
        lastDevice: user.lastDevice || null,
        auditEvents: events,
      },
    });
  });

  router.get('/reviews', (req, res) => {
    const db = readDb();
    return res.json({ reviews: Array.isArray(db.reviews) ? db.reviews : [] });
  });

  router.delete('/reviews/:reviewId', async (req, res) => {
    const { reviewId } = req.params;
    let removed = false;
    await updateDb((current) => {
      const before = Array.isArray(current.reviews) ? current.reviews.length : 0;
      current.reviews = (current.reviews || []).filter((review) => review.id !== reviewId);
      removed = current.reviews.length !== before;
      return current;
    });

    if (!removed) {
      return res.status(404).json({ message: 'Review not found' });
    }
    await logAuditFromRequest(req, {
      action: 'admin_review_delete',
      targetType: 'review',
      targetId: reviewId,
    });
    return res.json({ ok: true });
  });

  router.get('/audit-logs', (req, res) => {
    const { limit, actorId, action } = req.query || {};
    const logs = listAuditLogs({
      limit: Number(limit) || 200,
      actorId: actorId ? String(actorId) : null,
      action: action ? String(action) : null,
    });
    return res.json({ logs });
  });

  router.get('/coupons', (req, res) => {
    const db = readDb();
    return res.json({ coupons: db.coupons || [] });
  });

  router.post('/coupons', async (req, res) => {
    const { code, type, value, expiresAt } = req.body || {};
    const normalized = String(code || '').trim().toUpperCase();
    const numeric = Number(value);
    if (!normalized || !['percent', 'fixed'].includes(type) || !Number.isFinite(numeric) || numeric <= 0) {
      return res.status(400).json({ message: 'Invalid coupon payload' });
    }
    const normalizedExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
      return res.status(400).json({ message: 'Invalid coupon expiry date' });
    }

    await updateDb((current) => {
      const exists = current.coupons.find((c) => c.code === normalized);
      if (exists) {
        exists.type = type;
        exists.value = numeric;
        exists.active = true;
        exists.expiresAt = normalizedExpiresAt;
      } else {
        current.coupons.push({
          id: `CPN-${Date.now()}`,
          code: normalized,
          type,
          value: numeric,
          active: true,
          expiresAt: normalizedExpiresAt,
          createdAt: new Date().toISOString(),
        });
      }
      return current;
    });
    await logAuditFromRequest(req, {
      action: 'admin_coupon_upsert',
      targetType: 'coupon',
      targetId: normalized,
      meta: { type, value: numeric, expiresAt: normalizedExpiresAt },
    });

    return res.json({ ok: true });
  });

  router.delete('/coupons/:couponId', async (req, res) => {
    const { couponId } = req.params;
    let removedCoupon = null;

    await updateDb((current) => {
      const coupons = current.coupons || [];
      const target = coupons.find((coupon) => coupon.id === couponId || coupon.code === couponId);
      if (!target) {
        return current;
      }
      removedCoupon = target;
      current.coupons = coupons.filter((coupon) => coupon.id !== target.id);
      return current;
    });

    if (!removedCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    await logAuditFromRequest(req, {
      action: 'admin_coupon_delete',
      targetType: 'coupon',
      targetId: removedCoupon.id,
      meta: { code: removedCoupon.code },
    });

    return res.json({ ok: true });
  });

  router.post('/users/:userId/gift-plan', async (req, res) => {
    const { userId } = req.params;
    const { plan, resetHours = true } = req.body || {};

    if (!plan || !PLAN_LIMITS[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    let updated = null;
    await updateDb((current) => {
      const idx = current.users.findIndex((u) => u.id === userId);
      if (idx === -1) return current;

      const limits = getPlanLimits(plan);
      const currentHours = Number(current.users[idx].hoursLeft) || 0;
      current.users[idx] = {
        ...current.users[idx],
        plan,
        maxGames: limits.maxGames,
        hoursLeft: resetHours ? limits.hours : Math.max(currentHours, limits.hours),
      };
      updated = current.users[idx];
      return current;
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    await logAuditFromRequest(req, {
      action: 'admin_user_gift_plan',
      targetType: 'user',
      targetId: userId,
      meta: { plan, resetHours: Boolean(resetHours) },
    });

    return res.json({ user: sanitizeUser(updated) });
  });

  router.post('/users/:userId/add-hours', async (req, res) => {
    const { userId } = req.params;
    const { hours } = req.body || {};
    const numericHours = Number(hours);

    if (!Number.isFinite(numericHours) || numericHours === 0) {
      return res.status(400).json({ message: 'Hours delta must be a non-zero number' });
    }

    let updated = null;
    await updateDb((current) => {
      const idx = current.users.findIndex((u) => u.id === userId);
      if (idx === -1) return current;

      const oldHours = Number(current.users[idx].hoursLeft) || 0;
      current.users[idx] = {
        ...current.users[idx],
        hoursLeft: Math.max(0, oldHours + numericHours),
      };
      updated = current.users[idx];
      return current;
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    await logAuditFromRequest(req, {
      action: 'admin_user_add_hours',
      targetType: 'user',
      targetId: userId,
      meta: { hours: numericHours },
    });

    return res.json({ user: sanitizeUser(updated) });
  });

  router.post('/users/:userId/set-hours', async (req, res) => {
    const { userId } = req.params;
    const { hours } = req.body || {};
    const numericHours = Number(hours);

    if (!Number.isFinite(numericHours) || numericHours < 0) {
      return res.status(400).json({ message: 'Hours must be zero or a positive number' });
    }

    const updated = await patchUser(userId, {
      hoursLeft: numericHours,
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAuditFromRequest(req, {
      action: 'admin_user_set_hours',
      targetType: 'user',
      targetId: userId,
      meta: { hours: numericHours },
    });

    return res.json({ user: sanitizeUser(updated) });
  });

  router.post('/users/:userId/set-slots', async (req, res) => {
    const { userId } = req.params;
    const { slots } = req.body || {};
    const numericSlots = Math.max(1, Math.floor(Number(slots) || 0));

    if (!Number.isFinite(numericSlots) || numericSlots < 1) {
      return res.status(400).json({ message: 'Slots must be at least 1' });
    }

    const updated = await patchUser(userId, {
      steamAccountSlots: numericSlots,
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAuditFromRequest(req, {
      action: 'admin_user_set_slots',
      targetType: 'user',
      targetId: userId,
      meta: { slots: numericSlots },
    });

    return res.json({ user: sanitizeUser(updated) });
  });

  router.post('/users/:userId/reset-password', async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }

    const updated = await setPassword(userId, String(newPassword));
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAuditFromRequest(req, {
      action: 'admin_user_reset_password',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ ok: true });
  });

  router.post('/users/:userId/ban', async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body || {};
    const updated = await patchUser(userId, {
      isBanned: true,
      bannedReason: String(reason || '').trim() || 'Banned by admin',
      bannedAt: new Date().toISOString(),
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAuditFromRequest(req, {
      action: 'admin_user_ban',
      targetType: 'user',
      targetId: userId,
      meta: { reason: updated.bannedReason },
    });

    return res.json({ user: sanitizeUser(updated) });
  });

  router.post('/users/:userId/unban', async (req, res) => {
    const { userId } = req.params;
    const updated = await patchUser(userId, {
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAuditFromRequest(req, {
      action: 'admin_user_unban',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ user: sanitizeUser(updated) });
  });

  return router;
}

module.exports = {
  adminRoutes,
};
