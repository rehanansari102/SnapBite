import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  // Strict limit on auth mutation endpoints to prevent brute-force and enumeration
  const authStrict = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Too many attempts, please try again later.' },
  });
  app.use('/api/auth/login',    authStrict);
  app.use('/api/auth/register', authStrict);

  const forgotLimit = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Too many password reset requests, try again in an hour.' },
  });
  app.use('/api/auth/forgot-password', forgotLimit);

  // Global fallback — generous but prevents DDoS
  app.use(rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    message: { statusCode: 429, message: 'Too many requests, slow down.' },
  }));

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
}

bootstrap();
