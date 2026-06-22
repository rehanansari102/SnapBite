import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

function verifyJwt(token: string, secret: string): { sub: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64url');
    if (expected !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: String(payload.sub ?? ''), role: String(payload.role ?? '') };
  } catch {
    return null;
  }
}

function parseCookieToken(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/orders',
})
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(OrderGateway.name);

  async handleConnection(client: Socket) {
    const secret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    const restaurantId = client.handshake.query.restaurantId as string | undefined;
    if (!restaurantId) { client.disconnect(); return; }

    if (!secret) {
      if (isProd) {
        this.logger.error('JWT_SECRET not set — refusing WebSocket connection in production');
        client.disconnect();
        return;
      }
      // Dev: allow without auth but warn loudly
      this.logger.warn('JWT_SECRET not set — WebSocket auth skipped (development only)');
      client.join(`restaurant:${restaurantId}`);
      this.logger.log(`[dev-no-auth] Client joined restaurant:${restaurantId}`);
      return;
    }

    // Prefer token from socket auth (sent by client via getWsToken server action),
    // fall back to HttpOnly cookie when both sides share the same hostname.
    const cookieHeader = client.handshake.headers.cookie;
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      parseCookieToken(cookieHeader, 'access_token');

    if (!token) { client.disconnect(); return; }

    const payload = verifyJwt(token, secret);
    if (!payload) { client.disconnect(); return; }

    if (payload.role !== 'restaurant_owner' && payload.role !== 'admin') {
      client.disconnect();
      return;
    }

    // Admin may join any room; owners must own the restaurant
    if (payload.role !== 'admin') {
      const url = process.env.RESTAURANT_SERVICE_URL;
      if (!url) { client.disconnect(); return; }
      try {
        const res = await fetch(`${url}/restaurants/${restaurantId}`);
        if (!res.ok) { client.disconnect(); return; }
        const data = await res.json() as { ownerId?: string };
        if (data.ownerId !== payload.sub) { client.disconnect(); return; }
      } catch {
        client.disconnect();
        return;
      }
    }

    client.join(`restaurant:${restaurantId}`);
    this.logger.log(`Owner connected for restaurant ${restaurantId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitNewOrder(restaurantId: string, order: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit('new_order', order);
  }
}
