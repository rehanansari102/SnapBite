import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Order, OrderDocument, PaymentMethod, PaymentStatus } from './schemas/order.schema';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new InternalServerErrorException('STRIPE_SECRET_KEY not set');
    this.stripe = new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
  }

  async createPaymentIntent(orderId: string, customerId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) throw new NotFoundException('Order not found');

    const o = order as any;
    if (o.customerId !== customerId) throw new BadRequestException('Not your order');
    if (o.paymentStatus === PaymentStatus.PAID) throw new BadRequestException('Order already paid');

    // Amount in smallest currency unit (PKR paisa — Stripe uses 1 PKR = 100 paisa)
    const amountPaisa = Math.round(o.total * 100);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountPaisa,
      currency: 'pkr',
      metadata: { orderId, customerId },
    });

    await this.orderModel.findByIdAndUpdate(orderId, {
      $set: {
        paymentMethod: PaymentMethod.CARD,
        stripePaymentIntentId: intent.id,
        stripeClientSecret: intent.client_secret,
      },
    });

    return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
  }

  async confirmPayment(orderId: string, customerId: string, paymentIntentId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) throw new NotFoundException('Order not found');

    const o = order as any;
    if (o.customerId !== customerId) throw new BadRequestException('Not your order');

    // Verify the paymentIntentId matches what we stored — prevents confirming a different intent
    if (o.stripePaymentIntentId && o.stripePaymentIntentId !== paymentIntentId) {
      throw new BadRequestException('Payment intent mismatch');
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    // Double-check the intent's metadata also matches this order
    if (intent.metadata.orderId !== orderId) {
      throw new BadRequestException('Payment intent does not belong to this order');
    }

    const newPaymentStatus =
      intent.status === 'succeeded' ? PaymentStatus.PAID : PaymentStatus.FAILED;

    const updated = await this.orderModel
      .findByIdAndUpdate(orderId, { $set: { paymentStatus: newPaymentStatus } }, { new: true, lean: true })
      .exec();

    if (!updated) throw new NotFoundException('Order not found');
    return updated as unknown as Order;
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return;

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata.orderId;
      if (orderId) {
        await this.orderModel.findByIdAndUpdate(orderId, {
          $set: { paymentStatus: PaymentStatus.PAID },
        });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata.orderId;
      if (orderId) {
        await this.orderModel.findByIdAndUpdate(orderId, {
          $set: { paymentStatus: PaymentStatus.FAILED },
        });
      }
    }
  }
}
