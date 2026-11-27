import { describe, expect, it } from 'vitest';
import { registrationCheckRoutes as routes } from '../registration-check.routes';

const MATCH = { name: 'سهيلة', code: 'AB-1001', status: 'active', teacher_name: null };

describe('registrationCheckRoutes', () => {
  it('keeps the path the api serves today', () => {
    expect(`${routes.check.method} ${routes.check.path}`).toBe('GET /sales/registration-check');
  });

  it('reads by a phone or a name, exactly one', () => {
    expect(routes.check.query.parse({ q: 'سهيلة' })).toEqual({ by: 'name', q: 'سهيلة' });
    expect(routes.check.query.safeParse({}).success).toBe(false);
  });

  it('answers the four whitelisted keys of each child and nothing else', () => {
    const view = { found: true, matches: [MATCH], more: false };
    expect(routes.check.response.parse(view)).toEqual(view);
    const leaky = { ...view, matches: [{ ...MATCH, phone: '+966500000000' }] };
    expect(routes.check.response.safeParse(leaky).success).toBe(false);
  });

  it('refuses a child status outside the catalog', () => {
    const view = { found: true, matches: [{ ...MATCH, status: 'gone' }], more: false };
    expect(routes.check.response.safeParse(view).success).toBe(false);
  });
});
