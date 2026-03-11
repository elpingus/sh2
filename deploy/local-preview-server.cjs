const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { request: httpRequest } = require('http');
const net = require('net');

const ROOT = path.join(__dirname, '..', 'app', 'dist');
const API_HOST = '127.0.0.1';
const API_PORT = 8787;
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const CERT_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERT_DIR, 'steamhoursnet.xyz-key.pem');
const CERT_PATH = path.join(CERT_DIR, 'steamhoursnet.xyz.pem');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function proxyHttp(req, res) {
  const targetPath = req.url.replace(/^\/api/, '') || '/';
  const options = {
    host: API_HOST,
    port: API_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${API_PORT}`,
    },
  };

  const proxyReq = httpRequest(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: `Proxy error: ${error.message}` }));
  });

  req.pipe(proxyReq);
}

function requestHandler(req, res) {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (req.url.startsWith('/api/')) {
    proxyHttp(req, res);
    return;
  }

  const cleanPath = req.url.split('?')[0];
  const requestedPath = cleanPath === '/' ? '/index.html' : cleanPath;
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, res);
    return;
  }

  serveFile(path.join(ROOT, 'index.html'), res);
}

function upgradeHandler(req, socket) {
  if (!req.url || !req.url.startsWith('/api/ws')) {
    socket.destroy();
    return;
  }

  const upstream = net.connect(API_PORT, API_HOST, () => {
    const headers = [
      `GET ${req.url.replace(/^\/api/, '')} HTTP/1.1`,
      `Host: 127.0.0.1:${API_PORT}`,
      'Connection: Upgrade',
      'Upgrade: websocket',
      ...(req.headers['sec-websocket-key'] ? [`Sec-WebSocket-Key: ${req.headers['sec-websocket-key']}`] : []),
      ...(req.headers['sec-websocket-version'] ? [`Sec-WebSocket-Version: ${req.headers['sec-websocket-version']}`] : []),
      ...(req.headers['sec-websocket-protocol'] ? [`Sec-WebSocket-Protocol: ${req.headers['sec-websocket-protocol']}`] : []),
      ...(req.headers.origin ? [`Origin: ${req.headers.origin}`] : []),
      '',
      '',
    ].join('\r\n');

    upstream.write(headers);
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
}

function createHttpsServer() {
  if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    return null;
  }

  const tlsOptions = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  };

  const server = https.createServer(tlsOptions, requestHandler);
  server.on('upgrade', upgradeHandler);
  return server;
}

const httpsServer = createHttpsServer();

if (httpsServer) {
  const redirectServer = http.createServer((req, res) => {
    const host = (req.headers.host || 'steamhoursnet.xyz').replace(/:\d+$/, '');
    const location = `https://${host}${req.url || '/'}`;
    res.writeHead(301, { Location: location });
    res.end();
  });

  redirectServer.listen(HTTP_PORT, () => {
    console.log(`[local-preview] redirecting http://steamhoursnet.xyz to https on port ${HTTP_PORT}`);
  });

  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`[local-preview] https://steamhoursnet.xyz listening on port ${HTTPS_PORT}`);
  });
} else {
  const server = http.createServer(requestHandler);
  server.on('upgrade', upgradeHandler);
  server.listen(HTTP_PORT, () => {
    console.log('[local-preview] TLS cert not found, serving http://steamhoursnet.xyz on port 80');
    console.log(`[local-preview] expected cert files: ${KEY_PATH} and ${CERT_PATH}`);
  });
}
