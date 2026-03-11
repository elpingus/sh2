module.exports = {
  apps: [
    {
      name: 'steamhoursnet-api',
      cwd: '/var/www/steamhoursnet.xyz/current/api',
      script: 'src/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
      },
    },
  ],
};
