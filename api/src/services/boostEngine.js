const { EventEmitter } = require('events');
const { readDb, updateDb } = require('../lib/db');

class BoostEngine extends EventEmitter {
  constructor(steamBotManager) {
    super();
    this.timers = new Map();
    this.steamBotManager = steamBotManager;
  }

  getStatus(userId) {
    const db = readDb();
    return db.boostJobs[userId] || this.defaultStatus();
  }

  defaultStatus() {
    return {
      state: 'stopped',
      uptimeSeconds: 0,
      totalBoostedMinutes: 0,
      currentGames: [],
      runningAccounts: 0,
      startedAccountIds: [],
      accountStats: {},
      error: null,
      updatedAt: new Date().toISOString(),
    };
  }

  normalizeStartedIds(status) {
    return Array.isArray(status?.startedAccountIds)
      ? status.startedAccountIds.map((id) => String(id))
      : [];
  }

  normalizeAccountStats(status) {
    return status?.accountStats && typeof status.accountStats === 'object'
      ? status.accountStats
      : {};
  }

  createAccountStatsPatch(accountIds, currentStats = {}) {
    const nextStats = { ...currentStats };
    for (const accountId of accountIds) {
      const key = String(accountId);
      nextStats[key] = {
        uptimeSeconds: Number(nextStats[key]?.uptimeSeconds) || 0,
        boostedMinutes: Number(nextStats[key]?.boostedMinutes) || 0,
        isPlaying: false,
      };
    }
    return nextStats;
  }

  buildCurrentGames(user, startedAccountIds) {
    const allAccounts = Array.isArray(user?.steamAccounts) ? user.steamAccounts : [];
    const fallbackGames = Array.isArray(user?.games) ? user.games : [];
    const gameMap = new Map();

    for (const accountId of startedAccountIds) {
      const account = allAccounts.find((acc) => String(acc.id) === String(accountId));
      const accountGames = Array.isArray(account?.games) && account.games.length > 0
        ? account.games
        : fallbackGames;
      for (const game of accountGames) {
        const key = String(game.appId);
        if (!gameMap.has(key)) {
          gameMap.set(key, game);
        }
      }
    }

    return Array.from(gameMap.values());
  }

  async reconnectStartedAccounts(user, startedAccountIds) {
    const slots = Math.max(1, Number(user?.steamAccountSlots) || 1);
    const accounts = Array.isArray(user?.steamAccounts) ? user.steamAccounts.slice(0, slots) : [];
    const targetIds = new Set((startedAccountIds || []).map((id) => String(id)));
    const connectedIds = [];

    for (const account of accounts) {
      if (!targetIds.has(String(account.id))) continue;
      const connectResult = await this.steamBotManager.connect(user, account);
      if (connectResult.type !== 'connected') continue;

      const fallbackGames = Array.isArray(user.games) ? user.games : [];
      const accountGames = Array.isArray(account.games) && account.games.length > 0 ? account.games : fallbackGames;
      if (accountGames.length === 0) continue;

      const licenseResult = await this.steamBotManager.ensureFreeGameLicenses(user.id, account.id, accountGames);
      if (!licenseResult.ok) continue;

      const playResult = this.steamBotManager.playGames(
        user.id,
        account.id,
        accountGames,
        user.settings || {},
        user.plan
      );
      if (!playResult.ok) continue;
      connectedIds.push(String(account.id));
    }

    return connectedIds;
  }

  async startSingleAccount(user, accountId) {
    const slots = Math.max(1, Number(user.steamAccountSlots) || 1);
    const accounts = Array.isArray(user.steamAccounts) ? user.steamAccounts.slice(0, slots) : [];
    const account = accounts.find((acc) => String(acc.id) === String(accountId));
    if (!account) {
      return this.persistStatus(user.id, {
        state: 'error',
        error: 'Steam account not found.',
      });
    }

    const fallbackGames = Array.isArray(user.games) ? user.games : [];
    const accountGames = Array.isArray(account.games) && account.games.length > 0
      ? account.games
      : fallbackGames;
    if (accountGames.length === 0) {
      return this.persistStatus(user.id, {
        state: 'error',
        error: `No games selected for account ${account.username}.`,
      });
    }

    const current = this.getStatus(user.id);
    const startedIds = this.normalizeStartedIds(current);
    if (startedIds.includes(String(account.id)) && current.state === 'started') {
      return current;
    }

    await this.persistStatus(user.id, {
      state: 'starting',
      error: null,
    });

    const connection = await this.steamBotManager.connect(user, account);
    if (connection.type === 'guard_required') {
      return this.persistStatus(user.id, {
        state: startedIds.length > 0 ? 'started' : 'error',
        error: `Steam Guard code required for account ${account.username}.`,
      });
    }
    if (connection.type !== 'connected') {
      return this.persistStatus(user.id, {
        state: startedIds.length > 0 ? 'started' : 'error',
        error: connection.message || `Steam connection failed for ${account.username}.`,
      });
    }

    const licenseResult = await this.steamBotManager.ensureFreeGameLicenses(user.id, account.id, accountGames);
    if (!licenseResult.ok) {
      return this.persistStatus(user.id, {
        state: startedIds.length > 0 ? 'started' : 'error',
        error: licenseResult.message,
      });
    }

    const playResult = this.steamBotManager.playGames(
      user.id,
      account.id,
      accountGames,
      user.settings || {},
      user.plan
    );
    if (!playResult.ok) {
      return this.persistStatus(user.id, {
        state: startedIds.length > 0 ? 'started' : 'error',
        error: playResult.message,
      });
    }

    const nextStartedIds = Array.from(new Set([...startedIds, String(account.id)]));
    const currentGames = this.buildCurrentGames(user, nextStartedIds);
    const accountStats = this.createAccountStatsPatch(nextStartedIds, this.normalizeAccountStats(current));

    const nextStatus = await this.persistStatus(user.id, {
      state: 'started',
      error: null,
      startedAccountIds: nextStartedIds,
      runningAccounts: this.steamBotManager.getActivePlayingAccountIds(user.id).length,
      currentGames,
      accountStats,
    });

    this.beginTick(user.id);
    return nextStatus;
  }

  async persistStatus(userId, patch) {
    let nextStatus = null;

    await updateDb((current) => {
      const prev = current.boostJobs[userId] || this.defaultStatus();
      nextStatus = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      current.boostJobs[userId] = nextStatus;
      return current;
    });

    this.emit('status', { userId, status: nextStatus });
    return nextStatus;
  }

  async recoverActiveJobs() {
    const db = readDb();
    const users = Array.isArray(db.users) ? db.users : [];

    for (const user of users) {
      const status = db.boostJobs?.[user.id];
      if (!status || status.state !== 'started') continue;

      const startedIds = this.normalizeStartedIds(status);
      if (startedIds.length <= 0) continue;

      const connectedIds = await this.reconnectStartedAccounts(user, startedIds);
      if (connectedIds.length > 0) {
        const currentGames = this.buildCurrentGames(user, connectedIds);
        await this.persistStatus(user.id, {
          state: 'started',
          error: null,
          startedAccountIds: connectedIds,
          runningAccounts: connectedIds.length,
          currentGames,
          accountStats: this.createAccountStatsPatch(connectedIds, this.normalizeAccountStats(status)),
        });
        this.beginTick(user.id);
      } else {
        await this.persistStatus(user.id, {
          state: 'error',
          error: 'All Steam sessions are disconnected. Please relogin your accounts.',
          runningAccounts: 0,
          startedAccountIds: [],
          currentGames: [],
          accountStats: {},
        });
      }
    }
  }

  async start(user) {
    const slots = Math.max(1, Number(user.steamAccountSlots) || 1);
    const accounts = Array.isArray(user.steamAccounts) ? user.steamAccounts.slice(0, slots) : [];
    if (accounts.length === 0) {
      return this.persistStatus(user.id, {
        state: 'error',
        error: 'No Steam accounts added. Use Add Account first.',
        runningAccounts: 0,
        accountStats: {},
      });
    }

    let lastStatus = this.getStatus(user.id);
    for (const account of accounts) {
      lastStatus = await this.startSingleAccount(user, account.id);
    }
    return lastStatus;
  }

  async startAccount(user, accountId) {
    return this.startSingleAccount(user, accountId);
  }

  async stopAccount(user, accountId) {
    const current = this.getStatus(user.id);
    const startedIds = this.normalizeStartedIds(current).filter((id) => id !== String(accountId));
    const currentStats = this.normalizeAccountStats(current);
    const { [String(accountId)]: _removed, ...remainingAccountStats } = currentStats;

    this.steamBotManager.stopGames(user.id, String(accountId));

    if (startedIds.length === 0) {
      this.stopTick(user.id);
      return this.persistStatus(user.id, {
        state: 'stopped',
        runningAccounts: 0,
        startedAccountIds: [],
        currentGames: [],
        accountStats: {},
      });
    }

    const currentGames = this.buildCurrentGames(user, startedIds);
    return this.persistStatus(user.id, {
      state: 'started',
      runningAccounts: this.steamBotManager.getActivePlayingAccountIds(user.id).length,
      startedAccountIds: startedIds,
      currentGames,
      accountStats: remainingAccountStats,
      error: null,
    });
  }

  beginTick(userId) {
    this.stopTick(userId);

    const timer = setInterval(async () => {
      const db = readDb();
      const status = db.boostJobs[userId] || this.defaultStatus();
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        this.stopTick(userId);
        return;
      }

      if (status.state !== 'started') {
        this.stopTick(userId);
        return;
      }

      const startedAccountIds = this.normalizeStartedIds(status);
      let activeStartedIds = this.steamBotManager
        .getActivePlayingAccountIds(userId)
        .filter((accountId) => startedAccountIds.includes(String(accountId)));
      let activePlayingAccounts = activeStartedIds.length;
      if (activePlayingAccounts <= 0) {
        const recoveredIds = await this.reconnectStartedAccounts(user, startedAccountIds);
        activePlayingAccounts = recoveredIds.length;
        if (activePlayingAccounts > 0) {
          activeStartedIds = recoveredIds;
          await this.persistStatus(userId, {
            state: 'started',
            error: null,
            startedAccountIds: recoveredIds,
            runningAccounts: activePlayingAccounts,
            currentGames: this.buildCurrentGames(user, recoveredIds),
            accountStats: this.createAccountStatsPatch(recoveredIds, this.normalizeAccountStats(status)),
          });
        } else {
          await this.persistStatus(userId, {
            state: 'error',
            error: 'All Steam sessions are disconnected. Please relogin your accounts.',
            runningAccounts: 0,
            startedAccountIds: [],
            currentGames: [],
            accountStats: {},
          });
          this.stopTick(userId);
          return;
        }
      }

      const nextUptime = activePlayingAccounts > 0 ? status.uptimeSeconds + 1 : status.uptimeSeconds;
      const totalBoostedMinutes = (Number(status.totalBoostedMinutes) || 0) + activePlayingAccounts / 60;
      const boostHoursDelta = activePlayingAccounts / 3600;

      const nextHoursLeft = user.hoursLeft === Number.MAX_SAFE_INTEGER
        ? Number.MAX_SAFE_INTEGER
        : Math.max(0, user.hoursLeft - boostHoursDelta);

      await updateDb((current) => {
        const userIndex = current.users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          current.users[userIndex].hoursLeft = nextHoursLeft;
          current.users[userIndex].totalHoursBoosted += boostHoursDelta;
        }

        const currentStatus = current.boostJobs[userId] || this.defaultStatus();
        const nextAccountStats = this.createAccountStatsPatch(startedAccountIds, this.normalizeAccountStats(currentStatus));
        for (const accountId of Object.keys(nextAccountStats)) {
          nextAccountStats[accountId] = {
            uptimeSeconds: activeStartedIds.includes(accountId)
              ? (Number(nextAccountStats[accountId]?.uptimeSeconds) || 0) + 1
              : Number(nextAccountStats[accountId]?.uptimeSeconds) || 0,
            boostedMinutes: activeStartedIds.includes(accountId)
              ? (Number(nextAccountStats[accountId]?.boostedMinutes) || 0) + (1 / 60)
              : Number(nextAccountStats[accountId]?.boostedMinutes) || 0,
            isPlaying: activeStartedIds.includes(accountId),
          };
        }

        current.boostJobs[userId] = {
          ...currentStatus,
          state: 'started',
          uptimeSeconds: nextUptime,
          totalBoostedMinutes,
          runningAccounts: activePlayingAccounts,
          startedAccountIds: activeStartedIds,
          currentGames: this.buildCurrentGames(user, activeStartedIds),
          accountStats: nextAccountStats,
          error: null,
          updatedAt: new Date().toISOString(),
        };

        return current;
      });

      const nextStatus = this.getStatus(userId);
      this.emit('status', { userId, status: nextStatus });

      if (nextHoursLeft <= 0) {
        this.steamBotManager.stopGames(userId);
        await this.persistStatus(userId, {
          state: 'error',
          error: 'Plan hours are exhausted. Please renew your plan.',
          runningAccounts: 0,
          startedAccountIds: [],
          currentGames: [],
          accountStats: {},
        });
        this.stopTick(userId);
      }
    }, 1000);

    this.timers.set(userId, timer);
  }

  stopTick(userId) {
    const existing = this.timers.get(userId);
    if (existing) {
      clearInterval(existing);
      this.timers.delete(userId);
    }
  }

  async pause(userId) {
    this.stopTick(userId);
    this.steamBotManager.stopGames(userId);
    return this.persistStatus(userId, { state: 'paused', runningAccounts: 0, startedAccountIds: [], currentGames: [], accountStats: {} });
  }

  async stop(userId) {
    this.stopTick(userId);
    this.steamBotManager.stopGames(userId);
    return this.persistStatus(userId, { state: 'stopped', runningAccounts: 0, startedAccountIds: [], currentGames: [], accountStats: {} });
  }
}

module.exports = {
  BoostEngine,
};
