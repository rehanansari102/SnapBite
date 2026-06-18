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

// Allowed status transitions per actor
const CUSTOMER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CANCELLED,
};

const RESTAURANT_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
};

const DRIVER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.READY]: OrderStatus.PICKED_UP,
  [OrderStatus.PICKED_UP]: OrderStatus.DELIVERED,
};

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private cartService: CartService,
  ) {}

  async placeOrder(customerId: string, dto: PlaceOrderDto): Promise<Order> {
    const cart = await this.cartService.getCart(customerId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const DELIVERY_FEE = 30;
    const subtotal = cart.subtotal;
    const total = subtotal + DELIVERY_FEE;

    const order = await this.orderModel.create({
      customerId,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
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
    return order.toObject() as unknown as Order;
  }

  async getMyOrders(customerId: string): Promise<Order[]> {
    return this.orderModel
      .find({ customerId })
      .sort({ createdAt: -1 })
      .lean() as unknown as Order[];
  }

  async getRestaurantOrders(restaurantId: string): Promise<Order[]> {
    return this.orderModel
      .find({ restaurantId })
      .sort({ createdAt: -1 })
      .lean() as unknown as Order[];
  }

  async getById(orderId: string, requesterId: string, role: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) throw new NotFoundException('Order not found');

    const o = order as any;
    const canAccess =
      role === 'admin' ||
      o.customerId === requesterId ||
      o.restaurantId === requesterId;

    if (!canAccess) throw new ForbiddenException('Access denied');
    return order as unknown as Order;
  }

  async updateStatus(orderId: string, requesterId: string, role: string, dto: UpdateStatusDto): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const current = order.status;
    const next = dto.status;

    this.assertValidTransition(current, next, requesterId, role, order as any);

    const update: Partial<Order> = { status: next };
    if (next === OrderStatus.CANCELLED) {
      update.cancelReason = dto.cancelReason;
    }

    const updated = await this.orderModel
      .findByIdAndUpdate(orderId, { $set: update }, { new: true, lean: true })
      .exec();

    return updated as unknown as Order;
  }

  private assertValidTransition(
    current: OrderStatus,
    next: OrderStatus,
    requesterId: string,
    role: string,
    order: { customerId: string; restaurantId: string },
  ) {
    if (role === 'customer' || order.customerId === requesterId) {
      if (CUSTOMER_TRANSITIONS[current] !== next) {
        throw new BadRequestException(`Customers can only cancel a PENDING order`);
      }
      return;
    }

    if (role === 'restaurant_owner') {
      if (RESTAURANT_TRANSITIONS[current] !== next) {
        throw new BadRequestException(
          `Invalid status transition from ${current} to ${next} for restaurant`,
        );
      }
      return;
    }

    if (role === 'driver') {
      if (DRIVER_TRANSITIONS[current] !== next) {
        throw new BadRequestException(
          `Invalid status transition from ${current} to ${next} for driver`,
        );
      }
      return;
    }

    if (role === 'admin') return;

    throw new ForbiddenException('Not authorised to update order status');
  }
}
