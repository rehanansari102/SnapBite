import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromoCodeDocument = HydratedDocument<PromoCode>;

export enum DiscountType {
  PERCENT = 'PERCENT',
  FLAT    = 'FLAT',
}

@Schema({ timestamps: true })
export class PromoCode {
  @Prop({ required: true, unique: true, uppercase: true, trim: true }) code: string;
  @Prop({ enum: DiscountType, required: true }) type: DiscountType;
  @Prop({ required: true, min: 0 }) value: number;       // % or flat ₨
  @Prop({ min: 0, default: 0 }) minOrderValue: number;   // minimum cart subtotal
  @Prop({ min: 0 }) maxUses?: number;                    // undefined = unlimited
  @Prop({ default: 0 }) usedCount: number;
  @Prop() expiresAt?: Date;
  @Prop({ default: true }) isActive: boolean;
  @Prop() restaurantId?: string;                         // undefined = platform-wide
  @Prop() description?: string;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);
