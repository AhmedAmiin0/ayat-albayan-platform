import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { loadEnv } from './env';
import { setupOpenApi } from './openapi';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  // trustProxy: one hop (Caddy) is trusted, so req.ip is the visitor, not a client-sent X-Forwarded-For (the public feedback form's rate limit keys on it).
  // rawBody: the WhatsApp webhook checks X-Hub-Signature-256 over the exact bytes Meta sent
  // (req.rawBody); re-serialised JSON would not match (docs/12 §3).
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: 1 }), {
    rawBody: true,
  });
  app.enableCors({ origin: env.WEB_ORIGIN.split(',') });
  setupOpenApi(app);
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
