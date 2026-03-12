require('dotenv').config();

const express = require('express');
const { ensureSeedAdmin, getUserById } = require('./services/users');
const { SteamBotManager } = require('./services/steamBotManager');
const { BoostEngine } = require('./services/boostEngine');

const WORKER_SECRET = process.env.INTERNAL_WORKER_SECRET || 'dev_worker_secret_change_me';

function requireWorkerSecret(req, res, next) {
  if (req.headers['x-worker-secret'] !== WORKER_SECRET) {
    return res.status(401).json({ message: 'Unauthorized worker request' });
  }

  return next();
}

function toClientResult(result) {
  if (result.type === 'connected') return { status: 'connected' };
  if (result.type === 'guard_required') {
    return {
      status: 'guard_required',
      domain: result.domain || null,
      lastCodeWrong: Boolean(result.lastCodeWrong),
    };
  }

  return {
    status: result.type || 'error',
    message: result.message || 'Steam action failed',
  };
}

async function bootstrap() {
  await ensureSeedAdmin();

  const app = express();
  const steamBotManager = new SteamBotManager();
  const boostEngine = new BoostEngine(steamBotManager);

  app.use(express.json({ limit: '256kb' }));
  app.use('/internal', requireWorkerSecret);

  app.get('/internal/health', (_req, res) => {
    res.json({ ok: true, service: 'steamboost-worker', timestamp: new Date().toISOString() });
  });

  app.get('/internal/boost/:userId/status', (req, res) => {
    const status = boostEngine.getStatus(String(req.params.userId));
    return res.json({ status });
  });

  app.post('/internal/boost/:userId/start', async (req, res) => {
    const user = getUserById(String(req.params.userId));
    if (!user) return res.status(404).json({ message: 'User not found' });
    const status = await boostEngine.start(user);
    return res.json({ status });
  });

  app.post('/internal/boost/:userId/start-account/:accountId', async (req, res) => {
    const user = getUserById(String(req.params.userId));
    if (!user) return res.status(404).json({ message: 'User not found' });
    const status = await boostEngine.startAccount(user, String(req.params.accountId));
    return res.json({ status });
  });

  app.post('/internal/boost/:userId/stop-account/:accountId', async (req, res) => {
    const user = getUserById(String(req.params.userId));
    if (!user) return res.status(404).json({ message: 'User not found' });
    const status = await boostEngine.stopAccount(user, String(req.params.accountId));
    return res.json({ status });
  });

  app.post('/internal/boost/:userId/pause', async (req, res) => {
    const status = await boostEngine.pause(String(req.params.userId));
    return res.json({ status });
  });

  app.post('/internal/boost/:userId/stop', async (req, res) => {
    const status = await boostEngine.stop(String(req.params.userId));
    return res.json({ status });
  });

  app.get('/internal/steam/:userId/states', (req, res) => {
    const user = getUserById(String(req.params.userId));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const states = {};
    for (const account of Array.isArray(user.steamAccounts) ? user.steamAccounts : []) {
      states[String(account.id)] = steamBotManager.getConnectionState(user.id, account.id);
    }

    return res.json({ states });
  });

  app.get('/internal/steam/:userId/accounts/:accountId/state', (req, res) => {
    return res.json({
      state: steamBotManager.getConnectionState(String(req.params.userId), String(req.params.accountId)),
    });
  });

  app.post('/internal/steam/:userId/accounts/:accountId/connect', async (req, res) => {
    const user = getUserById(String(req.params.userId));
    if (!user) return res.status(404).json({ message: 'User not found' });
    const accountId = String(req.params.accountId);
    const account = (Array.isArray(user.steamAccounts) ? user.steamAccounts : []).find((entry) => String(entry.id) === accountId);
    if (!account) return res.status(404).json({ message: 'Steam account not found' });

    const result = await steamBotManager.connect(user, account);
    return res.json({ result: toClientResult(result) });
  });

  app.post('/internal/steam/:userId/accounts/:accountId/guard', async (req, res) => {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'Steam Guard code is required' });

    const result = await steamBotManager.submitGuardCode(
      String(req.params.userId),
      String(req.params.accountId),
      String(code).trim().toUpperCase()
    );
    return res.json({ result: toClientResult(result) });
  });

  app.post('/internal/steam/:userId/accounts/:accountId/disconnect', (req, res) => {
    steamBotManager.disconnect(String(req.params.userId), String(req.params.accountId));
    return res.json({ ok: true });
  });

  app.post('/internal/users/:userId/apply-settings', (req, res) => {
    const user = getUserById(String(req.params.userId));
    if (!user) return res.status(404).json({ message: 'User not found' });
    steamBotManager.applySettings(user);
    return res.json({ ok: true });
  });

  app.use((error, _req, res, _next) => {
    console.error('[worker] request failed', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Worker internal error' });
  });

  const port = Number(process.env.INTERNAL_WORKER_PORT || 8788);
  app.listen(port, '127.0.0.1', async () => {
    console.log(`[worker] listening on http://127.0.0.1:${port}`);
    try {
      await boostEngine.recoverActiveJobs();
      console.log('[worker] boost recovery completed');
    } catch (error) {
      console.error('[worker] boost recovery failed', error);
    }
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap worker', error);
  process.exit(1);
});
