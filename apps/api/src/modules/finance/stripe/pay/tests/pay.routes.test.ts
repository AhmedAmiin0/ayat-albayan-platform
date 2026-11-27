import { describe, expect, it } from 'vitest';
import { OWN_PUBLIC } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { PayController } from '@/modules/finance/stripe/pay/pay.controller';
import { payPageRoutes } from '@/modules/finance/stripe/pay/pay.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const handler = (name: 'get' | 'go' | 'done' | 'cancelled') => PayController.prototype[name];
interface Access {
  permissions?: unknown;
  tags?: unknown;
  isPublic?: unknown;
}
const accessOf = ({ permissions, tags, isPublic }: Access) => ({ permissions, tags, isPublic });

describe('payPageRoutes (docs/30): the pages a browser opens, no client calls them', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(payPageRoutes).map(line)).toEqual([
      'GET /pay/:token',
      'GET /pay/:token/checkout',
      'GET /pay/:token/done',
      'GET /pay/:token/cancelled',
    ]);
  });

  it('answers the link page, a redirect to Checkout and two HTML pages', () => {
    expect(Object.values(payPageRoutes).map((r) => typeof r.response)).toEqual([
      'object',
      'string',
      'string',
      'string',
    ]);
    expect(Object.values(payPageRoutes).slice(1).map((r) => r.response)).toEqual([
      'redirect',
      'file',
      'file',
    ]);
  });

  it('answers the public link as JSON or the pay page as HTML, by the Accept header', () => {
    const { response } = payPageRoutes.page;
    const view = { status: 'processing', first_name: 'S', amount: 1, currency: 'SAR' };
    const json = { ...view, package: null, lessons: 4, sandbox: false };
    expect(response.parse(json)).toEqual(json);
    expect(response.parse('<html></html>')).toBe('<html></html>');
    expect(response.safeParse(view).success).toBe(false);
  });

  it('tags every page stripe and marks it public on its route object', () => {
    for (const route of Object.values(payPageRoutes)) {
      expect(accessOf(route)).toEqual({ permissions: undefined, tags: ['stripe'], isPublic: true });
    }
  });

  it('leaves the public mark to the route objects, not to the controller', () => {
    expect(Reflect.getMetadata(OWN_PUBLIC, PayController)).toBeUndefined();
  });

  it('reads the link token from the path', () => {
    expect(payPageRoutes.done.params.parse({ token: 'abc' })).toEqual({ token: 'abc' });
    expect(payPageRoutes.done.params.safeParse({}).success).toBe(false);
  });

  it('serves each page from its route object', () => {
    expect(routeOf(handler('get'))).toBe(payPageRoutes.page);
    expect(routeOf(handler('go'))).toBe(payPageRoutes.checkout);
    expect(routeOf(handler('done'))).toBe(payPageRoutes.done);
    expect(routeOf(handler('cancelled'))).toBe(payPageRoutes.cancelled);
  });
});
