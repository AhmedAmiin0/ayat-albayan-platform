// HTTP test harness for the webhook (test-only): AppModule + WebhookModule with the real webhook
// services over fake queries / leads / lessons / push / audit, and rawBody on like main.ts.
import { createHmac } from 'node:crypto';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '../../common/auth/auth.guard';
import { PushService } from '../../common/push/push.service';
import { LeadsService } from '../leads/leads.service';
import { LessonStatusService } from '../lessons/lesson-status.service';
import { fakeDeps } from './webhook.fakes';
import { PHONE_NUMBER_ID } from './meta.fakes';
import { WebhookModule } from './webhook.module';
import { WebhookQueries } from './webhook.queries';
import { WEBHOOK_CONFIG, type WebhookConfig } from './webhook.service';

export const SECRET = 'stub-app-secret';
export const CHAT_SECRET = 'stub-chat-app-secret';
export const VERIFY = 'local-verify-token';
export const KAPSO_SECRET = 'stub-kapso-webhook-secret';
export const WACRM_SECRET = 'stub-wacrm-webhook-secret';

/** The CRM's X-Wacrm-Signature: «t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${body}`>». */
export const wacrmSign = (body: string, at: { t?: number; secret?: string } = {}) => {
  const t = at.t ?? Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac('sha256', at.secret ?? WACRM_SECRET).update(`${t}.${body}`).digest('hex')}`;
};

/** Kapso's X-Webhook-Signature: lowercase hex HMAC-SHA256 of the raw body, no «sha256=» prefix. */
export const kapsoSign = (body: string, secret = KAPSO_SECRET) => createHmac('sha256', secret).update(body).digest('hex');

export const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

export async function webhookApp(config: Partial<WebhookConfig> = {}) {
  const deps = fakeDeps();
  const mod = await Test.createTestingModule({ imports: [AppModule, WebhookModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
    .useValue(async () => {
      throw new Error('no users in webhook tests');
    })
    .overrideProvider(WEBHOOK_CONFIG)
    .useValue({ appSecrets: [SECRET], verifyToken: VERIFY, numbers: { notifications: PHONE_NUMBER_ID }, kapsoSecret: KAPSO_SECRET, wacrmSecret: WACRM_SECRET, ...config })
    .overrideProvider(WebhookQueries)
    .useValue(deps.queries)
    .overrideProvider(LeadsService)
    .useValue(deps.leads)
    .overrideProvider(LessonStatusService)
    .useValue(deps.lessons)
    .overrideProvider(PushService)
    .useValue(deps.push)
    .overrideProvider(AuditService)
    .useValue(deps.audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  /** POSTs `body` exactly as given (a string), signed unless `signature` is passed. */
  const post = (body: string, signature: string | null = sign(body)) =>
    app.inject({
      method: 'POST',
      url: '/webhooks/whatsapp',
      headers: { 'content-type': 'application/json', ...(signature === null ? {} : { 'x-hub-signature-256': signature }) },
      payload: body,
    });
  /** POSTs `body` as given to /webhooks/kapso with exactly these headers (besides content-type). */
  const postKapso = (body: string, headers: Record<string, string> = { 'x-webhook-signature': kapsoSign(body) }) =>
    app.inject({ method: 'POST', url: '/webhooks/kapso', headers: { 'content-type': 'application/json', ...headers }, payload: body });
  /** POSTs `body` as given to /webhooks/wacrm, signed now unless `signature` is passed (null = none). */
  const postWacrm = (body: string, signature: string | null = wacrmSign(body)) =>
    app.inject({
      method: 'POST',
      url: '/webhooks/wacrm',
      headers: { 'content-type': 'application/json', ...(signature === null ? {} : { 'x-wacrm-signature': signature }) },
      payload: body,
    });
  return { ...deps, app, post, postKapso, postWacrm };
}
