const DEFAULT_BASE_URL = process.env.INTERNAL_WORKER_URL || 'http://127.0.0.1:8788';
const DEFAULT_TIMEOUT_MS = Number(process.env.INTERNAL_WORKER_TIMEOUT_MS || 8000);
const WORKER_SECRET = process.env.INTERNAL_WORKER_SECRET || 'dev_worker_secret_change_me';

class WorkerClient {
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
  }

  createUnavailableError(message) {
    const error = new Error(message);
    error.statusCode = 503;
    return error;
  }

  async request(path, { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = {
        'x-worker-secret': WORKER_SECRET,
      };

      if (body !== undefined) {
        headers['content-type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok) {
        const message = payload?.message || payload?.error || `Worker request failed (${response.status})`;
        const error = new Error(String(message));
        error.statusCode = response.status;
        throw error;
      }

      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw this.createUnavailableError('Worker request timed out');
      }

      if (error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED') {
        throw this.createUnavailableError('Worker is unavailable');
      }

      const message = String(error?.message || '');
      if (message.includes('fetch failed')) {
        throw this.createUnavailableError('Worker is unavailable');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  health() {
    return this.request('/internal/health');
  }

  getBoostStatus(userId) {
    return this.request(`/internal/boost/${encodeURIComponent(userId)}/status`);
  }

  startBoost(userId) {
    return this.request(`/internal/boost/${encodeURIComponent(userId)}/start`, { method: 'POST' });
  }

  startBoostAccount(userId, accountId) {
    return this.request(`/internal/boost/${encodeURIComponent(userId)}/start-account/${encodeURIComponent(accountId)}`, { method: 'POST' });
  }

  stopBoostAccount(userId, accountId) {
    return this.request(`/internal/boost/${encodeURIComponent(userId)}/stop-account/${encodeURIComponent(accountId)}`, { method: 'POST' });
  }

  pauseBoost(userId) {
    return this.request(`/internal/boost/${encodeURIComponent(userId)}/pause`, { method: 'POST' });
  }

  stopBoost(userId) {
    return this.request(`/internal/boost/${encodeURIComponent(userId)}/stop`, { method: 'POST' });
  }

  getSteamStates(userId) {
    return this.request(`/internal/steam/${encodeURIComponent(userId)}/states`);
  }

  getSteamState(userId, accountId) {
    return this.request(`/internal/steam/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}/state`);
  }

  connectSteam(userId, accountId) {
    return this.request(`/internal/steam/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}/connect`, { method: 'POST' });
  }

  submitGuardCode(userId, accountId, code) {
    return this.request(`/internal/steam/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}/guard`, {
      method: 'POST',
      body: { code },
    });
  }

  disconnectSteam(userId, accountId) {
    return this.request(`/internal/steam/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}/disconnect`, { method: 'POST' });
  }

  applySettings(userId) {
    return this.request(`/internal/users/${encodeURIComponent(userId)}/apply-settings`, { method: 'POST' });
  }
}

module.exports = {
  WorkerClient,
};
