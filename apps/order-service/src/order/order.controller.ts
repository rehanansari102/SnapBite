import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, HttpCode, HttpStatus, RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { OrderService } from './order.service';
import { CartService } from './cart.service';
import { PaymentService } from './payment.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

interface AuthRequest extends Request {
  headers: Request['headers'] & {
    'x-user-id': string;
    'x-user-role': string;
  };
}

@Controller('orders')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private cartService: CartService,
    private paymentService: PaymentService,
  ) {}

  // ── Cart ────────────────────────────────────────────────────

  @Get('cart')
  getCart(@Req() req: AuthRequest) {
    return this.cartService.getCart(req.headers['x-user-id']);
  }

  @Post('cart/items')
  addToCart(@Req() req: AuthRequest, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(req.headers['x-user-id'], dto);
  }

  @Patch('cart/items/:menuItemId')
  updateCartItem(
    @Req() req: AuthRequest,
    @Param('menuItemId') menuItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.headers['x-user-id'], menuItemId, dto);
  }

  @Delete('cart/items/:menuItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCartItem(@Req() req: AuthRequest, @Param('menuItemId') menuItemId: string) {
    return this.cartService.removeItem(req.headers['x-user-id'], menuItemId);
  }

  @Delete('cart')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@Req() req: AuthRequest) {
    return this.cartService.clearCart(req.headers['x-user-id']);
  }

  // ── Orders ──────────────────────────────────────────────────

  @Post()
  placeOrder(@Req() req: AuthRequest, @Body() dto: PlaceOrderDto) {
    return this.orderService.placeOrder(req.headers['x-user-id'], dto);
  }

  @Get()
  getMyOrders(@Req() req: AuthRequest) {
    return this.orderService.getMyOrders(req.headers['x-user-id']);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantOrders(
    @Req() req: AuthRequest,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.orderService.getRestaurantOrders(
      restaurantId,
      req.headers['x-user-id'],
      req.headers['x-user-role'],
    );
  }

  @Get('restaurant/:restaurantId/earnings')
  getEarnings(
    @Req() req: AuthRequest,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.orderService.getEarnings(
      restaurantId,
      req.headers['x-user-id'],
      req.headers['x-user-role'],
    );
  }

  @Get(':id')
  getOrder(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.orderService.getById(id, req.headers['x-user-id'], req.headers['x-user-role']);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orderService.updateStatus(
      id,
      req.headers['x-user-id'],
      req.headers['x-user-role'],
      dto,
    );
  }

  // ── Payments ────────────────────────────────────────────────

  @Post(':id/payment-intent')
  createPaymentIntent(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.paymentService.createPaymentIntent(id, req.headers['x-user-id']);
  }

  @Post(':id/payment-confirm')
  confirmPayment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { paymentIntentId: string },
  ) {
    return this.paymentService.confirmPayment(id, req.headers['x-user-id'], body.paymentIntentId);
  }

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    return this.paymentService.handleWebhook(req.rawBody!, sig);
  }
}
