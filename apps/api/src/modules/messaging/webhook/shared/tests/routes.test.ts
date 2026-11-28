import { describe, expect, it } from 'vitest';
import { OWN_PUBLIC } from '@/common/auth/decorators';
import { EvolutionWebhookController } from '@/modules/messaging/webhook/evolution/evolution-webhook.controller';
import { WacrmWebhookController } from '@/modules/messaging/webhook/providers/webhook.wacrm.controller';
import { webhookRoutes as routes } from '@/modules/messaging/webhook/shared';
import { WebhookController } from '@/modules/messaging/webhook/webhook.controller';
import { KapsoWebhookController } from '@/modules/messaging/webhook/webhook.kapso.controller';

describe('webhookRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /webhooks/whatsapp',
      'POST /webhooks/whatsapp',
      'POST /webhooks/kapso',
      'POST /webhooks/wacrm',
      'POST /webhooks/evolution/:instance',
    ]);
  });

  it('answers the Meta handshake as text and every delivery with no body', () => {
    expect(routes.metaChallenge.response.parse('1158201444')).toBe('1158201444');
    const deliveries = [routes.meta, routes.kapso, routes.wacrm, routes.evolution];
    expect(deliveries.map((r) => r.response)).toEqual(['empty', 'empty', 'empty', 'empty']);
  });

  it('tags every callback webhooks, marks it public and asks no permission of the caller', () => {
    for (const route of Object.values(routes)) {
      expect(route.tags).toEqual(['webhooks']);
      expect(route.isPublic).toBe(true);
      expect(route).not.toHaveProperty('permissions');
    }
  });

  it('leaves the public mark to the route objects, not to the controllers', () => {
    const controllers = [
      WebhookController,
      KapsoWebhookController,
      WacrmWebhookController,
      EvolutionWebhookController,
    ];
    for (const c of controllers) expect(Reflect.getMetadata(OWN_PUBLIC, c)).toBeUndefined();
  });

  it('leaves each payload to its controller, parsed after the signature check', () => {
    for (const route of Object.values(routes)) expect(route).not.toHaveProperty('body');
  });

  it('takes an Evolution instance name and nothing else', () => {
    expect(routes.evolution.params.parse({ instance: 'ab-main' })).toEqual({ instance: 'ab-main' });
    expect(routes.evolution.params.safeParse({ instance: 'a b' }).success).toBe(false);
  });
});
