import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { CorsIoAdapter } from './order/cors-io.adapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useWebSocketAdapter(new CorsIoAdapter(app));

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  console.log(`Order Service running on port ${port}`);
}

bootstrap();
