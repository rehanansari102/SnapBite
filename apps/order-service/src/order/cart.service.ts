import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Cart {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
}

const CART_TTL = 60 * 60 * 24; // 24 hours

@Injectable()
export class CartService {
  constructor(private redisService: RedisService) {}

  private cartKey(userId: string) {
    return `cart:${userId}`;
  }

  async getCart(userId: string): Promise<Cart | null> {
    const raw = await this.redisService.get(this.cartKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as Cart;
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.getCart(userId);

    // If cart exists and belongs to a different restaurant, reject
    if (cart && cart.restaurantId !== dto.restaurantId) {
      throw new BadRequestException(
        'Your cart has items from another restaurant. Clear your cart first.',
      );
    }

    const existing: Cart = cart ?? {
      restaurantId: dto.restaurantId,
      restaurantName: dto.restaurantName,
      items: [],
      subtotal: 0,
    };

    const idx = existing.items.findIndex((i) => i.menuItemId === dto.menuItemId);
    if (idx >= 0) {
      existing.items[idx].quantity += dto.quantity;
    } else {
      existing.items.push({
        menuItemId: dto.menuItemId,
        name: dto.name,
        price: dto.price,
        quantity: dto.quantity,
        imageUrl: dto.imageUrl,
      });
    }

    existing.subtotal = this.calcSubtotal(existing.items);
    await this.redisService.set(this.cartKey(userId), JSON.stringify(existing), CART_TTL);
    return existing;
  }

  async updateItem(userId: string, menuItemId: string, dto: UpdateCartItemDto): Promise<Cart> {
    const cart = await this.getCart(userId);
    if (!cart) throw new BadRequestException('Cart is empty');

    const idx = cart.items.findIndex((i) => i.menuItemId === menuItemId);
    if (idx < 0) throw new BadRequestException('Item not in cart');

    cart.items[idx].quantity = dto.quantity;
    cart.subtotal = this.calcSubtotal(cart.items);
    await this.redisService.set(this.cartKey(userId), JSON.stringify(cart), CART_TTL);
    return cart;
  }

  async removeItem(userId: string, menuItemId: string): Promise<Cart> {
    const cart = await this.getCart(userId);
    if (!cart) throw new BadRequestException('Cart is empty');

    cart.items = cart.items.filter((i) => i.menuItemId !== menuItemId);
    cart.subtotal = this.calcSubtotal(cart.items);

    if (cart.items.length === 0) {
      await this.redisService.del(this.cartKey(userId));
      return { ...cart, items: [], subtotal: 0 };
    }

    await this.redisService.set(this.cartKey(userId), JSON.stringify(cart), CART_TTL);
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    await this.redisService.del(this.cartKey(userId));
  }

  private calcSubtotal(items: CartItem[]): number {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }
}
