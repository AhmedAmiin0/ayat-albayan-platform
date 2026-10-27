import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { registerClientUsage } from './common/client-usage/client-usage.hook';
import { ClientUsageService } from './common/client-usage/client-usage.service';
import { loadEnv } from './config/env/env';
import { appRole, servesPublicHttp, trustProxyHops } from './config/role/app-role';
import { registerRoleHttp } from './modules/platform/process-role';
import { registerLivekitWebhookParser } from './modules/teaching/classroom/livekit/livekit-webhook.controller';
import { setupOpenApi } from './openapi';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const role = appRole();
  // trustProxy: the proxies in front (TRUST_PROXY_HOPS: 1 = the host Caddy, 2 = it + deploy/staging's load
  // balancer) are trusted, so req.ip is the visitor, not a client-sent X-Forwarded-For (the rate limits key on it).
  // rawBody: the WhatsApp webhook checks X-Hub-Signature-256 over the exact bytes Meta sent
  // (req.rawBody); re-serialised JSON would not match (docs/12 §3).
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: trustProxyHops() }), {
    rawBody: true,
  });
  // APP_ROLE (docs/09): the worker answers /health and its kick route only; the API copies never /internal.
  registerRoleHttp(app, role);
  // LiveKit posts application/webhook+json (POST /livekit/webhook), kept as raw bytes for its signature.
  registerLivekitWebhookParser(app);
  // X-AB-Client hits per route × build (docs/26 §2f). No allowedHeaders below: @fastify/cors reflects the request's headers.
  registerClientUsage(app, app.get(ClientUsageService));
  app.enableCors({ origin: env.WEB_ORIGIN.split(',') });
  if (servesPublicHttp(role)) setupOpenApi(app);
  // SIGTERM (a rolling deploy): stop taking connections, finish the requests in flight, stop the jobs' timers.
  app.enableShutdownHooks();
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
