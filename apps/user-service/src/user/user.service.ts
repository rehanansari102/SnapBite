import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddAddressDto } from './dto/add-address.dto';
import { RedisService } from './redis.service';

@Injectable()
export class UserService {
  private readonly cacheTtl: number;

  constructor(
    @InjectModel(UserProfile.name) private profileModel: Model<UserProfileDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.cacheTtl = Number(this.configService.get('CACHE_TTL_SECONDS', 300));
  }

  async getOrCreateProfile(userId: string, email: string): Promise<UserProfile> {
    const cacheKey = `user:profile:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as UserProfile;

    // Atomic upsert — avoids race condition between findOne + create
    const profile = await this.profileModel
      .findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, email } },
        { upsert: true, new: true, lean: true },
      )
      .exec();

    await this.redisService.set(cacheKey, JSON.stringify(profile), this.cacheTtl);
    return profile as unknown as UserProfile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const profile = await this.profileModel
      .findOneAndUpdate({ userId }, { $set: dto }, { new: true, lean: true })
      .exec();
    if (!profile) throw new NotFoundException('Profile not found');

    await this.redisService.del(`user:profile:${userId}`);
    return profile;
  }

  async addAddress(userId: string, dto: AddAddressDto): Promise<UserProfile> {
    const address = { ...dto, id: uuidv4(), isDefault: dto.isDefault ?? false };

    const update: Record<string, unknown> = { $push: { addresses: address } };
    if (dto.isDefault) {
      // Unset other defaults first
      await this.profileModel.updateOne(
        { userId },
        { $set: { 'addresses.$[].isDefault': false } },
      );
    }

    const profile = await this.profileModel
      .findOneAndUpdate({ userId }, update, { new: true, lean: true })
      .exec();
    if (!profile) throw new NotFoundException('Profile not found');

    await this.redisService.del(`user:profile:${userId}`);
    return profile;
  }

  async removeAddress(userId: string, addressId: string): Promise<UserProfile> {
    const profile = await this.profileModel
      .findOneAndUpdate(
        { userId },
        { $pull: { addresses: { id: addressId } } },
        { new: true, lean: true },
      )
      .exec();
    if (!profile) throw new NotFoundException('Profile not found');

    await this.redisService.del(`user:profile:${userId}`);
    return profile;
  }
}
