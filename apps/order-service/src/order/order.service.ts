import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CartService } from './cart.service';
import { OrderGateway } from './order.gateway';
import { MailService } from './mail.service';

// Allowed status transitions per actor
const CUSTOMER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CANCELLED,
};

const RESTAURANT_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.PICKED_UP,
  [OrderStatus.PICKED_UP]: OrderStatus.DELIVERED,
};

const DRIVER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.READY]: OrderStatus.PICKED_UP,
  [OrderStatus.PICKED_UP]: OrderStatus.DELIVERED,
};

// Strip fields that must never leave the service boundary
function sanitizeOrder(order: any): any {
  if (!order) return order;
  const { ownerEmail, stripeClientSecret, ...safe } = order;
  void ownerEmail; void stripeClientSecret;
  return safe;
}

function sanitizeOrders(orders: any[]): any[] {
  return orders.map(sanitizeOrder);
}

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private cartService: CartService,
    private orderGateway: OrderGateway,
    private mailService: MailService,
  ) {}

  // Fetches restaurant owner info from restaurant-service (internal)
  private async fetchRestaurantOwner(restaurantId: string): Promise<{ ownerEmail?: string; ownerId?: string }> {
    const url = process.env.RESTAURANT_SERVICE_URL;
    if (!url) return {};
    try {
      const res = await fetch(`${url}/restaurants/${restaurantId}`);
      if (!res.ok) return {};
      const data = await res.json() as { ownerEmail?: string; ownerId?: string };
      return { ownerEmail: data.ownerEmail, ownerId: data.ownerId };
    } catch {
      return {};
    }
  }

  // Throws ForbiddenException if requesterId is not the owner of restaurantId
  private async assertRestaurantOwner(restaurantId: string, requesterId: string, role: string): Promise<void> {
    if (role === 'admin') return;
    const { ownerId } = await this.fetchRestaurantOwner(restaurantId);
    if (!ownerId || ownerId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
  }

  async placeOrder(customerId: string, dto: PlaceOrderDto): Promise<Order> {
    const cart = await this.cartService.getCart(customerId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const DELIVERY_FEE = 30;
    const subtotal = cart.subtotal;
    const total = subtotal + DELIVERY_FEE;

    const { ownerEmail } = await this.fetchRestaurantOwner(cart.restaurantId);

    const order = await this.orderModel.create({
      customerId,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      ownerEmail,
      items: cart.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl,
      })),
      deliveryAddress: dto.deliveryAddress,
      subtotal,
      deliveryFee: DELIVERY_FEE,
      total,
      notes: dto.notes,
      status: OrderStatus.PENDING,
    });

    await this.cartService.clearCart(customerId);

    const placed = order.toObject() as unknown as Order & { _id: string };

    // Fire-and-forget: WebSocket + email (don't block the response)
    this.orderGateway.emitNewOrder(cart.restaurantId, sanitizeOrder(placed));
    this.mailService.sendNewOrderToOwner(placed).catch(() => null);

    return sanitizeOrder(placed) as Order;
  }

  async getMyOrders(customerId: string): Promise<Order[]> {
    const orders = await this.orderModel
      .find({ customerId })
      .sort({ createdAt: -1 })
      .lean();
    return sanitizeOrders(orders) as unknown as Order[];
  }

  async getRestaurantOrders(restaurantId: string, requesterId: string, role: string): Promise<Order[]> {
    await this.assertRestaurantOwner(restaurantId, requesterId, role);
    const orders = await this.orderModel
      .find({ restaurantId })
      .sort({ createdAt: -1 })
      .lean();
    return sanitizeOrders(orders) as unknown as Order[];
  }

  async getById(orderId: string, requesterId: string, role: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) throw new ForbiddenException('Access denied');

    const o = order as any;
    // Restaurant owners: verify they own the restaurant for this order
    if (role === 'restaurant_owner') {
      const { ownerId } = await this.fetchRestaurantOwner(o.restaurantId);
      if (!ownerId || ownerId !== requesterId) throw new ForbiddenException('Access denied');
      return sanitizeOrder(order) as unknown as Order;
    }

    const canAccess = role === 'admin' || o.customerId === requesterId;
    if (!canAccess) throw new ForbiddenException('Access denied');
    return sanitizeOrder(order) as unknown as Order;
  }

  async getEarnings(restaurantId: string, requesterId: string, role: string) {
    await this.assertRestaurantOwner(restaurantId, requesterId, role);

    const orders = await this.orderModel
      .find({ restaurantId })
      .lean() as unknown as (Order & { _id: string; createdAt: string; paymentMethod: string; paymentStatus: string })[];

    const earned = (o: any) =>
      (o.paymentStatus === 'PAID') ||
      (o.paymentMethod === 'COD' && o.status === 'DELIVERED');

    const totalRevenue   = orders.filter(earned).reduce((s, o) => s + o.total, 0);
    const cardRevenue    = orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.total, 0);
    const codRevenue     = orders.filter(o => o.paymentMethod === 'COD' && o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0);
    const totalOrders    = orders.filter(o => o.status !== 'CANCELLED').length;
    const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingCount   = orders.filter(o => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status)).length;
    const avgOrderValue  = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;

    // Daily revenue — last 14 days
    const now = new Date();
    const daily: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter(o => {
        const created = new Date(o.createdAt).toISOString().slice(0, 10);
        return created === dateStr && earned(o);
      });
      daily.push({ date: dateStr, revenue: dayOrders.reduce((s, o) => s + o.total, 0), orders: dayOrders.length });
    }

    // Top 5 items by quantity sold
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const o of orders.filter(earned)) {
      for (const item of (o as any).items ?? []) {
        const existing = itemMap.get(item.menuItemId) ?? { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue  += item.price * item.quantity;
        itemMap.set(item.menuItemId, existing);
      }
    }
    const topItems = [...itemMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return { totalRevenue, cardRevenue, codRevenue, totalOrders, deliveredCount, pendingCount, avgOrderValue, daily, topItems };
  }

  async updateStatus(orderId: string, requesterId: string, role: string, dto: UpdateStatusDto): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new ForbiddenException('Access denied');

    const current = order.status;
    const next = dto.status;

    await this.assertValidTransition(current, next, requesterId, role, order as any);

    const update: Partial<Order> = { status: next };
    if (next === OrderStatus.CANCELLED) {
      update.cancelReason = dto.cancelReason;
    }

    const updated = await this.orderModel
      .findByIdAndUpdate(orderId, { $set: update }, { new: true, lean: true })
      .exec();

    return sanitizeOrder(updated) as unknown as Order;
  }

  private async assertValidTransition(
    current: OrderStatus,
    next: OrderStatus,
    requesterId: string,
    role: string,
    order: { customerId: string; restaurantId: string },
  ) {
    if (role === 'customer' || order.customerId === requesterId) {
      if (CUSTOMER_TRANSITIONS[current] !== next) {
        throw new BadRequestException('Customers can only cancel a PENDING order');
      }
      return;
    }

    if (role === 'restaurant_owner') {
      // Verify this owner actually owns the restaurant for this order
      await this.assertRestaurantOwner(order.restaurantId, requesterId, role);
      if (RESTAURANT_TRANSITIONS[current] !== next) {
        throw new BadRequestException(
          `Invalid status transition from ${current} to ${next}`,
        );
      }
      return;
    }

    if (role === 'driver') {
      if (DRIVER_TRANSITIONS[current] !== next) {
        throw new BadRequestException(
          `Invalid status transition from ${current} to ${next}`,
        );
      }
      return;
    }

    if (role === 'admin') return;

    throw new ForbiddenException('Access denied');
  }
}
