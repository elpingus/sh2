module.exports = {
  apps: [
    {
      name: 'steamhoursnet-api',
      cwd: '/var/www/steamhoursnet/current/api',
      script: 'src/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
      },
    },
    {
      name: 'steamhoursnet-worker',
      cwd: '/var/www/steamhoursnet/current/api',
      script: 'src/workerServer.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        INTERNAL_WORKER_PORT: 8788,
      },
    },
  ],
};
