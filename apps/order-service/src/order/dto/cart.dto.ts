import { IsString, IsNumber, IsOptional, IsUrl, Min } from 'class-validator';

export class AddToCartDto {
  @IsString() menuItemId: string;
  @IsString() restaurantId: string;
  @IsString() restaurantName: string;
  @IsString() name: string;
  @IsNumber() @Min(0) price: number;
  @IsNumber() @Min(1) quantity: number;
  @IsOptional() @IsString() imageUrl?: string;
}

export class UpdateCartItemDto {
  @IsNumber() @Min(1) quantity: number;
}
