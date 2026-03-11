const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const { getUserBySteamId, createUser, patchUser } = require('./users');

function setupSteamPassport() {
  const realm = process.env.STEAM_REALM || 'http://localhost:8787/';
  const returnURL = process.env.STEAM_RETURN_URL || 'http://localhost:8787/auth/steam/return';

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(
    new SteamStrategy(
      {
        returnURL,
        realm,
        apiKey: process.env.STEAM_WEB_API_KEY,
      },
      async (identifier, profile, done) => {
        try {
          const steamId = profile.id || identifier.split('/').filter(Boolean).pop();
          let user = getUserBySteamId(steamId);

          if (!user) {
            const accountName = profile.displayName || `steam_${steamId.slice(-6)}`;
            user = await createUser({
              username: accountName,
              email: `${steamId}@steam.local`,
              password: null,
              steamId,
            });
          }

          const updated = await patchUser(user.id, {
            steamConnected: true,
            steamId,
            username: user.username || profile.displayName,
          });

          return done(null, updated);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

module.exports = {
  setupSteamPassport,
};
