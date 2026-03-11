const express = require('express');
const { randomUUID } = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { patchUser, getUserById } = require('../services/users');
const { sanitizeUser } = require('../lib/auth');
const { encryptText } = require('../lib/crypto');
const { logAuditFromRequest } = require('../services/auditLog');
const { inferFreeFromStoreItem, fetchSteamAppMeta } = require('../lib/steamStore');

function toClientResult(result) {
  if (result.type === 'connected') return { status: 'connected' };
  if (result.type === 'guard_required') {
    return {
      status: 'guard_required',
      domain: result.domain || null,
      lastCodeWrong: Boolean(result.lastCodeWrong),
    };
  }
  return { status: 'error', message: result.message || 'Steam connect failed' };
}

function sanitizeAccount(account) {
  if (!account) return null;
  const { passwordEnc, refreshTokenEnc, machineAuthTokenEnc, ...safe } = account;
  return safe;
}

async function patchAccountConnection(user, accountId, connected) {
  const accounts = (user.steamAccounts || []).map((account) => {
    if (account.id !== accountId) return account;
    return { ...account, connected: Boolean(connected) };
  });

  await patchUser(user.id, {
    steamAccounts: accounts,
    steamConnected: accounts.some((account) => Boolean(account.connected)),
  });
}

async function patchAccountGames(user, accountId, updater) {
  const accounts = (user.steamAccounts || []).map((account) => {
    if (account.id !== accountId) return account;
    const currentGames = Array.isArray(account.games) ? account.games : [];
    return { ...account, games: updater(currentGames) };
  });

  const updated = await patchUser(user.id, { steamAccounts: accounts });
  return updated;
}

function steamRoutes(steamBotManager) {
  const router = express.Router();

  router.get('/search', requireAuth, async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) return res.json({ games: [] });

    try {
      const response = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=us`
      );
      const data = await response.json();
      const games = (data?.items || []).map((item) => ({
        id: String(item.id),
        appId: String(item.id),
        name: item.name,
        icon: item.tiny_image || item.large_capsule_image || '',
        isFree: inferFreeFromStoreItem(item),
      }));
      return res.json({ games });
    } catch (_error) {
      return res.status(500).json({ message: 'Failed to search Steam games' });
    }
  });

  router.get('/accounts', requireAuth, async (req, res) => {
    const user = getUserById(req.auth.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let userSnapshot = user;
    const rawAccounts = Array.isArray(userSnapshot.steamAccounts) ? [...userSnapshot.steamAccounts] : [];
    if (
      rawAccounts.length === 0
      && userSnapshot.steamUsername
      && userSnapshot.steamPasswordEnc
    ) {
      rawAccounts.push({
        id: randomUUID(),
        username: String(userSnapshot.steamUsername),
        passwordEnc: String(userSnapshot.steamPasswordEnc),
        connected: false,
        games: [],
        createdAt: new Date().toISOString(),
      });

      const updated = await patchUser(userSnapshot.id, {
        steamAccounts: rawAccounts,
        steamConnected: true,
      });
      userSnapshot = updated || userSnapshot;
    }

    const slots = Math.max(1, Number(userSnapshot.steamAccountSlots) || 1);
    const accounts = (userSnapshot.steamAccounts || [])
      .slice(0, slots)
      .map((account) => {
        const state = steamBotManager.getConnectionState(userSnapshot.id, account.id);
        return {
          ...sanitizeAccount(account),
          connected: Boolean(state.connected),
          state,
        };
      });
    return res.json({ slots, accounts });
  });

  router.post('/accounts', requireAuth, async (req, res) => {
    const { steamUsername, steamPassword, connectNow } = req.body || {};
    if (!steamUsername || !steamPassword) {
      return res.status(400).json({ message: 'steamUsername and steamPassword are required' });
    }

    const user = getUserById(req.auth.user.id);
    const slots = Math.max(1, Number(user.steamAccountSlots) || 1);
    const accounts = Array.isArray(user.steamAccounts) ? [...user.steamAccounts] : [];

    if (accounts.length >= slots) {
      return res.status(400).json({ message: `Account limit reached (${slots}).` });
    }

    const account = {
      id: randomUUID(),
      username: String(steamUsername).trim(),
      passwordEnc: encryptText(String(steamPassword)),
      connected: false,
      games: [],
      createdAt: new Date().toISOString(),
    };

    accounts.push(account);
    const updated = await patchUser(user.id, {
      steamAccounts: accounts,
      steamConnected: accounts.length > 0,
    });
    const savedAccount = (updated.steamAccounts || []).find((item) => item.id === account.id) || account;
    let connectResult = null;

    if (connectNow) {
      connectResult = await steamBotManager.connect(updated, savedAccount);
      await patchAccountConnection(updated, savedAccount.id, connectResult.type === 'connected');
    }

    await logAuditFromRequest(req, {
      action: 'steam_account_add',
      targetType: 'steam_account',
      targetId: account.id,
      meta: {
        username: account.username,
        totalAccounts: accounts.length,
        connectStatus: connectResult?.type || 'not_requested',
      },
    });

    return res.json({
      account: sanitizeAccount(savedAccount),
      user: sanitizeUser(updated),
      result: connectResult ? toClientResult(connectResult) : null,
    });
  });

  router.delete('/accounts/:accountId', requireAuth, async (req, res) => {
    const user = getUserById(req.auth.user.id);
    const accountId = String(req.params.accountId);
    const accounts = (user.steamAccounts || []).filter((a) => a.id !== accountId);

    steamBotManager.disconnect(user.id, accountId);

    const updated = await patchUser(user.id, {
      steamAccounts: accounts,
      steamConnected: accounts.length > 0,
    });
    await logAuditFromRequest(req, {
      action: 'steam_account_remove',
      targetType: 'steam_account',
      targetId: accountId,
      meta: { totalAccounts: accounts.length },
    });

    return res.json({ accounts: accounts.map(sanitizeAccount), user: sanitizeUser(updated) });
  });

  router.get('/accounts/:accountId/games', requireAuth, async (req, res) => {
    const user = getUserById(req.auth.user.id);
    const accountId = String(req.params.accountId);
    const account = (user.steamAccounts || []).find((a) => a.id === accountId);
    if (!account) return res.status(404).json({ message: 'Steam account not found' });
    return res.json({ games: Array.isArray(account.games) ? account.games : [] });
  });

  router.post('/accounts/:accountId/games', requireAuth, async (req, res) => {
    const user = getUserById(req.auth.user.id);
    const accountId = String(req.params.accountId);
    const { appId, name, icon, isFree } = req.body || {};
    if (!appId || !name) return res.status(400).json({ message: 'appId and name are required' });

    const account = (user.steamAccounts || []).find((a) => a.id === accountId);
    if (!account) return res.status(404).json({ message: 'Steam account not found' });

    const maxGames = Math.max(1, Number(user.maxGames) || 1);
    const currentGames = Array.isArray(account.games) ? account.games : [];
    if (currentGames.some((game) => String(game.appId) === String(appId))) {
      return res.status(409).json({ message: 'Game already added to this account' });
    }
    if (currentGames.length >= maxGames) {
      return res.status(400).json({ message: `Plan limit reached. Max games per account: ${maxGames}` });
    }

    const appMeta = await fetchSteamAppMeta(appId);
    const nextGame = {
      id: `${Date.now()}`,
      appId: String(appId),
      name: String(appMeta?.name || name),
      icon: typeof appMeta?.icon === 'string' && appMeta.icon ? appMeta.icon : (typeof icon === 'string' ? icon : ''),
      isFree: typeof isFree === 'boolean' ? isFree : Boolean(appMeta?.isFree),
    };

    const updated = await patchAccountGames(user, accountId, (games) => [...games, nextGame]);
    const updatedAccount = (updated.steamAccounts || []).find((a) => a.id === accountId);
    await logAuditFromRequest(req, {
      action: 'steam_account_game_add',
      targetType: 'steam_account',
      targetId: accountId,
      meta: { appId: nextGame.appId, gameName: nextGame.name },
    });
    return res.json({ games: Array.isArray(updatedAccount?.games) ? updatedAccount.games : [] });
  });

  router.delete('/accounts/:accountId/games/:appId', requireAuth, async (req, res) => {
    const user = getUserById(req.auth.user.id);
    const accountId = String(req.params.accountId);
    const appId = String(req.params.appId);
    const account = (user.steamAccounts || []).find((a) => a.id === accountId);
    if (!account) return res.status(404).json({ message: 'Steam account not found' });

    const updated = await patchAccountGames(
      user,
      accountId,
      (games) => games.filter((game) => String(game.appId) !== appId)
    );
    const updatedAccount = (updated.steamAccounts || []).find((a) => a.id === accountId);
    await logAuditFromRequest(req, {
      action: 'steam_account_game_remove',
      targetType: 'steam_account',
      targetId: accountId,
      meta: { appId },
    });
    return res.json({ games: Array.isArray(updatedAccount?.games) ? updatedAccount.games : [] });
  });

  router.get('/status/:accountId', requireAuth, (req, res) => {
    const accountId = String(req.params.accountId);
    return res.json({ state: steamBotManager.getConnectionState(req.auth.user.id, accountId) });
  });

  router.post('/connect/start/:accountId', requireAuth, async (req, res) => {
    const accountId = String(req.params.accountId);
    const user = getUserById(req.auth.user.id);
    const account = (user.steamAccounts || []).find((a) => a.id === accountId);
    if (!account) return res.status(404).json({ message: 'Steam account not found' });

    const result = await steamBotManager.connect(user, account);
    await patchAccountConnection(user, account.id, result.type === 'connected');
    await logAuditFromRequest(req, {
      action: 'steam_connect_start',
      targetType: 'steam_account',
      targetId: account.id,
      meta: { status: result.type, domain: result.domain || null },
    });
    return res.json({ result: toClientResult(result) });
  });

  router.post('/connect/guard/:accountId', requireAuth, async (req, res) => {
    const { code } = req.body || {};
    const accountId = String(req.params.accountId);
    if (!code) return res.status(400).json({ message: 'Steam Guard code is required' });

    const normalizedCode = String(code).trim().toUpperCase();
    const result = await steamBotManager.submitGuardCode(req.auth.user.id, accountId, normalizedCode);
    const user = getUserById(req.auth.user.id);
    if (user) {
      await patchAccountConnection(user, accountId, result.type === 'connected');
    }
    await logAuditFromRequest(req, {
      action: 'steam_connect_guard_submit',
      targetType: 'steam_account',
      targetId: accountId,
      meta: { status: result.type, domain: result.domain || null },
    });
    return res.json({ result: toClientResult(result) });
  });

  router.post('/disconnect/:accountId', requireAuth, async (req, res) => {
    const accountId = String(req.params.accountId);
    steamBotManager.disconnect(req.auth.user.id, accountId);
    const user = getUserById(req.auth.user.id);
    if (user) {
      await patchAccountConnection(user, accountId, false);
    }
    await logAuditFromRequest(req, {
      action: 'steam_disconnect',
      targetType: 'steam_account',
      targetId: accountId,
    });
    return res.json({ ok: true });
  });

  // Backward-compatible legacy endpoint.
  router.post('/credentials', requireAuth, async (req, res) => {
    const { steamUsername, steamPassword } = req.body || {};
    if (!steamUsername || !steamPassword) {
      return res.status(400).json({ message: 'steamUsername and steamPassword are required' });
    }

    const user = getUserById(req.auth.user.id);
    const accounts = Array.isArray(user.steamAccounts) ? [...user.steamAccounts] : [];
    if (accounts.length === 0) {
      accounts.push({
        id: randomUUID(),
        username: String(steamUsername).trim(),
        passwordEnc: encryptText(String(steamPassword)),
        connected: false,
        games: [],
        createdAt: new Date().toISOString(),
      });
    } else {
      accounts[0] = {
        ...accounts[0],
        username: String(steamUsername).trim(),
        passwordEnc: encryptText(String(steamPassword)),
      };
    }

    const updated = await patchUser(user.id, { steamAccounts: accounts, steamConnected: true });
    return res.json({ user: sanitizeUser(updated) });
  });

  return router;
}

module.exports = {
  steamRoutes,
};
