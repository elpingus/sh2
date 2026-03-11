const express = require('express');
const { readDb } = require('../lib/db');

function publicRoutes() {
  const router = express.Router();

  router.get('/stats', (_req, res) => {
    const db = readDb();
    const users = Array.isArray(db.users) ? db.users : [];
    const boostJobs = db.boostJobs && typeof db.boostJobs === 'object' ? db.boostJobs : {};
    const jobList = Object.values(boostJobs);

    const usersCount = users.length;
    const activeBoostingUsers = jobList.filter((job) => job && job.state === 'started').length;
    const totalHoursBoosted = users.reduce((acc, user) => acc + (Number(user.totalHoursBoosted) || 0), 0);
    const runningPlans = activeBoostingUsers;
    const gamesBoosting = jobList.reduce(
      (acc, job) => acc + (Array.isArray(job?.currentGames) ? job.currentGames.length : 0),
      0
    );
    const totalBoostedMinutes = jobList.reduce(
      (acc, job) => acc + (Number(job?.totalBoostedMinutes) || 0),
      0
    );

    return res.json({
      usersCount,
      activeBoostingUsers,
      totalHoursBoosted: Math.round(totalHoursBoosted),
      runningPlans,
      gamesBoosting,
      totalBoostedMinutes: Math.round(totalBoostedMinutes),
    });
  });

  return router;
}

module.exports = {
  publicRoutes,
};
