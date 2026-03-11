const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');

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

let writePromise = Promise.resolve();

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDbFile();

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultDb, ...parsed };
  } catch (error) {
    return { ...defaultDb };
  }
}

function writeDb(nextDb) {
  ensureDbFile();

  writePromise = writePromise.then(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(nextDb, null, 2), 'utf8');
  });

  return writePromise;
}

function updateDb(updater) {
  const current = readDb();
  const updated = updater(current) || current;
  return writeDb(updated).then(() => updated);
}

module.exports = {
  readDb,
  writeDb,
  updateDb,
  DB_PATH,
};
