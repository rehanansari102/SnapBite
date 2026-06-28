import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoCode, PromoCodeDocument, DiscountType } from './schemas/promo-code.schema';

export interface CreatePromoDto {
  code: string;
  type: DiscountType;
  value: number;
  minOrderValue?: number;
  maxUses?: number;
  expiresAt?: string;
  restaurantId?: string;
  description?: string;
}

@Injectable()
export class PromoCodeService {
  constructor(
    @InjectModel(PromoCode.name) private promoModel: Model<PromoCodeDocument>,
  ) {}

  async create(dto: CreatePromoDto): Promise<PromoCode> {
    const existing = await this.promoModel.findOne({ code: dto.code.toUpperCase().trim() });
    if (existing) throw new BadRequestException('Promo code already exists');

    if (dto.type === DiscountType.PERCENT && (dto.value <= 0 || dto.value > 100)) {
      throw new BadRequestException('Percent discount must be between 1 and 100');
    }
    if (dto.type === DiscountType.FLAT && dto.value <= 0) {
      throw new BadRequestException('Flat discount must be greater than 0');
    }

    return this.promoModel.create({
      ...dto,
      code: dto.code.toUpperCase().trim(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  async findAll(): Promise<PromoCode[]> {
    return this.promoModel.find().sort({ createdAt: -1 }).lean() as unknown as PromoCode[];
  }

  async deactivate(id: string): Promise<void> {
    const promo = await this.promoModel.findById(id);
    if (!promo) throw new NotFoundException('Promo code not found');
    await this.promoModel.findByIdAndUpdate(id, { isActive: false });
  }

  // Returns the discount amount for the given subtotal, or throws if invalid
  async validate(code: string, subtotal: number): Promise<{ discountAmount: number; promoCode: string }> {
    const promo = await this.promoModel.findOne({ code: code.toUpperCase().trim() });

    if (!promo || !promo.isActive) throw new BadRequestException('Invalid or expired promo code');
    if (promo.expiresAt && promo.expiresAt < new Date()) throw new BadRequestException('Promo code has expired');
    if (promo.minOrderValue && subtotal < promo.minOrderValue) {
      throw new BadRequestException(`Minimum order of ₨${promo.minOrderValue} required for this code`);
    }
    if (promo.maxUses !== undefined && promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code has reached its usage limit');
    }

    const discountAmount = promo.type === DiscountType.PERCENT
      ? Math.round(subtotal * promo.value) / 100
      : Math.min(promo.value, subtotal); // flat can't exceed subtotal

    return { discountAmount, promoCode: promo.code };
  }

  // Called after order is placed — increments usage count
  async recordUsage(code: string): Promise<void> {
    await this.promoModel.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $inc: { usedCount: 1 } },
    );
  }
}
