import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { PromoCode, PromoCodeSchema } from './schemas/promo-code.schema';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CartService } from './cart.service';
import { RedisService } from './redis.service';
import { PaymentService } from './payment.service';
import { MailService } from './mail.service';
import { OrderGateway } from './order.gateway';
import { PromoCodeService } from './promo-code.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PromoCode.name, schema: PromoCodeSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, CartService, RedisService, PaymentService, MailService, OrderGateway, PromoCodeService],
})
export class OrderModule {}
