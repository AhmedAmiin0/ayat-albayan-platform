import { describe, expect, it } from 'vitest';
import { leadFamilyRoutes as routes } from '../family-link.routes';

describe('leadFamilyRoutes', () => {
  it('keeps the path, the permission and the tag the api serves today', () => {
    const { method, path, permissions, tags } = routes.link;
    expect([method, path, permissions, tags]).toEqual([
      'POST',
      '/leads/:id/link-family',
      ['leads.link_family'],
      ['leads'],
    ]);
  });

  it('takes a lead id and a generated code only', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(routes.link.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.link.params.parse({ id })).toEqual({ id });
    expect(routes.link.body.parse({ code: ' ab-0183 ' })).toEqual({ code: 'AB-0183' });
  });

  it('answers { linked } and nothing else', () => {
    expect(routes.link.response.parse({ linked: false })).toEqual({ linked: false });
    expect(routes.link.response.safeParse({ linked: true, guardian_id: 'g' }).success).toBe(false);
    expect(routes.link.response.safeParse({}).success).toBe(false);
  });
});
