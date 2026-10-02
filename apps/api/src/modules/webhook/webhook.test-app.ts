// HTTP test harness for the webhook (test-only): AppModule + WebhookModule with the real webhook
// services over fake queries / leads / lessons / push / audit, and rawBody on like main.ts.
import { createHmac } from 'node:crypto';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { TOKEN_VERIFIER } from '../../common/auth/auth.guard';
import { PushService } from '../../common/push/push.service';
import { LeadsService } from '../leads/leads.service';
import { LessonStatusService } from '../lessons/lesson-status.service';
import { fakeDeps } from './webhook.fakes';
import { PHONE_NUMBER_ID } from './webhook.fixtures';
import { WebhookModule } from './webhook.module';
import { WebhookQueries } from './webhook.queries';
import { WEBHOOK_CONFIG, type WebhookConfig } from './webhook.service';

export const SECRET = 'stub-app-secret';
export const VERIFY = 'local-verify-token';

export const sign = (body: string, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

export async function webhookApp(config: Partial<WebhookConfig> = {}) {
  const deps = fakeDeps();
  const mod = await Test.createTestingModule({ imports: [AppModule, WebhookModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(async () => {
      throw new Error('no users in webhook tests');
    })
    .overrideProvider(WEBHOOK_CONFIG)
    .useValue({ appSecret: SECRET, verifyToken: VERIFY, phoneNumberId: PHONE_NUMBER_ID, ...config })
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
  return { ...deps, app, post };
}
