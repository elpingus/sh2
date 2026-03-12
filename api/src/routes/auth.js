const express = require('express');
const passport = require('passport');
const { signToken, sanitizeUser, verifyToken } = require('../lib/auth');
const { requireAuth, extractToken } = require('../middleware/auth');
const {
  getUserByEmail,
  createUser,
  verifyPassword,
  patchUser,
  getUserById,
  recordLogin,
} = require('../services/users');
const { encryptText } = require('../lib/crypto');
const { logAuditFromRequest } = require('../services/auditLog');
const { getRequestIp, describeUserAgent, normalizeIp } = require('../lib/requestMeta');
const { isReferralEligible } = require('../lib/referrals');

const router = express.Router();

function setAuthCookie(res, token) {
  res.cookie('sb_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function getBackendUrl(req) {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:8787';
  return `${protocol}://${host}`;
}

function decodeStateToken(state) {
  if (!state) return null;
  try {
    const raw = Buffer.from(String(state), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === 'string' ? parsed.token : null;
  } catch (_error) {
    return null;
  }
}

function encodeStateToken(token) {
  return Buffer.from(JSON.stringify({ token: token || null })).toString('base64url');
}

function decodeJwtPayload(jwtToken) {
  const parts = String(jwtToken || '').split('.');
  if (parts.length < 2) {
    throw new Error('Invalid token format');
  }
  const payloadRaw = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payloadRaw);
}

function normalizeUsername(nameOrEmail) {
  const base = String(nameOrEmail || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base || `user_${Date.now().toString().slice(-6)}`;
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const requestIp = getRequestIp(req);
    const userAgent = req.headers['user-agent'] || null;
    const device = describeUserAgent(userAgent);
    let referredBy = null;
    if (referralCode) {
      const ref = require('../lib/db').readDb().users.find((u) => u.referralCode === String(referralCode).trim().toUpperCase());
      if (ref && isReferralEligible(ref, {
        id: 'pending',
        referredBy: ref.id,
        referralSourceIp: requestIp,
        ipAddresses: [requestIp],
        lastLoginIp: requestIp,
        lastDevice: device,
        loginHistory: [{ device }],
      })) {
        referredBy = ref.id;
      }
    }

    const user = await createUser({ username, email, password, referredBy, referralSourceIp: requestIp });
    await recordLogin(user.id, {
      method: 'register',
      ip: requestIp,
      userAgent,
      device,
    });
    const freshUser = getUserById(user.id) || user;
    const token = signToken(freshUser);
    setAuthCookie(res, token);
    await logAuditFromRequest(req, {
      action: 'auth_register',
      targetType: 'user',
      targetId: freshUser.id,
      meta: { email: freshUser.email, referralUsed: Boolean(referredBy), ip: normalizeIp(requestIp) },
    });

    return res.json({ token, user: sanitizeUser(freshUser) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: user.bannedReason || 'This account is banned' });
    }

    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const requestIp = getRequestIp(req);
    const userAgent = req.headers['user-agent'] || null;
    const device = describeUserAgent(userAgent);
    await recordLogin(user.id, {
      method: 'password',
      ip: requestIp,
      userAgent,
      device,
    });
    const freshUser = getUserById(user.id) || user;
    const token = signToken(freshUser);
    setAuthCookie(res, token);
    await logAuditFromRequest(req, {
      action: 'auth_login',
      targetType: 'user',
      targetId: freshUser.id,
      meta: { email: freshUser.email, ip: normalizeIp(requestIp), device },
    });

    return res.json({ token, user: sanitizeUser(freshUser) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('sb_token');
  void logAuditFromRequest(req, {
    action: 'auth_logout',
    targetType: 'user',
    targetId: req?.auth?.user?.id || null,
  });
  return res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    user: sanitizeUser(req.auth.user),
    token: req.auth.token,
  });
});

router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const frontend = getFrontendUrl();

  if (!clientId || !clientSecret) {
    return res.redirect(`${frontend}/?authError=google_not_configured`);
  }

  const token = extractToken(req) || (typeof req.query.token === 'string' ? req.query.token : null);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getBackendUrl(req)}/auth/google/callback`;
  const state = encodeStateToken(token);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', state);

  return res.redirect(authUrl.toString());
});

router.get('/google/callback', async (req, res) => {
  const frontend = getFrontendUrl();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getBackendUrl(req)}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return res.redirect(`${frontend}/?authError=google_not_configured`);
  }

  if (typeof req.query.error === 'string') {
    return res.redirect(`${frontend}/?authError=${encodeURIComponent(req.query.error)}`);
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null;
  if (!code) {
    return res.redirect(`${frontend}/?authError=google_code_missing`);
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenResponse.ok) {
      return res.redirect(`${frontend}/?authError=google_exchange_failed`);
    }

    const tokenPayload = await tokenResponse.json();
    const idToken = tokenPayload?.id_token;
    if (!idToken) {
      return res.redirect(`${frontend}/?authError=google_id_token_missing`);
    }

    const profile = decodeJwtPayload(idToken);
    const email = String(profile?.email || '').trim().toLowerCase();
    const googleId = String(profile?.sub || '').trim();
    const displayName = String(profile?.name || '').trim();
    const avatar = String(profile?.picture || '').trim();

    if (!email || !googleId) {
      return res.redirect(`${frontend}/?authError=google_profile_invalid`);
    }

    let user = getUserByEmail(email);

    const linkingToken = decodeStateToken(typeof req.query.state === 'string' ? req.query.state : null);
    if (linkingToken) {
      try {
        const payload = verifyToken(linkingToken);
        const loggedUser = getUserById(payload.sub);
        if (loggedUser) {
          await patchUser(loggedUser.id, {
            googleId,
            avatar: loggedUser.avatar || avatar || loggedUser.avatar,
          });
          user = getUserById(loggedUser.id);
        }
      } catch (_error) {
        // Ignore broken linking state and continue normal auth.
      }
    }

    if (!user) {
      const usernameSeed = displayName || email.split('@')[0];
      const username = normalizeUsername(usernameSeed);
      user = await createUser({
        username,
        email,
        password: null,
      });
    }
    if (user.isBanned) {
      return res.redirect(`${frontend}/?authError=account_banned`);
    }

    user = await patchUser(user.id, {
      googleId,
      avatar: user.avatar || avatar || user.avatar,
    });
    await recordLogin(user.id, {
      method: 'google',
      ip: getRequestIp(req),
      userAgent: req.headers['user-agent'] || null,
      device: describeUserAgent(req.headers['user-agent'] || null),
    });
    user = getUserById(user.id) || user;

    const sessionToken = signToken(user);
    setAuthCookie(res, sessionToken);
    await logAuditFromRequest(req, {
      action: 'auth_google_login',
      targetType: 'user',
      targetId: user.id,
      meta: { email: user.email },
    });
    return res.redirect(`${frontend}/dashboard?authToken=${encodeURIComponent(sessionToken)}&google=connected`);
  } catch (_error) {
    return res.redirect(`${frontend}/?authError=google_callback_failed`);
  }
});

router.get('/steam', (req, res, next) => {
  const token = extractToken(req) || (typeof req.query.token === 'string' ? req.query.token : null);
  if (token) {
    req.session.authToken = token;
  }

  return passport.authenticate('steam', { failureRedirect: '/auth/steam/failure' })(req, res, next);
});

router.get('/steam/return', passport.authenticate('steam', { failureRedirect: '/auth/steam/failure' }), async (req, res) => {
  const user = req.user;

  if (req.session.authToken) {
    try {
      const payload = require('../lib/auth').verifyToken(req.session.authToken);
      const loggedUser = getUserById(payload.sub);
      if (loggedUser) {
        await patchUser(loggedUser.id, {
          steamConnected: true,
          steamId: user.steamId,
        });
      }
    } catch (error) {
      // Ignore invalid linking token and continue with steam login.
    }
  }

  const freshUser = getUserById(user.id) || user;
  await recordLogin(freshUser.id, {
    method: 'steam',
    ip: getRequestIp(req),
    userAgent: req.headers['user-agent'] || null,
    device: describeUserAgent(req.headers['user-agent'] || null),
  });
  const token = signToken(freshUser);
  setAuthCookie(res, token);

  const frontend = getFrontendUrl();
  return res.redirect(`${frontend}/dashboard?authToken=${encodeURIComponent(token)}&steam=connected`);
});

router.get('/steam/failure', (_req, res) => {
  const frontend = getFrontendUrl();
  return res.redirect(`${frontend}/dashboard?steam=failed`);
});

router.post('/steam/credentials', requireAuth, async (req, res) => {
  const { steamUsername, steamPassword } = req.body || {};
  if (!steamUsername || !steamPassword) {
    return res.status(400).json({ message: 'steamUsername and steamPassword are required' });
  }

  const encrypted = encryptText(String(steamPassword));

  const updated = await patchUser(req.auth.user.id, {
    steamUsername: String(steamUsername).trim(),
    steamPasswordEnc: encrypted,
    steamConnected: true,
  });

  return res.json({ user: sanitizeUser(updated) });
});

module.exports = router;
