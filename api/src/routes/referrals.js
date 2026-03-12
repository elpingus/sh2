const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { readDb, updateDb } = require('../lib/db');
const { getEligibleReferredUsers } = require('../lib/referrals');

function referralRoutes() {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/overview', (req, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.auth.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const referredUsers = getEligibleReferredUsers(db.users, user.id);
    const referredIds = new Set(referredUsers.map((u) => u.id));
    const paidReferrals = db.purchases.filter((p) => referredIds.has(p.userId) && ['paid', 'redeemed'].includes(String(p.status)));

    const totalReferred = referredUsers.length;
    const paidReferred = new Set(paidReferrals.map((p) => p.userId)).size;
    const claims = Number(user.referralClaims) || 0;
    const availableRewards = Math.max(0, Math.floor(paidReferred / 3) - claims);

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const referralUrl = `${frontend}/?r=${encodeURIComponent(user.referralCode || '')}`;

    return res.json({
      stats: {
        totalReferred,
        paidReferred,
        availableRewards,
        referralCode: user.referralCode,
        referralUrl,
        referralText: `Boost your Steam hours: ${referralUrl}`,
      },
    });
  });

  router.post('/claim', async (req, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.auth.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const referredUsers = getEligibleReferredUsers(db.users, user.id);
    const referredIds = new Set(referredUsers.map((u) => u.id));
    const paidReferrals = db.purchases.filter((p) => referredIds.has(p.userId) && ['paid', 'redeemed'].includes(String(p.status)));
    const paidReferred = new Set(paidReferrals.map((p) => p.userId)).size;

    const claims = Number(user.referralClaims) || 0;
    const availableRewards = Math.max(0, Math.floor(paidReferred / 3) - claims);

    if (availableRewards < 1) {
      return res.status(400).json({ message: 'No claimable rewards yet' });
    }

    await updateDb((current) => {
      const idx = current.users.findIndex((u) => u.id === user.id);
      if (idx === -1) return current;

      current.users[idx].referralClaims = (Number(current.users[idx].referralClaims) || 0) + 1;
      current.users[idx].hoursLeft = (Number(current.users[idx].hoursLeft) || 0) + 600;
      return current;
    });

    return res.json({ ok: true, reward: '600 hours added' });
  });

  return router;
}

module.exports = {
  referralRoutes,
};
