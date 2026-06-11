import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Disable Express ETag generation so GET responses always return 200, never 304.
  // Without this, browsers cache responses and auth state updates (e.g. emailVerifiedAt)
  // are invisible until the ETag changes.
  app.getHttpAdapter().getInstance().set('etag', false);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
