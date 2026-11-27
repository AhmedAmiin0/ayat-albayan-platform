import { describe, expect, it } from 'vitest';
import { stripeRoutes } from '../stripe.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});

describe('stripeRoutes (docs/30)', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(stripeRoutes).map(line)).toEqual([
      'GET /stripe/feature',
      'POST /webhooks/stripe',
    ]);
  });

  it('tags both as stripe and names no permission: the feature is public, Stripe signs the hook', () => {
    for (const route of Object.values(stripeRoutes)) {
      expect(accessOf(route)).toEqual({
        permissions: undefined,
        tags: ['stripe'],
      });
    }
  });

  it('answers whether online payment is ready', () => {
    expect(stripeRoutes.feature.response.parse({ stripe: true })).toEqual({ stripe: true });
  });

  it.each([[{}], [{ stripe: 'yes' }], [null]])('refuses the feature answer %j', (answer) => {
    expect(stripeRoutes.feature.response.safeParse(answer).success).toBe(false);
  });

  it('acknowledges a webhook with received: true only', () => {
    const r = stripeRoutes.webhook.response;
    expect(r.parse({ received: true })).toEqual({ received: true });
    expect(r.safeParse({ received: false }).success).toBe(false);
  });
});
