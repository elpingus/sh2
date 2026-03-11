const WebSocket = require('ws');
const url = require('url');
const { verifyToken } = require('../lib/auth');
const { readDb } = require('../lib/db');

class WsGateway {
  constructor(server, boostEngine) {
    this.connections = new Map();

    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.wss.on('connection', (socket, req) => this.handleConnection(socket, req));

    boostEngine.on('status', ({ userId, status }) => {
      this.sendToUser(userId, {
        type: 'boost:status',
        payload: status,
      });
    });
  }

  handleConnection(socket, req) {
    const parsed = url.parse(req.url, true);
    const token = parsed.query.token;

    if (!token || typeof token !== 'string') {
      socket.close(1008, 'Unauthorized');
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      socket.close(1008, 'Invalid token');
      return;
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) {
      socket.close(1008, 'User not found');
      return;
    }

    const userId = user.id;
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(socket);

    socket.send(
      JSON.stringify({
        type: 'connected',
        payload: { userId },
      })
    );

    socket.on('close', () => {
      const set = this.connections.get(userId);
      if (!set) return;

      set.delete(socket);
      if (set.size === 0) {
        this.connections.delete(userId);
      }
    });
  }

  sendToUser(userId, message) {
    const set = this.connections.get(userId);
    if (!set) return;

    const data = JSON.stringify(message);
    for (const socket of set.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}

module.exports = {
  WsGateway,
};
