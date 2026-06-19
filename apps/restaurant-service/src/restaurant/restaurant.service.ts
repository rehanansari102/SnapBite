import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { RedisService } from './redis.service';

@Injectable()
export class RestaurantService {
  private readonly detailTtl: number;
  private readonly nearbyTtl: number;

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.detailTtl = Number(this.configService.get('RESTAURANT_CACHE_TTL', 600));
    this.nearbyTtl = Number(this.configService.get('NEARBY_CACHE_TTL', 120));
  }

  async create(ownerId: string, dto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.create({
      ...dto,
      ownerId,
      location: {
        type: 'Point',
        coordinates: [dto.lng, dto.lat], // GeoJSON: [longitude, latitude]
      },
    });
    return restaurant.toObject() as unknown as Restaurant;
  }

  async findById(id: string): Promise<Restaurant> {
    const cacheKey = `restaurant:detail:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return JSON.parse(cached) as Restaurant;
    }

    console.log(`[Cache MISS] ${cacheKey}`);
    const restaurant = await this.restaurantModel.findById(id).lean();
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    await this.redisService.set(cacheKey, JSON.stringify(restaurant), this.detailTtl);
    return restaurant as unknown as Restaurant;
  }

  async findAll(): Promise<Restaurant[]> {
    const cacheKey = 'restaurant:all';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as Restaurant[];

    const restaurants = await this.restaurantModel
      .find({ isActive: true, isApproved: true })
      .sort({ rating: -1 })
      .lean();

    await this.redisService.set(cacheKey, JSON.stringify(restaurants), this.nearbyTtl);
    return restaurants as unknown as Restaurant[];
  }

  async findByOwner(ownerId: string): Promise<Restaurant[]> {
    return this.restaurantModel.find({ ownerId }).lean() as unknown as Restaurant[];
  }

  async findNearby(query: NearbyQueryDto): Promise<Restaurant[]> {
    const radius = query.radius ?? 5;
    const cacheKey = `restaurant:nearby:${query.lat}:${query.lng}:${radius}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return JSON.parse(cached) as Restaurant[];
    }

    console.log(`[Cache MISS] ${cacheKey}`);

    // $near returns results sorted by distance (closest first) automatically
    const restaurants = await this.restaurantModel.find({
      isActive: true,
      isOpen: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [query.lng, query.lat] },
          $maxDistance: radius * 1000, // convert km to meters
        },
      },
    }).lean();

    await this.redisService.set(cacheKey, JSON.stringify(restaurants), this.nearbyTtl);
    return restaurants as unknown as Restaurant[];
  }

  async update(id: string, ownerId: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findById(id).lean();
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if ((restaurant as any).ownerId !== ownerId) throw new ForbiddenException('Not your restaurant');

    const updated = await this.restaurantModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, lean: true })
      .exec();

    // Invalidate detail cache
    await this.redisService.del(`restaurant:detail:${id}`);

    return updated as unknown as Restaurant;
  }

  async toggle(id: string, ownerId: string): Promise<{ isOpen: boolean }> {
    const restaurant = await this.restaurantModel.findById(id).lean();
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if ((restaurant as any).ownerId !== ownerId) throw new ForbiddenException('Not your restaurant');

    const updated = await this.restaurantModel
      .findByIdAndUpdate(id, [{ $set: { isOpen: { $not: '$isOpen' } } }], { new: true, lean: true })
      .exec();

    await this.redisService.del(`restaurant:detail:${id}`);
    return { isOpen: (updated as any).isOpen };
  }

  async setOpeningHours(id: string, ownerId: string, hours: { day: number; open?: string; close?: string; isClosed?: boolean }[]): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findById(id).lean();
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if ((restaurant as any).ownerId !== ownerId) throw new ForbiddenException('Not your restaurant');

    const updated = await this.restaurantModel
      .findByIdAndUpdate(id, { $set: { openingHours: hours } }, { new: true, lean: true })
      .exec();

    await this.redisService.del(`restaurant:detail:${id}`);
    return updated as unknown as Restaurant;
  }
}
