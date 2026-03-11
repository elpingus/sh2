const jwt = require('jsonwebtoken');

const JWT_EXPIRES_IN = '7d';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      isAdmin: Boolean(user.isAdmin),
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function sanitizeUser(user) {
  if (!user) return null;

  const {
    passwordHash,
    steamPassword,
    steamPasswordEnc,
    ...safe
  } = user;

  if (Array.isArray(safe.steamAccounts)) {
    safe.steamAccounts = safe.steamAccounts.map((acc) => {
      const {
        passwordEnc,
        refreshTokenEnc,
        machineAuthTokenEnc,
        refreshToken,
        machineAuthToken,
        ...accountSafe
      } = acc;
      return accountSafe;
    });
  }

  return safe;
}

module.exports = {
  signToken,
  verifyToken,
  sanitizeUser,
};
