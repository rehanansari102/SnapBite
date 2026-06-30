import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  COD = 'COD',
  CARD = 'CARD',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true }) menuItemId: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) price: number;
  @Prop({ required: true, min: 1 }) quantity: number;
  @Prop() imageUrl?: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class DeliveryAddress {
  @Prop({ required: true }) street: string;
  @Prop({ required: true }) city: string;
  @Prop({ required: true }) country: string;
  @Prop() lat?: number;
  @Prop() lng?: number;
}
export const DeliveryAddressSchema = SchemaFactory.createForClass(DeliveryAddress);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, index: true }) customerId: string;
  @Prop() customerEmail?: string;
  @Prop({ required: true, index: true }) restaurantId: string;
  @Prop({ required: true }) restaurantName: string;
  @Prop() ownerEmail: string;

  @Prop({ type: [OrderItemSchema], required: true }) items: OrderItem[];
  @Prop({ type: DeliveryAddressSchema, required: true }) deliveryAddress: DeliveryAddress;

  @Prop({ required: true, min: 0 }) subtotal: number;
  @Prop({ required: true, min: 0 }) deliveryFee: number;
  @Prop({ default: 0, min: 0 }) discountAmount: number = 0;
  @Prop() promoCode?: string;
  @Prop({ required: true, min: 0 }) total: number;
  @Prop({ required: true, min: 0, default: 0 }) platformFee: number = 0;
  @Prop({ required: true, min: 0, default: 0 }) restaurantEarnings: number = 0;
  @Prop({ required: true, min: 0, default: 10 }) platformFeePercent: number = 10;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  status: OrderStatus;

  @Prop({ enum: PaymentMethod, default: PaymentMethod.COD })
  paymentMethod: PaymentMethod;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.UNPAID, index: true })
  paymentStatus: PaymentStatus;

  @Prop() stripePaymentIntentId?: string;
  @Prop() stripeClientSecret?: string;

  @Prop() notes?: string;
  @Prop() cancelReason?: string;

  @Prop({ index: true }) driverId?: string;
  @Prop() driverEmail?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
