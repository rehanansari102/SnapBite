import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class RestaurantAddress {
  @Prop({ required: true }) street: string;
  @Prop({ required: true }) city: string;
  @Prop({ required: true }) country: string;
}

// GeoJSON Point — required for MongoDB 2dsphere index
@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  // [longitude, latitude] — GeoJSON order (note: reversed from lat/lng!)
  @Prop({ type: [Number], required: true })
  coordinates: [number, number];
}

// One entry per day of week (0=Sun … 6=Sat)
@Schema({ _id: false })
export class DayHours {
  @Prop({ required: true, min: 0, max: 6 }) day: number;
  @Prop({ default: '09:00' }) open: string;  // HH:MM 24-hour
  @Prop({ default: '22:00' }) close: string; // HH:MM 24-hour
  @Prop({ default: false }) isClosed: boolean;
}

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ required: true }) ownerId: string;
  @Prop() ownerEmail: string;
  @Prop({ required: true }) name: string;
  @Prop() description: string;
  @Prop({ type: [String], default: [] }) cuisineTypes: string[];
  @Prop({ type: RestaurantAddress }) address: RestaurantAddress;
  @Prop({ type: GeoPoint }) location: GeoPoint;
  @Prop() imageUrl: string;
  @Prop({ default: true }) isOpen: boolean;
  @Prop({ default: true }) isActive: boolean;
  @Prop({ default: false }) isApproved: boolean;
  @Prop({ default: 0, min: 0 }) minimumOrder: number;
  @Prop({ default: 0, min: 0 }) deliveryFee: number;
  @Prop({ type: [DayHours], default: [] }) openingHours: DayHours[];
  @Prop({ default: 0 }) rating: number;
  @Prop({ default: 0 }) reviewCount: number;
}

export type RestaurantDocument = Restaurant & Document;
export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

// 2dsphere index — enables geospatial queries ($near, $geoWithin)
RestaurantSchema.index({ location: '2dsphere' });
// Index for fast owner lookups
RestaurantSchema.index({ ownerId: 1 });
