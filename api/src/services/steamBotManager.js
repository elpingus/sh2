const EventEmitter = require('events');
const SteamUser = require('steam-user');
const { decryptText, encryptText } = require('../lib/crypto');
const { fetchSteamAppMeta } = require('../lib/steamStore');
const { updateDb } = require('../lib/db');

function normalizeGuardError(message) {
  if (!message) return null;
  const lower = String(message).toLowerCase();
  if (lower.includes('guard')) return 'Steam Guard code is required.';
  if (lower.includes('rate limit')) return 'Steam login rate-limited. Try again in a minute.';
  return String(message);
}

function mapPersonaState(appearance) {
  switch (appearance) {
    case 'away':
      return SteamUser.EPersonaState.Away;
    case 'invisible':
      return SteamUser.EPersonaState.Invisible;
    case 'online':
    default:
      return SteamUser.EPersonaState.Online;
  }
}

function getDisplayModeLabel(displayMode) {
  switch (displayMode) {
    case 'play_together':
      return 'Play Together';
    case 'mobile':
      return 'Mobile';
    case 'big_picture':
      return 'Big Picture';
    case 'vr':
      return 'VR';
    case 'normal':
    default:
      return 'Normal';
  }
}

function mapDisplayModeToUIMode(displayMode) {
  switch (displayMode) {
    case 'big_picture':
      return SteamUser.EClientUIMode.BigPicture;
    case 'mobile':
      return SteamUser.EClientUIMode.Mobile;
    default:
      return SteamUser.EClientUIMode.None;
  }
}

function buildCustomPresence(settings, plan) {
  const displayMode = settings?.displayMode || 'normal';
  const modeLabel = getDisplayModeLabel(displayMode);
  const unsupportedModeLabel = displayMode === 'vr' || displayMode === 'play_together'
    ? ` [${modeLabel}]`
    : '';
  if (plan === 'free') {
    return `ste**hoursnet.xyz${unsupportedModeLabel}`;
  }

  const hasCustomTitle = settings?.customTitleEnabled && settings?.customTitle;
  const baseTitle = hasCustomTitle ? String(settings.customTitle) : 'Steam User';
  return hasCustomTitle ? `${baseTitle}${unsupportedModeLabel}` : (unsupportedModeLabel ? `Steam User${unsupportedModeLabel}` : null);
}

function buildGamesPlayedPayload(appIds, customTitle) {
  const ids = Array.isArray(appIds) ? appIds : [];
  const payload = ids.map((id) => ({ game_id: id }));

  if (customTitle) {
    if (payload.length > 0) {
      payload[0] = {
        ...payload[0],
        game_extra_info: customTitle,
      };
    } else {
      payload.push({
        game_id: '15190414816125648896',
        game_extra_info: customTitle,
      });
    }
  }

  return payload;
}

class SteamBotManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  key(userId, accountId) {
    return `${userId}:${accountId}`;
  }

  ensureSession(userId, accountId) {
    const k = this.key(userId, accountId);
    let session = this.sessions.get(k);
    if (session) return session;

    const client = new SteamUser({
      autoRelogin: true,
      machineIdType: SteamUser.EMachineIDType.AccountNameGenerated,
      renewRefreshTokens: true,
    });

    session = {
      userId,
      accountId,
      key: k,
      client,
      connected: false,
      loggingIn: false,
      pendingGuard: null,
      currentGames: [],
      lastError: null,
      waitResolve: null,
      latestUserSnapshot: null,
      latestAccountSnapshot: null,
      lastUIMode: SteamUser.EClientUIMode.None,
    };

    const settleWait = (result) => {
      if (session.waitResolve) {
        session.waitResolve(result);
        session.waitResolve = null;
      }
    };

    client.on('loggedOn', () => {
      session.connected = true;
      session.loggingIn = false;
      session.pendingGuard = null;
      session.lastError = null;
      setTimeout(() => {
        const sid64 = session.client.steamID?.getSteamID64?.();
        if (!sid64) return;
        const profile = session.client.users?.[sid64];
        const avatarUrl = profile?.avatar_url_full || profile?.avatar_url_medium || profile?.avatar_url_icon || null;
        if (!avatarUrl) return;
        void this.persistAccountProfile(userId, accountId, {
          avatarUrl,
          steamId64: sid64,
        });
      }, 1500);
      settleWait({ type: 'connected' });
      this.emit('connected', { userId, accountId });
    });

    client.on('refreshToken', (refreshToken) => {
      void this.persistAccountAuth(userId, accountId, {
        refreshTokenEnc: encryptText(String(refreshToken)),
      });
    });

    client.on('machineAuthToken', (machineAuthToken) => {
      void this.persistAccountAuth(userId, accountId, {
        machineAuthTokenEnc: encryptText(String(machineAuthToken)),
      });
    });

    client.on('error', (err) => {
      session.connected = false;
      session.loggingIn = false;
      const message = normalizeGuardError(err?.message || 'Steam login failed');
      session.lastError = message;
      settleWait({ type: 'error', message });
      this.emit('steam_error', { userId, accountId, message });
    });

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      session.pendingGuard = { callback, domain: domain || null, lastCodeWrong: Boolean(lastCodeWrong) };
      session.loggingIn = true;
      settleWait({
        type: 'guard_required',
        domain: domain || null,
        lastCodeWrong: Boolean(lastCodeWrong),
      });
      this.emit('guard_required', { userId, accountId, domain: domain || null, lastCodeWrong: Boolean(lastCodeWrong) });
    });

    client.on('disconnected', () => {
      session.connected = false;
      session.loggingIn = false;
      this.emit('disconnected', { userId, accountId });
    });

    client.on('friendRelationship', (steamId, relationship) => {
      const snapshot = session.latestUserSnapshot;
      if (!snapshot?.settings?.autoFriend) return;

      if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
        try {
          client.addFriend(steamId);
        } catch (_err) {
          // Ignore.
        }
      }
    });

    client.on('friendMessage', (steamId) => {
      const snapshot = session.latestUserSnapshot;
      const isFree = snapshot?.plan === 'free';
      const awayEnabled = isFree ? true : Boolean(snapshot?.settings?.awayMessageEnabled);
      const awayMessage = isFree
        ? 'get free hour boost steamhoursnet.xyz'
        : String(snapshot?.settings?.awayMessage || '').trim();
      if (!awayEnabled || !awayMessage) return;

      try {
        client.chatMessage(steamId, awayMessage);
      } catch (_err) {
        // Ignore.
      }
    });

    this.sessions.set(k, session);
    return session;
  }

  async persistAccountAuth(userId, accountId, patch) {
    await updateDb((current) => {
      const userIndex = current.users.findIndex((entry) => String(entry.id) === String(userId));
      if (userIndex === -1) return current;

      const accounts = Array.isArray(current.users[userIndex].steamAccounts)
        ? current.users[userIndex].steamAccounts
        : [];
      current.users[userIndex].steamAccounts = accounts.map((account) => (
        String(account.id) === String(accountId)
          ? { ...account, ...patch }
          : account
      ));
      return current;
    });
  }

  async persistAccountProfile(userId, accountId, patch) {
    await this.persistAccountAuth(userId, accountId, patch);
    const session = this.sessions.get(this.key(userId, accountId));
    if (session?.latestAccountSnapshot) {
      session.latestAccountSnapshot = {
        ...session.latestAccountSnapshot,
        ...patch,
      };
    }
  }

  async waitForLoginResult(session, timeoutMs = 45000) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (session.waitResolve) {
          session.waitResolve = null;
          resolve({ type: 'timeout', message: 'Steam login timed out.' });
        }
      }, timeoutMs);

      session.waitResolve = (result) => {
        clearTimeout(timeout);
        resolve(result);
      };
    });
  }

  getConnectionState(userId, accountId) {
    const session = this.sessions.get(this.key(userId, accountId));
    if (!session) {
      return {
        connected: false,
        loggingIn: false,
        guardRequired: false,
        guardDomain: null,
        lastCodeWrong: false,
        error: null,
      };
    }

    return {
      connected: session.connected,
      loggingIn: session.loggingIn,
      guardRequired: Boolean(session.pendingGuard),
      guardDomain: session.pendingGuard?.domain || null,
      lastCodeWrong: session.pendingGuard?.lastCodeWrong || false,
      error: session.lastError,
    };
  }

  getConnectedAccountCount(userId) {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.connected) {
        count += 1;
      }
    }
    return count;
  }

  getActivePlayingAccountIds(userId) {
    const activeIds = [];
    for (const session of this.sessions.values()) {
      if (session.userId !== userId) continue;
      if (!session.connected) continue;
      if (!Array.isArray(session.currentGames) || session.currentGames.length <= 0) continue;
      activeIds.push(String(session.accountId));
    }
    return activeIds;
  }

  async connect(user, account) {
    const accountId = account?.id;
    if (!accountId) {
      return { type: 'error', message: 'Account id is required.' };
    }

    const session = this.ensureSession(user.id, accountId);
    session.latestUserSnapshot = user;
    session.latestAccountSnapshot = account;

    if (session.connected) {
      this.applySettings(user, accountId);
      return { type: 'connected' };
    }

    if (!account.username || !account.passwordEnc) {
      return { type: 'error', message: 'Steam credentials are missing.' };
    }

    if (session.loggingIn && session.pendingGuard) {
      return {
        type: 'guard_required',
        domain: session.pendingGuard.domain,
        lastCodeWrong: session.pendingGuard.lastCodeWrong,
      };
    }

    const attemptLogin = async (details) => {
      session.loggingIn = true;
      session.lastError = null;

      try {
        session.client.logOff();
      } catch (_err) {
        // Ignore.
      }

      session.client.logOn(details);
      return this.waitForLoginResult(session);
    };

    let result = null;
    if (account.refreshTokenEnc) {
      try {
        result = await attemptLogin({
          refreshToken: decryptText(account.refreshTokenEnc),
        });
      } catch (_error) {
        result = null;
      }
    }

    if (!result || result.type !== 'connected') {
      const password = decryptText(account.passwordEnc);
      const loginDetails = {
        accountName: account.username,
        password,
      };

      if (account.machineAuthTokenEnc) {
        try {
          loginDetails.machineAuthToken = decryptText(account.machineAuthTokenEnc);
        } catch (_error) {
          // Ignore invalid stored machine auth token.
        }
      }

      result = await attemptLogin(loginDetails);
    }

    if (result.type === 'connected') {
      this.applySettings(user, accountId);
    }

    return result;
  }

  async submitGuardCode(userId, accountId, code) {
    const session = this.ensureSession(userId, accountId);

    if (!session.pendingGuard) {
      return { type: 'error', message: 'No Steam Guard challenge pending.' };
    }

    const guard = session.pendingGuard;
    session.pendingGuard = null;
    session.loggingIn = true;

    guard.callback(String(code).trim().toUpperCase());
    return this.waitForLoginResult(session);
  }

  applySettings(user, accountId = null) {
    const targets = accountId
      ? [this.ensureSession(user.id, accountId)]
      : Array.from(this.sessions.values()).filter((s) => s.userId === user.id);

    for (const session of targets) {
      session.latestUserSnapshot = user;
      if (!session.connected) continue;

      const persona = mapPersonaState(user.settings?.appearance || 'online');
      session.client.setPersona(persona);
      this.applySessionDisplayMode(session, user.settings || {});

      if (Array.isArray(session.currentGames) && session.currentGames.length > 0) {
        const accountGames = Array.isArray(session.latestAccountSnapshot?.games) && session.latestAccountSnapshot.games.length > 0
          ? session.latestAccountSnapshot.games
          : (user.games || []);
        this.playGames(user.id, session.accountId, accountGames, user.settings || {}, user.plan);
      }
    }
  }

  applySessionDisplayMode(session, settings) {
    const uiMode = mapDisplayModeToUIMode(settings?.displayMode || 'normal');
    if (session.lastUIMode === uiMode) return;

    try {
      session.client.setUIMode(uiMode);
      session.lastUIMode = uiMode;
    } catch (_error) {
      // Ignore unsupported UI mode updates.
    }
  }

  playGames(userId, accountId, games, settings, userPlan = null) {
    const session = this.ensureSession(userId, accountId);
    if (!session.connected) {
      return { ok: false, message: `Steam client is not connected for account ${accountId}.` };
    }

    const appIds = (games || []).map((g) => Number(g.appId)).filter((n) => Number.isFinite(n) && n > 0);
    const plan = userPlan || session.latestUserSnapshot?.plan;
    const customPresence = buildCustomPresence(settings, plan);
    const payload = buildGamesPlayedPayload(appIds, customPresence);

    session.latestUserSnapshot = {
      ...(session.latestUserSnapshot || {}),
      settings,
      plan,
    };
    session.currentGames = appIds;
    this.applySessionDisplayMode(session, settings || {});
    session.client.gamesPlayed(payload);
    return { ok: true };
  }

  async ensureFreeGameLicenses(userId, accountId, games) {
    const session = this.ensureSession(userId, accountId);
    if (!session.connected) {
      return { ok: false, message: `Steam client is not connected for account ${accountId}.` };
    }

    const normalizedGames = Array.isArray(games) ? games : [];
    const freeCandidates = [];

    try {
      for (const game of normalizedGames) {
        const appId = Number(game?.appId);
        if (!Number.isFinite(appId) || appId <= 0) continue;

        let isFree = typeof game?.isFree === 'boolean' ? game.isFree : null;
        if (isFree === null) {
          const meta = await fetchSteamAppMeta(appId);
          isFree = Boolean(meta?.isFree);
        }

        if (!isFree) continue;
        if (!freeCandidates.includes(appId)) {
          freeCandidates.push(appId);
        }
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to inspect free Steam games.',
        requested: [],
      };
    }

    if (freeCandidates.length <= 0) {
      return { ok: true, requested: [] };
    }

    try {
      const result = await session.client.requestFreeLicense(freeCandidates);
      const granted = Array.isArray(result?.grantedAppIds) ? result.grantedAppIds.map((id) => Number(id)) : [];
      return { ok: true, requested: freeCandidates, granted };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to request free Steam license.',
        requested: freeCandidates,
      };
    }
  }

  stopGames(userId, accountId = null) {
    const targets = accountId
      ? [this.ensureSession(userId, accountId)]
      : Array.from(this.sessions.values()).filter((s) => s.userId === userId);

    for (const session of targets) {
      if (!session.connected) continue;
      session.currentGames = [];
      session.client.gamesPlayed([]);
    }
  }

  disconnect(userId, accountId = null) {
    const targets = accountId
      ? [this.sessions.get(this.key(userId, accountId))].filter(Boolean)
      : Array.from(this.sessions.values()).filter((s) => s.userId === userId);

    for (const session of targets) {
      try {
        session.client.gamesPlayed([]);
        session.client.logOff();
      } catch (_err) {
        // Ignore.
      }
      this.sessions.delete(session.key);
    }
  }
}

module.exports = {
  SteamBotManager,
};
