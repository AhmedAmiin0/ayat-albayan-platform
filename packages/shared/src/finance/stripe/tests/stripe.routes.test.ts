import { describe, expect, it } from 'vitest';
import { stripeRoutes } from '../stripe.routes';

describe('stripeRoutes (docs/30)', () => {
  it('keeps the path the api serves today', () => {
    expect(`${stripeRoutes.feature.method} ${stripeRoutes.feature.path}`).toBe(
      'GET /stripe/feature',
    );
  });

  it('answers whether online payment is ready', () => {
    expect(stripeRoutes.feature.response.parse({ stripe: true })).toEqual({ stripe: true });
  });

  it.each([[{}], [{ stripe: 'yes' }], [null]])('refuses %j', (answer) => {
    expect(stripeRoutes.feature.response.safeParse(answer).success).toBe(false);
  });
});
