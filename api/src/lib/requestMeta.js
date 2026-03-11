function normalizeIp(ip) {
  if (!ip) return null;
  const raw = String(ip).split(',')[0].trim();
  if (!raw) return null;
  return raw.replace(/^::ffff:/, '');
}

function getRequestIp(req) {
  return normalizeIp(
    req?.headers?.['x-forwarded-for']
      || req?.headers?.['x-real-ip']
      || req?.ip
      || req?.socket?.remoteAddress
      || null
  );
}

function detectBrowser(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'Unknown browser';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('brave')) return 'Brave';
  if (ua.includes('chrome/')) return 'Chrome';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  return 'Unknown browser';
}

function detectOs(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'Unknown OS';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown OS';
}

function detectDeviceType(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'Unknown device';
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) return 'Mobile';
  if (ua.includes('ipad') || ua.includes('tablet')) return 'Tablet';
  return 'Desktop';
}

function describeUserAgent(userAgent) {
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  const deviceType = detectDeviceType(userAgent);
  return `${browser} on ${os} (${deviceType})`;
}

module.exports = {
  normalizeIp,
  getRequestIp,
  describeUserAgent,
};
