import { describe, expect, it } from 'vitest';
import { routeOf } from '@/common/http/route';
import { PayController } from '@/modules/finance/stripe/pay/pay.controller';
import { payPageRoutes } from '@/modules/finance/stripe/pay/pay.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const handler = (name: 'go' | 'done' | 'cancelled') => PayController.prototype[name];
const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});

describe('payPageRoutes (docs/30): the pages a browser opens, no client calls them', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(payPageRoutes).map(line)).toEqual([
      'GET /pay/:token/checkout',
      'GET /pay/:token/done',
      'GET /pay/:token/cancelled',
    ]);
  });

  it('answers a redirect to Checkout and two HTML pages, never JSON', () => {
    expect(Object.values(payPageRoutes).map((r) => r.response)).toEqual([
      'redirect',
      'file',
      'file',
    ]);
  });

  it('tags every page stripe and names no permission: the pages are public', () => {
    for (const route of Object.values(payPageRoutes)) {
      expect(accessOf(route)).toEqual({ permissions: undefined, tags: ['stripe'] });
    }
  });

  it('reads the link token from the path', () => {
    expect(payPageRoutes.done.params.parse({ token: 'abc' })).toEqual({ token: 'abc' });
    expect(payPageRoutes.done.params.safeParse({}).success).toBe(false);
  });

  it('serves each page from its route object', () => {
    expect(routeOf(handler('go'))).toBe(payPageRoutes.checkout);
    expect(routeOf(handler('done'))).toBe(payPageRoutes.done);
    expect(routeOf(handler('cancelled'))).toBe(payPageRoutes.cancelled);
  });
});
