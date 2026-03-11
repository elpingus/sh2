const { updateDb, readDb } = require('../lib/db');
const { getRequestIp } = require('../lib/requestMeta');

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const input = { ...meta };
  const blockedKeys = new Set([
    'password',
    'passwordEnc',
    'steamPassword',
    'steamPasswordEnc',
    'currentPassword',
    'newPassword',
    'code',
    'guardCode',
    'token',
    'authToken',
  ]);

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (blockedKeys.has(String(key))) continue;
    output[key] = value;
  }
  return output;
}

async function logAudit(entry) {
  const event = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorId: entry?.actorId ? String(entry.actorId) : null,
    actorEmail: entry?.actorEmail ? String(entry.actorEmail) : null,
    actorIsAdmin: Boolean(entry?.actorIsAdmin),
    action: String(entry?.action || 'unknown_action'),
    targetType: entry?.targetType ? String(entry.targetType) : null,
    targetId: entry?.targetId ? String(entry.targetId) : null,
    ip: entry?.ip ? String(entry.ip) : null,
    userAgent: entry?.userAgent ? String(entry.userAgent).slice(0, 300) : null,
    meta: sanitizeMeta(entry?.meta),
    createdAt: new Date().toISOString(),
  };

  await updateDb((current) => {
    if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
    current.auditLogs.push(event);
    if (current.auditLogs.length > 5000) {
      current.auditLogs = current.auditLogs.slice(-5000);
    }
    return current;
  });

  return event;
}

async function logAuditFromRequest(req, entry) {
  try {
    return await logAudit({
      ...entry,
      actorId: req?.auth?.user?.id || null,
      actorEmail: req?.auth?.user?.email || null,
      actorIsAdmin: Boolean(req?.auth?.user?.isAdmin),
      ip: getRequestIp(req),
      userAgent: req?.headers?.['user-agent'] || null,
    });
  } catch (_error) {
    return null;
  }
}

function listAuditLogs({ limit = 200, actorId = null, action = null } = {}) {
  const db = readDb();
  let logs = Array.isArray(db.auditLogs) ? [...db.auditLogs] : [];
  if (actorId) logs = logs.filter((event) => String(event.actorId) === String(actorId));
  if (action) logs = logs.filter((event) => String(event.action) === String(action));
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  return logs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, safeLimit);
}

module.exports = {
  logAudit,
  logAuditFromRequest,
  listAuditLogs,
};
