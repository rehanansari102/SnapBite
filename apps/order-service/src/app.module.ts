import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { OrderModule } from './order/order.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT:                    Joi.number().default(3005),
        MONGODB_URI:             Joi.string().required(),
        REDIS_URL:               Joi.string().required(),
        STRIPE_SECRET_KEY:       Joi.string().required(),
        STRIPE_WEBHOOK_SECRET:   Joi.string().required(),
        RESTAURANT_SERVICE_URL:  Joi.string().required(),
        BREVO_API_KEY:           Joi.string().required(),
        BREVO_FROM_EMAIL:        Joi.string().email().required(),
        PLATFORM_FEE_PERCENT:    Joi.number().min(0).max(100).default(10),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow('MONGODB_URI'),
      }),
    }),
    OrderModule,
    HealthModule,
  ],
})
export class AppModule {}
