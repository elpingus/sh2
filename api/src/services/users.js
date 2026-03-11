const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readDb, updateDb } = require('../lib/db');
const { getPlanLimits } = require('../lib/plans');

const MAX_LOGIN_HISTORY = 25;
const XP_PER_LEVEL = 100;

function generateReferralCode(username) {
  const base = String(username || 'user')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'USER';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

function computeLevelFromXp(xp) {
  return Math.max(1, Math.floor((Number(xp) || 0) / XP_PER_LEVEL) + 1);
}

function normalizeLoginHistory(loginHistory) {
  if (!Array.isArray(loginHistory)) return [];
  return loginHistory
    .filter((entry) => entry && typeof entry === 'object')
    .slice(-MAX_LOGIN_HISTORY)
    .map((entry) => ({
      id: entry.id || `LGN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: String(entry.method || 'unknown'),
      ip: entry.ip ? String(entry.ip) : null,
      userAgent: entry.userAgent ? String(entry.userAgent).slice(0, 300) : null,
      device: entry.device ? String(entry.device).slice(0, 120) : 'Unknown device',
      createdAt: entry.createdAt || new Date().toISOString(),
    }));
}

function normalizeIpAddresses(ipAddresses, fallback = []) {
  const values = [...(Array.isArray(ipAddresses) ? ipAddresses : []), ...(Array.isArray(fallback) ? fallback : [])]
    .filter(Boolean)
    .map((value) => String(value));
  return Array.from(new Set(values)).slice(-25);
}

function buildDefaultUser({
  username,
  email,
  plan = 'free',
  isAdmin = false,
  steamId = null,
  referredBy = null,
  referralSourceIp = null,
}) {
  const limits = getPlanLimits(plan);

  return {
    id: uuidv4(),
    username,
    avatar: '',
    email,
    plan,
    hoursLeft: limits.hours,
    totalHoursBoosted: 0,
    gamesCount: 0,
    maxGames: limits.maxGames,
    isAdmin,
    steamConnected: Boolean(steamId),
    steamId,
    steamUsername: null,
    steamAccountSlots: 1,
    steamAccounts: [],
    referralCode: generateReferralCode(username),
    referredBy,
    referralClaims: 0,
    referralSourceIp: referralSourceIp ? String(referralSourceIp) : null,
    xp: 0,
    level: 1,
    lastPresenceAt: null,
    lastXpGrantAt: null,
    isBanned: false,
    bannedAt: null,
    bannedReason: null,
    lastLoginAt: null,
    lastLoginIp: null,
    lastLoginUserAgent: null,
    lastDevice: null,
    ipAddresses: [],
    loginHistory: [],
    createdAt: new Date().toISOString(),
    settings: {
      appearance: 'online',
      displayMode: 'normal',
      autoRestart: true,
      autoStop: false,
      hideActivity: false,
      autoFriend: false,
      cardFarmer: false,
      cardFarmerAutoResume: false,
      customTitleEnabled: true,
      customTitle: 'SteamBoost',
      awayMessageEnabled: false,
      awayMessage: '',
    },
    games: [],
    passwordHash: null,
    steamPassword: null,
    steamPasswordEnc: null,
  };
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return user;
  const limits = getPlanLimits(user.plan || 'free');
  const xp = Number(user.xp) || 0;
  const level = Number(user.level) || computeLevelFromXp(xp);

  return {
    avatar: '',
    totalHoursBoosted: 0,
    gamesCount: 0,
    maxGames: limits.maxGames,
    steamAccountSlots: 1,
    steamAccounts: [],
    referralClaims: 0,
    referralSourceIp: null,
    xp,
    level,
    lastPresenceAt: null,
    lastXpGrantAt: null,
    isBanned: false,
    bannedAt: null,
    bannedReason: null,
    lastLoginAt: null,
    lastLoginIp: null,
    lastLoginUserAgent: null,
    lastDevice: null,
    ipAddresses: [],
    loginHistory: [],
    settings: buildDefaultUser({
      username: user.username || 'user',
      email: user.email || 'user@example.com',
      plan: user.plan || 'free',
    }).settings,
    games: [],
    ...user,
    xp,
    level,
    maxGames: Number.isFinite(Number(user.maxGames)) ? Number(user.maxGames) : limits.maxGames,
    steamAccountSlots: Math.max(1, Number(user.steamAccountSlots) || 1),
    steamAccounts: Array.isArray(user.steamAccounts) ? user.steamAccounts : [],
    loginHistory: normalizeLoginHistory(user.loginHistory),
    ipAddresses: normalizeIpAddresses(user.ipAddresses, [user.lastLoginIp]),
  };
}

async function ensureSeedAdmin() {
  const db = readDb();
  const existingAdmin = db.users.find((user) => user.email === 'admin@steamboost.pro');
  if (existingAdmin) return;

  const admin = buildDefaultUser({
    username: 'admin',
    email: 'admin@steamboost.pro',
    plan: 'lifetime',
    isAdmin: true,
  });
  admin.passwordHash = await bcrypt.hash('admin123', 10);

  await updateDb((current) => {
    current.users.push(admin);
    return current;
  });
}

function getUserByEmail(email) {
  const db = readDb();
  const found = db.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null;
  return found ? normalizeUser(found) : null;
}

function getUserById(userId) {
  const db = readDb();
  const found = db.users.find((user) => user.id === userId) || null;
  return found ? normalizeUser(found) : null;
}

function getUserBySteamId(steamId) {
  const db = readDb();
  const found = db.users.find((user) => user.steamId === steamId) || null;
  return found ? normalizeUser(found) : null;
}

async function createUser({ username, email, password, steamId = null, referredBy = null, referralSourceIp = null }) {
  const newUser = buildDefaultUser({ username, email, steamId, referredBy, referralSourceIp });
  if (password) {
    newUser.passwordHash = await bcrypt.hash(password, 10);
  }

  await updateDb((current) => {
    current.users.push(newUser);
    return current;
  });

  return normalizeUser(newUser);
}

async function verifyPassword(user, password) {
  if (!user?.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

async function setPassword(userId, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  let updatedUser = null;

  await updateDb((current) => {
    const index = current.users.findIndex((user) => user.id === userId);
    if (index === -1) return current;

    current.users[index].passwordHash = passwordHash;
    updatedUser = current.users[index];
    return current;
  });

  return updatedUser;
}

async function patchUser(userId, updates) {
  let updatedUser = null;

  await updateDb((current) => {
    const index = current.users.findIndex((user) => user.id === userId);
    if (index === -1) return current;

    const next = normalizeUser({
      ...current.users[index],
      ...updates,
    });

    if (!Array.isArray(next.steamAccounts)) {
      next.steamAccounts = [];
    }
    if (!Number.isFinite(next.steamAccountSlots) || next.steamAccountSlots < 1) {
      next.steamAccountSlots = 1;
    }

    next.ipAddresses = normalizeIpAddresses(next.ipAddresses, [next.lastLoginIp]);
    next.loginHistory = normalizeLoginHistory(next.loginHistory);
    next.level = computeLevelFromXp(next.xp);
    next.gamesCount = Array.isArray(next.games) ? next.games.length : next.gamesCount;

    current.users[index] = next;
    updatedUser = next;

    return current;
  });

  return updatedUser ? normalizeUser(updatedUser) : null;
}

async function recordLogin(userId, { method = 'login', ip = null, userAgent = null, device = 'Unknown device' } = {}) {
  const entry = {
    id: `LGN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: String(method),
    ip: ip ? String(ip) : null,
    userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
    device: String(device || 'Unknown device').slice(0, 120),
    createdAt: new Date().toISOString(),
  };

  return patchUser(userId, {
    lastLoginAt: entry.createdAt,
    lastLoginIp: entry.ip,
    lastLoginUserAgent: entry.userAgent,
    lastDevice: entry.device,
    ipAddresses: normalizeIpAddresses(getUserById(userId)?.ipAddresses, [entry.ip]),
    loginHistory: [...(getUserById(userId)?.loginHistory || []), entry].slice(-MAX_LOGIN_HISTORY),
  });
}

async function grantPresenceXp(userId, amount = 1, minIntervalMs = 60000) {
  const user = getUserById(userId);
  if (!user) return null;

  const now = Date.now();
  const lastGrant = user.lastXpGrantAt ? new Date(user.lastXpGrantAt).getTime() : 0;
  if (lastGrant && now - lastGrant < minIntervalMs) {
    return user;
  }

  return patchUser(userId, {
    xp: (Number(user.xp) || 0) + Math.max(1, Number(amount) || 1),
    lastPresenceAt: new Date(now).toISOString(),
    lastXpGrantAt: new Date(now).toISOString(),
  });
}

module.exports = {
  ensureSeedAdmin,
  getUserByEmail,
  getUserById,
  getUserBySteamId,
  createUser,
  verifyPassword,
  setPassword,
  patchUser,
  generateReferralCode,
  computeLevelFromXp,
  normalizeUser,
  recordLogin,
  grantPresenceXp,
};
