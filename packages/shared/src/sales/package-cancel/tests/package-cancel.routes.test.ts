import { describe, expect, it } from 'vitest';
import { salesPackageCancelRoutes as routes } from '../package-cancel.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const ACCESS = [['subscriptions.stop'], ['sales']];

describe('salesPackageCancelRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const rows = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(rows).toEqual([
      ['GET', '/sales/packages/:id/cancel', ...ACCESS],
      ['POST', '/sales/packages/:id/cancel', ...ACCESS],
    ]);
  });

  it('takes the subscription uuid', () => {
    expect(routes.check.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.cancel.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('reads an absent or null body as no reason, and refuses an unknown key', () => {
    expect(routes.cancel.body.parse(undefined)).toEqual({});
    expect(routes.cancel.body.parse(null)).toEqual({});
    expect(routes.cancel.body.parse({ reason: ' late ' })).toEqual({ reason: 'late' });
    expect(routes.cancel.body.safeParse({ refund: true }).success).toBe(false);
  });

  it('answers the block or null, and the cancelled package without a price', () => {
    expect(routes.check.response.parse({ subscriptionId: ID, block: null }).block).toBeNull();
    expect(routes.check.response.safeParse({ subscriptionId: ID, block: 'other' }).success).toBe(
      false,
    );
    const done = { id: ID, status: 'cancelled' };
    expect(routes.cancel.response.parse(done)).toEqual(done);
  });
});
