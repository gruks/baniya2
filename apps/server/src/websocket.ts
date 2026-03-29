import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Parse token from query string for WebSocket auth
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET || 'baniya-dev-secret');
      } catch {
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  return wss;
}

export function broadcastToAll(data: unknown): void {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
