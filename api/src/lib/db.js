const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');
const LOCK_PATH = `${DB_PATH}.lock`;

const defaultDb = {
  users: [],
  gamesCatalog: [],
  boostJobs: {},
  auditLogs: [],
  tickets: [],
  reviews: [],
  coupons: [],
  purchases: []
};

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(timeoutMs = 10000) {
  ensureDbFile();
  const startedAt = Date.now();

  while (true) {
    try {
      const handle = fs.openSync(LOCK_PATH, 'wx');
      fs.writeFileSync(handle, String(process.pid), 'utf8');
      return handle;
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error('Timed out waiting for DB lock');
      }

      await sleep(25);
    }
  }
}

function releaseLock(handle) {
  try {
    fs.closeSync(handle);
  } catch (_error) {
    // Ignore.
  }

  try {
    fs.unlinkSync(LOCK_PATH);
  } catch (_error) {
    // Ignore.
  }
}

function readDbUnsafe() {
  ensureDbFile();

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultDb, ...parsed };
  } catch (error) {
    return { ...defaultDb };
  }
}

function readDb() {
  return readDbUnsafe();
}

function writeDbUnsafe(nextDb) {
  ensureDbFile();
  const tempPath = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(nextDb, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_PATH);
}

async function writeDb(nextDb) {
  const lockHandle = await acquireLock();
  try {
    writeDbUnsafe(nextDb);
  } finally {
    releaseLock(lockHandle);
  }
}

async function updateDb(updater) {
  const lockHandle = await acquireLock();
  try {
    const current = readDbUnsafe();
    const updated = updater(current) || current;
    writeDbUnsafe(updated);
    return updated;
  } finally {
    releaseLock(lockHandle);
  }
}

module.exports = {
  readDb,
  writeDb,
  updateDb,
  DB_PATH,
};
