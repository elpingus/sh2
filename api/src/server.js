require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const { settingsRoutes } = require('./routes/settings');
const accountRoutes = require('./routes/account');
const { boostRoutes } = require('./routes/boost');
const { steamRoutes } = require('./routes/steam');
const { adminRoutes } = require('./routes/admin');
const { billingRoutes } = require('./routes/billing');
const { referralRoutes } = require('./routes/referrals');
const { publicRoutes } = require('./routes/public');
const { reviewsRoutes } = require('./routes/reviews');
const { ensureSeedAdmin } = require('./services/users');
const { BoostEngine } = require('./services/boostEngine');
const { WsGateway } = require('./services/wsGateway');
const { setupSteamPassport } = require('./services/steamAuth');
const { SteamBotManager } = require('./services/steamBotManager');

async function bootstrap() {
  await ensureSeedAdmin();

  const app = express();
  const server = http.createServer(app);
  const steamBotManager = new SteamBotManager();
  const boostEngine = new BoostEngine(steamBotManager);

  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_DEV,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://steamhoursnet.xyz',
    'https://steamhoursnet.xyz',
    'https://www.steamhoursnet.xyz',
  ]
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = [...new Set(configuredOrigins)];
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        sameSite: 'lax',
      },
    })
  );

  setupSteamPassport();
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'steamboost-api', timestamp: new Date().toISOString() });
  });

  app.use('/auth', authRoutes);
  app.use('/games', gamesRoutes);
  app.use('/settings', settingsRoutes(steamBotManager));
  app.use('/account', accountRoutes);
  app.use('/steam', steamRoutes(steamBotManager));
  app.use('/boost', boostRoutes(boostEngine));
  app.use('/admin', adminRoutes());
  app.use('/billing', billingRoutes());
  app.use('/referrals', referralRoutes());
  app.use('/reviews', reviewsRoutes());
  app.use('/public', publicRoutes());

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  new WsGateway(server, boostEngine);

  const port = Number(process.env.PORT || 8787);
  server.listen(port, async () => {
    console.log(`[api] listening on http://localhost:${port}`);
    try {
      await boostEngine.recoverActiveJobs();
      console.log('[api] boost recovery completed');
    } catch (error) {
      console.error('[api] boost recovery failed', error);
    }
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap API', error);
  process.exit(1);
});
