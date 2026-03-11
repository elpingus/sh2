const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { patchUser } = require('../services/users');
const { sanitizeUser } = require('../lib/auth');
const { logAuditFromRequest } = require('../services/auditLog');
const { enforcePlanSettings } = require('../lib/planFeatures');

function settingsRoutes(steamBotManager) {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    const raw = req.auth.user.settings || {};
    const nextSettings = enforcePlanSettings(req.auth.user.plan, raw);

    if (JSON.stringify(nextSettings) !== JSON.stringify(raw)) {
      await patchUser(req.auth.user.id, { settings: nextSettings });
    }

    return res.json({ settings: nextSettings });
  });

  router.put('/', requireAuth, async (req, res) => {
    const payload = req.body || {};

    const current = req.auth.user.settings || {};
    const nextSettings = {
      ...current,
      ...payload,
    };

    Object.assign(nextSettings, enforcePlanSettings(req.auth.user.plan, nextSettings));

    const updated = await patchUser(req.auth.user.id, { settings: nextSettings });
    if (steamBotManager) {
      steamBotManager.applySettings(updated);
    }
    await logAuditFromRequest(req, {
      action: 'settings_update',
      targetType: 'user',
      targetId: req.auth.user.id,
      meta: {
        appearance: updated?.settings?.appearance,
        displayMode: updated?.settings?.displayMode,
      },
    });

    return res.json({ settings: updated.settings, user: sanitizeUser(updated) });
  });

  return router;
}

module.exports = {
  settingsRoutes,
};
