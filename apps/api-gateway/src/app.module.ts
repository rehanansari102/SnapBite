import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT:                  Joi.number().default(3000),
        JWT_SECRET:            Joi.string().required(),
        CORS_ORIGIN:           Joi.string().default('*'),
        AUTH_SERVICE_URL:      Joi.string().required(),
        RESTAURANT_SERVICE_URL: Joi.string().required(),
        ORDER_SERVICE_URL:     Joi.string().required(),
        MENU_SERVICE_URL:      Joi.string().required(),
        MEDIA_SERVICE_URL:     Joi.string().required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    AuthModule,
    ProxyModule,
    HealthModule,
  ],
})
export class AppModule {}
