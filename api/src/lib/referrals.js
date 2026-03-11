const { normalizeIp } = require('./requestMeta');

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

function isReferralEligible(referrer, referredUser) {
  if (!referrer || !referredUser) return false;
  if (String(referrer.id) === String(referredUser.id)) return false;

  const referrerIps = collectUserIps(referrer);
  const referredIps = collectUserIps(referredUser);

  for (const ip of referredIps) {
    if (referrerIps.has(ip)) return false;
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
  isReferralEligible,
  getEligibleReferredUsers,
};
