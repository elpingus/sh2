const { normalizeIp } = require('./requestMeta');
const MIN_REFERRAL_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;

function collectUserIps(user) {
  const values = new Set();
  const pushValue = (value) => {
    const normalized = normalizeIp(value);
    if (normalized) values.add(normalized);
  };

  pushValue(user?.lastLoginIp);
  pushValue(user?.referralSourceIp);
  for (const ip of Array.isArray(user?.ipAddresses) ? user.ipAddresses : []) {
    pushValue(ip);
  }

  return values;
}

function normalizeDevice(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw || null;
}

function collectUserDevices(user) {
  const values = new Set();
  const pushValue = (value) => {
    const normalized = normalizeDevice(value);
    if (normalized) values.add(normalized);
  };

  pushValue(user?.lastDevice);
  for (const entry of Array.isArray(user?.loginHistory) ? user.loginHistory : []) {
    pushValue(entry?.device);
  }

  return values;
}

function isOldEnoughForReferral(user) {
  const createdAt = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
  if (!createdAt) return true;
  return Date.now() - createdAt >= MIN_REFERRAL_ACCOUNT_AGE_MS;
}

function isReferralEligible(referrer, referredUser) {
  if (!referrer || !referredUser) return false;
  if (String(referrer.id) === String(referredUser.id)) return false;
  if (!isOldEnoughForReferral(referredUser)) return false;

  const referrerIps = collectUserIps(referrer);
  const referredIps = collectUserIps(referredUser);

  for (const ip of referredIps) {
    if (referrerIps.has(ip)) return false;
  }

  const referrerDevices = collectUserDevices(referrer);
  const referredDevices = collectUserDevices(referredUser);
  for (const device of referredDevices) {
    if (referrerDevices.has(device)) return false;
  }

  return true;
}

function getEligibleReferredUsers(users, referrerId) {
  const allUsers = Array.isArray(users) ? users : [];
  const referrer = allUsers.find((entry) => String(entry.id) === String(referrerId));
  if (!referrer) return [];

  return allUsers.filter((entry) => String(entry.referredBy) === String(referrerId) && isReferralEligible(referrer, entry));
}

module.exports = {
  collectUserIps,
  collectUserDevices,
  isReferralEligible,
  getEligibleReferredUsers,
};
