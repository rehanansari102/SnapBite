import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { verifyJwt, parseCookieToken } from './jwt.util';

@WebSocketGateway({ namespace: '/orders' })
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(OrderGateway.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async handleConnection(client: Socket) {
    const secret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === 'production';
    const query = client.handshake.query;

    // ── Auth ──────────────────────────────────────────────────────────────────
    if (!secret) {
      if (isProd) {
        this.logger.error('JWT_SECRET not set — refusing WebSocket in production');
        client.disconnect();
        return;
      }
      // Dev fallback: let restaurant owners in via restaurantId query
      const restaurantId = query.restaurantId as string | undefined;
      if (restaurantId) {
        client.join(`restaurant:${restaurantId}`);
        this.logger.warn(`[dev-no-auth] joined restaurant:${restaurantId}`);
      }
      return;
    }

    const cookieHeader = client.handshake.headers.cookie;
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      parseCookieToken(cookieHeader, 'access_token');

    if (!token) { client.disconnect(); return; }

    const payload = verifyJwt(token, secret);
    if (!payload) { client.disconnect(); return; }

    // Store identity on socket for use in message handlers
    client.data.userId = payload.sub;
    client.data.role   = payload.role;

    // ── Route by role ─────────────────────────────────────────────────────────
    switch (payload.role) {
      case 'driver': {
        // Drivers just need an authenticated connection to emit location events
        this.logger.log(`Driver ${payload.sub} connected`);
        return;
      }

      case 'customer': {
        const orderId = query.orderId as string | undefined;
        if (!orderId) { client.disconnect(); return; }

        const order = await this.orderModel.findById(orderId).lean();
        if (!order || order.customerId !== payload.sub) {
          client.disconnect();
          return;
        }

        client.join(`order:${orderId}`);
        this.logger.log(`Customer tracking order ${orderId}`);
        return;
      }

      case 'restaurant_owner': {
        const restaurantId = query.restaurantId as string | undefined;
        if (!restaurantId) { client.disconnect(); return; }

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

        client.join(`restaurant:${restaurantId}`);
        this.logger.log(`Owner connected for restaurant ${restaurantId}`);
        return;
      }

      case 'admin': {
        const restaurantId = query.restaurantId as string | undefined;
        if (restaurantId) {
          client.join(`restaurant:${restaurantId}`);
          this.logger.log(`Admin joined restaurant:${restaurantId}`);
        }
        return;
      }

      default:
        client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Driver broadcasts location → relay to customer ────────────────────────

  @SubscribeMessage('driver:location')
  handleDriverLocation(client: Socket, payload: { orderId: string; lat: number; lng: number }) {
    if (client.data.role !== 'driver') return;
    this.server.to(`order:${payload.orderId}`).emit('driver:location', {
      lat: payload.lat,
      lng: payload.lng,
    });
  }

  // ── Outbound helpers ──────────────────────────────────────────────────────

  emitNewOrder(restaurantId: string, order: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit('new_order', order);
  }

  emitOrderStatus(
    orderId: string,
    payload: { status: string; paymentStatus?: string; cancelReason?: string },
  ) {
    this.server.to(`order:${orderId}`).emit('order:status', payload);
  }
}
