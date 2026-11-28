import { describe, expect, it } from 'vitest';
import { activityRoutes as routes } from '..';
import { anActivityRow } from './activity-row.fixtures';

const pageWith = (row: unknown) => ({ items: [row], total: 1, page: 1, pageSize: 25 });

describe('activityRoutes', () => {
  it('keeps the path of today, for activity readers, under the activity tag', () => {
    expect(`${routes.list.method} ${routes.list.path}`).toBe('GET /activity');
    expect(routes.list.permissions).toEqual(['activity.read']);
    expect(routes.list.tags).toEqual(['activity']);
  });

  it('reads the list query with its page defaults', () => {
    const query = routes.list.query.parse({ entity: 'students', result: 'error' });
    expect(query).toMatchObject({ entity: 'students', result: 'error', page: 1, pageSize: 25 });
    expect(routes.list.query.safeParse({ result: 'maybe' }).success).toBe(false);
  });

  it('answers one page of rows, signed in or not', () => {
    const page = pageWith(anActivityRow());
    expect(routes.list.response.parse(page)).toEqual(page);
    const signedIn = { ...anActivityRow(), actor_id: 'u1', actor_name: 'x', actor_role: 'admin' };
    expect(routes.list.response.parse(pageWith(signedIn))).toEqual(pageWith(signedIn));
  });

  it('refuses a time without offset, a fractional status or a meta that is not an object', () => {
    const base = anActivityRow();
    const bad = [
      { ...base, at: '2026-11-27 10:00' },
      { ...base, status: 200.5 },
      { ...base, duration_ms: -1 },
      { ...base, meta: ['fields'] },
      { ...base, entity: undefined },
    ];
    for (const row of bad) {
      expect(routes.list.response.safeParse(pageWith(row)).success).toBe(false);
    }
  });
});
