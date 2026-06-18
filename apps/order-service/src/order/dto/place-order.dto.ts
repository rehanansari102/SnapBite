import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, ValidateNested } from 'class-validator';

export class DeliveryAddressDto {
  @IsString() street: string;
  @IsString() city: string;
  @IsString() country: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

export class PlaceOrderDto {
  @ValidateNested() @Type(() => DeliveryAddressDto)
  deliveryAddress: DeliveryAddressDto;

  @IsOptional() @IsString() notes?: string;
}
