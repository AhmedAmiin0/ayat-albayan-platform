import { describe, expect, it } from 'vitest';
import { notificationsQuerySchema, notificationsReadSchema } from './views.js';

const ID = '3f1c2a5e-8b7d-4c1e-9a2b-1d2e3f4a5b6c';

describe('bell schemas (R-NOT-01)', () => {
  it('page and pageSize default and cap', () => {
    expect(notificationsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(notificationsQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({ page: 2, pageSize: 50 });
    expect(notificationsQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(notificationsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('read: no ids = all, 1..100 uuids, nothing else', () => {
    expect(notificationsReadSchema.parse({})).toEqual({});
    expect(notificationsReadSchema.parse({ ids: [ID] })).toEqual({ ids: [ID] });
    expect(notificationsReadSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ ids: ['x'] }).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ ids: Array.from({ length: 101 }, () => ID) }).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ ids: [ID], profileId: ID }).success).toBe(false);
  });
});
