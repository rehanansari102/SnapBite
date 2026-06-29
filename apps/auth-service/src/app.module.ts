import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT:                    Joi.number().default(3001),
        DATABASE_URL:            Joi.string().required(),
        JWT_SECRET:              Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN:   Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN:  Joi.string().default('7d'),
        BREVO_API_KEY:           Joi.string().required(),
        BREVO_FROM_EMAIL:        Joi.string().email().required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        entities: [User, RefreshToken],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', '15m') },
      }),
    }),
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
