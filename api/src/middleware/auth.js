const { verifyToken } = require('../lib/auth');
const { readDb } = require('../lib/db');
const { normalizeUser } = require('../services/users');

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  if (req.cookies && req.cookies.sb_token) {
    return req.cookies.sb_token;
  }

  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = verifyToken(token);
    const db = readDb();
    const user = db.users.find((u) => u.id === payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: user.bannedReason || 'This account is banned' });
    }

    req.auth = {
      token,
      payload,
      user: normalizeUser(user),
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = {
  requireAuth,
  extractToken,
};
