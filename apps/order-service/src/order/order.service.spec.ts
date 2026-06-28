import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from './schemas/order.schema';
import { CartService } from './cart.service';
import { OrderGateway } from './order.gateway';
import { MailService } from './mail.service';
import { PaymentService } from './payment.service';
import { PromoCodeService } from './promo-code.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 'order-1',
    customerId: 'customer-1',
    restaurantId: 'restaurant-1',
    restaurantName: 'Test Restaurant',
    ownerEmail: 'owner@example.com',       // sensitive — must be stripped
    stripeClientSecret: 'secret_xyz',      // sensitive — must be stripped
    stripePaymentIntentId: 'pi_test',
    items: [{ menuItemId: 'item-1', name: 'Burger', price: 500, quantity: 2 }],
    deliveryAddress: { street: '1 Main St', city: 'Karachi', country: 'PK' },
    subtotal: 1000,
    deliveryFee: 30,
    total: 1030,
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.UNPAID,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockFetch(ownerId: string) {
  process.env.RESTAURANT_SERVICE_URL = 'http://test-restaurant-service';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ownerId, ownerEmail: 'owner@example.com' }),
  } as Response);
}

// ── Module setup ─────────────────────────────────────────────────────────────

describe('OrderService', () => {
  let service: OrderService;
  let orderModel: { find: jest.Mock; findById: jest.Mock; findByIdAndUpdate: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    orderModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: CartService,     useValue: { getCart: jest.fn(), clearCart: jest.fn() } },
        { provide: OrderGateway,    useValue: { emitNewOrder: jest.fn() } },
        { provide: MailService,     useValue: { sendNewOrderToOwner: jest.fn().mockResolvedValue(undefined), sendOrderStatusToCustomer: jest.fn().mockResolvedValue(undefined) } },
        { provide: PaymentService,     useValue: { refundOrder: jest.fn().mockResolvedValue(undefined) } },
        { provide: PromoCodeService,   useValue: { validate: jest.fn().mockResolvedValue({ discountAmount: 0, promoCode: '' }), recordUsage: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => jest.resetAllMocks());

  // ── Sensitive field sanitization ────────────────────────────────────────────

  describe('getMyOrders — sensitive field sanitization', () => {
    it('strips ownerEmail and stripeClientSecret from order responses', async () => {
      orderModel.find.mockReturnValue({ sort: () => ({ lean: () => [makeOrder()] }) });

      const orders = await service.getMyOrders('customer-1') as any[];

      expect(orders[0].ownerEmail).toBeUndefined();
      expect(orders[0].stripeClientSecret).toBeUndefined();
    });

    it('preserves non-sensitive fields', async () => {
      orderModel.find.mockReturnValue({ sort: () => ({ lean: () => [makeOrder()] }) });

      const orders = await service.getMyOrders('customer-1') as any[];

      expect(orders[0].total).toBe(1030);
      expect(orders[0].status).toBe(OrderStatus.PENDING);
      expect(orders[0].restaurantName).toBe('Test Restaurant');
    });
  });

  // ── Restaurant order ownership ──────────────────────────────────────────────

  describe('getRestaurantOrders', () => {
    it('throws ForbiddenException when requester does not own the restaurant', async () => {
      mockFetch('different-owner-id');

      await expect(
        service.getRestaurantOrders('restaurant-1', 'attacker-id', 'restaurant_owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns orders when the requester owns the restaurant', async () => {
      mockFetch('real-owner-id');
      orderModel.find.mockReturnValue({ sort: () => ({ lean: () => [makeOrder()] }) });

      const orders = await service.getRestaurantOrders('restaurant-1', 'real-owner-id', 'restaurant_owner');

      expect(orders).toHaveLength(1);
    });

    it('allows admin to access any restaurant orders without ownership check', async () => {
      orderModel.find.mockReturnValue({ sort: () => ({ lean: () => [makeOrder()] }) });

      // No fetch mock needed — admin bypasses the check
      const orders = await service.getRestaurantOrders('restaurant-1', 'any-admin-id', 'admin');

      expect(orders).toHaveLength(1);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── Earnings ownership ───────────────────────────────────────────────────────

  describe('getEarnings', () => {
    it('throws ForbiddenException when requester does not own the restaurant', async () => {
      mockFetch('different-owner-id');

      await expect(
        service.getEarnings('restaurant-1', 'attacker-id', 'restaurant_owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns earnings summary for the restaurant owner', async () => {
      mockFetch('real-owner-id');
      const delivered = makeOrder({ status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.COD, paymentStatus: PaymentStatus.UNPAID, total: 1030 });
      orderModel.find.mockReturnValue({ lean: () => [delivered] });

      const result = await service.getEarnings('restaurant-1', 'real-owner-id', 'restaurant_owner');

      expect(result.codRevenue).toBe(1030);
      expect(result.deliveredCount).toBe(1);
      expect(result.daily).toHaveLength(14);
    });
  });

  // ── Status update ownership ─────────────────────────────────────────────────

  describe('updateStatus — restaurant_owner', () => {
    it('throws ForbiddenException when owner tries to update an order for a restaurant they do not own', async () => {
      const order = makeOrder({ restaurantId: 'restaurant-1', status: OrderStatus.PENDING });
      orderModel.findById.mockResolvedValue(order);
      mockFetch('different-owner-id');

      await expect(
        service.updateStatus('order-1', 'attacker-id', 'restaurant_owner', { status: OrderStatus.CONFIRMED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a legitimate owner to advance the order status', async () => {
      const order = makeOrder({ restaurantId: 'restaurant-1', status: OrderStatus.PENDING });
      orderModel.findById.mockResolvedValue(order);
      mockFetch('real-owner-id');
      const updated = makeOrder({ status: OrderStatus.CONFIRMED });
      orderModel.findByIdAndUpdate.mockReturnValue({ exec: async () => updated });

      const result = await service.updateStatus('order-1', 'real-owner-id', 'restaurant_owner', { status: OrderStatus.CONFIRMED });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('throws BadRequestException when transition is invalid', async () => {
      const order = makeOrder({ status: OrderStatus.DELIVERED });
      orderModel.findById.mockResolvedValue(order);
      mockFetch('real-owner-id');

      await expect(
        service.updateStatus('order-1', 'real-owner-id', 'restaurant_owner', { status: OrderStatus.CONFIRMED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows a customer to cancel their own PENDING order', async () => {
      const order = makeOrder({ customerId: 'customer-1', status: OrderStatus.PENDING });
      orderModel.findById.mockResolvedValue(order);
      const updated = makeOrder({ status: OrderStatus.CANCELLED });
      orderModel.findByIdAndUpdate.mockReturnValue({ exec: async () => updated });

      const result = await service.updateStatus('order-1', 'customer-1', 'customer', { status: OrderStatus.CANCELLED });

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('throws when a customer tries to cancel a non-PENDING order', async () => {
      const order = makeOrder({ customerId: 'customer-1', status: OrderStatus.CONFIRMED });
      orderModel.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus('order-1', 'customer-1', 'customer', { status: OrderStatus.CANCELLED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
