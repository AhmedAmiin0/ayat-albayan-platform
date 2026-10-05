import { describe, expect, it } from 'vitest';
import { activityListQuery } from './activity.js';

describe('activityListQuery («سجل النشاط»)', () => {
  it('defaults to page 1 of 25 with no filters', () => {
    expect(activityListQuery.parse({})).toEqual({ page: 1, pageSize: 25 });
  });

  it('accepts every filter; blanks are dropped', () => {
    const q = activityListQuery.parse({
      page: '2',
      actor_id: 'a0000000-0000-4000-8000-000000000001',
      role: 'public',
      action: ' students ',
      entity: 'students',
      entity_id: 'abc',
      result: 'error',
      from: '2026-10-01',
      to: '',
      sort: 'status',
      dir: 'desc',
    });
    expect(q).toEqual({
      page: 2,
      pageSize: 25,
      actor_id: 'a0000000-0000-4000-8000-000000000001',
      role: 'public',
      action: 'students',
      entity: 'students',
      entity_id: 'abc',
      result: 'error',
      from: '2026-10-01',
      sort: 'status',
      dir: 'desc',
    });
  });

  it.each([
    { role: 'root' },
    { action: "x'; drop" },
    { entity: 'Students!' },
    { result: 'maybe' },
    { from: '01/10/2026' },
    { sort: 'ip' },
    { pageSize: '500' },
    { actor_id: 'not-a-uuid' },
  ])('rejects %o', (bad) => {
    expect(activityListQuery.safeParse(bad).success).toBe(false);
  });
});
