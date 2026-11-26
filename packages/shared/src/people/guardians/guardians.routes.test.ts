import { describe, expect, it } from 'vitest';
import { guardianRoutes } from './guardians.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const guardian = {
  id: ID,
  name: 'أم سهيلة',
  phone_e164: '+966501234567',
  country: 'SA',
  tz: 'Asia/Riyadh',
  source: null,
  notes: null,
  profile_id: null,
  created_by: null,
  created_at: '2026-10-03T09:00:00.000Z',
  updated_at: '2026-10-03T09:00:00.000Z',
};
const detail = {
  ...guardian,
  students: [{ id: ID, code: 'AB-0183', name: 'سهيلة', status: 'active' }],
  phones: [{ phone_e164: '+966501234567', is_primary: true, created_at: guardian.created_at }],
};

describe('guardianRoutes (R-STU-02, R-STU-04)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(guardianRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /guardians',
      'GET /guardians/:id',
      'POST /guardians',
      'PATCH /guardians/:id',
      'DELETE /guardians/:id',
      'DELETE /guardians/:id/phones/:phone',
    ]);
  });

  it('answers a page of guardians and one with its students and numbers', () => {
    const page = { items: [guardian], total: 1, page: 1, pageSize: 20 };
    expect(guardianRoutes.list.response.parse(page)).toEqual(page);
    expect(guardianRoutes.get.response.parse(detail)).toEqual(detail);
  });

  it('pages 20 by default and trims the search', () => {
    const query = guardianRoutes.list.query.parse({ search: ' سهيلة ' });
    expect(query).toEqual({ search: 'سهيلة', page: 1, pageSize: 20 });
    expect(guardianRoutes.list.query.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('reads blank form fields as null and the phone as E.164', () => {
    const body = { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh', notes: '' };
    expect(guardianRoutes.create.body.parse(body)).toMatchObject({
      phone_e164: '+966501234567',
      notes: null,
    });
    expect(guardianRoutes.update.body.parse({ notes: '' })).toEqual({ notes: null });
  });

  it.each([
    ['a bad id', { id: 'x', phone: '+966552220000' }],
    ['a bad phone', { id: ID, phone: '@handle' }],
  ])('refuses %s in the path', (_name, params) => {
    expect(guardianRoutes.removePhone.params.safeParse(params).success).toBe(false);
  });

  it('refuses a guardian row with an unknown lead source', () => {
    const bad = { ...guardian, source: 'billboard' };
    expect(guardianRoutes.create.response.safeParse(bad).success).toBe(false);
  });
});
