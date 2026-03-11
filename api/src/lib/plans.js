const PLAN_LIMITS = {
  free: { maxGames: 1, hours: 100 },
  basic: { maxGames: 2, hours: 250 },
  plus: { maxGames: 3, hours: 500 },
  premium: { maxGames: 5, hours: 1200 },
  ultimate: { maxGames: 10, hours: 3000 },
  lifetime: { maxGames: 32, hours: Number.MAX_SAFE_INTEGER },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

module.exports = {
  PLAN_LIMITS,
  getPlanLimits,
};
