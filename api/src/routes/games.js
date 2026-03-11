const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { patchUser } = require('../services/users');
const { fetchSteamAppMeta } = require('../lib/steamStore');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  return res.json({ games: req.auth.user.games || [] });
});

router.post('/', requireAuth, async (req, res) => {
  const { appId, name, icon, isFree } = req.body || {};
  if (!appId || !name) {
    return res.status(400).json({ message: 'appId and name are required' });
  }

  const user = req.auth.user;
  const games = Array.isArray(user.games) ? [...user.games] : [];

  if (games.some((game) => game.appId === String(appId))) {
    return res.status(409).json({ message: 'Game already added' });
  }

  if (games.length >= user.maxGames) {
    return res.status(400).json({ message: `Plan limit reached. Max games: ${user.maxGames}` });
  }

  const appMeta = await fetchSteamAppMeta(appId);
  games.push({
    id: `${Date.now()}`,
    appId: String(appId),
    name: String(appMeta?.name || name),
    icon: typeof appMeta?.icon === 'string' && appMeta.icon ? appMeta.icon : (typeof icon === 'string' ? icon : ''),
    isFree: typeof isFree === 'boolean' ? isFree : Boolean(appMeta?.isFree),
  });

  const updated = await patchUser(user.id, { games });
  return res.json({ games: updated.games, user: updated });
});

router.delete('/:appId', requireAuth, async (req, res) => {
  const appId = String(req.params.appId);
  const user = req.auth.user;

  const games = (user.games || []).filter((game) => String(game.appId) !== appId);
  const updated = await patchUser(user.id, { games });

  return res.json({ games: updated.games, user: updated });
});

module.exports = router;
