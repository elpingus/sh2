const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { sanitizeUser } = require('../lib/auth');
const { getUserById } = require('../services/users');
const { logAuditFromRequest } = require('../services/auditLog');

function boostRoutes(workerClient) {
  const router = express.Router();

  router.get('/status', requireAuth, async (req, res) => {
    const { status } = await workerClient.getBoostStatus(req.auth.user.id);
    return res.json({ status });
  });

  router.post('/start', requireAuth, async (req, res) => {
    const freshUser = getUserById(req.auth.user.id);
    const { status } = await workerClient.startBoost(freshUser.id);
    await logAuditFromRequest(req, {
      action: 'boost_start_all',
      targetType: 'user',
      targetId: freshUser?.id,
      meta: { status: status.state, runningAccounts: status.runningAccounts || 0 },
    });
    return res.json({ status, user: sanitizeUser(freshUser) });
  });

  router.post('/start-account/:accountId', requireAuth, async (req, res) => {
    const freshUser = getUserById(req.auth.user.id);
    const accountId = String(req.params.accountId);
    const { status } = await workerClient.startBoostAccount(freshUser.id, accountId);
    await logAuditFromRequest(req, {
      action: 'boost_start_account',
      targetType: 'steam_account',
      targetId: accountId,
      meta: { status: status.state },
    });
    return res.json({ status, user: sanitizeUser(freshUser) });
  });

  router.post('/stop-account/:accountId', requireAuth, async (req, res) => {
    const freshUser = getUserById(req.auth.user.id);
    const accountId = String(req.params.accountId);
    const { status } = await workerClient.stopBoostAccount(freshUser.id, accountId);
    await logAuditFromRequest(req, {
      action: 'boost_stop_account',
      targetType: 'steam_account',
      targetId: accountId,
      meta: { status: status.state },
    });
    return res.json({ status, user: sanitizeUser(freshUser) });
  });

  router.post('/pause', requireAuth, async (req, res) => {
    const { status } = await workerClient.pauseBoost(req.auth.user.id);
    await logAuditFromRequest(req, {
      action: 'boost_pause',
      targetType: 'user',
      targetId: req.auth.user.id,
      meta: { status: status.state },
    });
    return res.json({ status });
  });

  router.post('/stop', requireAuth, async (req, res) => {
    const { status } = await workerClient.stopBoost(req.auth.user.id);
    await logAuditFromRequest(req, {
      action: 'boost_stop_all',
      targetType: 'user',
      targetId: req.auth.user.id,
      meta: { status: status.state },
    });
    return res.json({ status });
  });

  return router;
}

module.exports = {
  boostRoutes,
};
