const crypto = require('crypto');

function getKey() {
  const secret = process.env.STEAM_CREDENTIAL_SECRET || process.env.JWT_SECRET || 'dev_steam_credential_secret_change_me';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptText(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

function decryptText(payload) {
  if (!payload) return '';
  const [ivHex, tagHex, dataHex] = String(payload).split('.');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted payload');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  encryptText,
  decryptText,
};
