import { activityListQuery } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ActivityRepo, likePrefix, nextDayStart } from './activity.repo';

type Call = [string, ...unknown[]];

/** A chainable PostgREST stand-in: records every call, resolves to `result`. */
function fakeDb(result: { data: unknown[]; count: number; error: null | { code: string; message: string } }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'like', 'lt', 'gte', 'order', 'range', 'returns']) {
    builder[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return builder;
    };
  }
  builder['then'] = (resolve: (v: unknown) => unknown) => resolve(result);
  const db = {
    from: (table: string) => {
      calls.push(['from', table]);
      return builder;
    },
  } as unknown as Db;
  return { db, calls };
}

const row = {
  id: 'r1', at: '2026-10-05T09:00:00+00:00', actor_id: 'u1', actor_name: 'أحمد', actor_role: 'admin',
  action: 'expenses.create', method: 'POST', route: '/expenses', entity: 'expenses', entity_id: 'e1',
  status: 201, duration_ms: 12, meta: { fields: ['amount'] },
};

describe('ActivityQueries.list (GET /activity)', () => {
  it('reads the view newest first, paged, with an id tiebreaker', async () => {
    const { db, calls } = fakeDb({ data: [row], count: 1, error: null });
    const page = await new ActivityRepo(db).list(activityListQuery.parse({}));
    expect(calls[0]).toEqual(['from', 'v_activity_log']);
    expect(calls).toContainEqual(['select', '*', { count: 'exact' }]);
    expect(calls).toContainEqual(['order', 'at', { ascending: false }]);
    expect(calls).toContainEqual(['order', 'id']);
    expect(calls).toContainEqual(['range', 0, 24]);
    expect(page).toEqual({ items: [row], total: 1, page: 1, pageSize: 25 });
  });

  it('applies every filter and the requested sort', async () => {
    const { db, calls } = fakeDb({ data: [], count: 0, error: null });
    const q = activityListQuery.parse({
      page: '3', pageSize: '10', actor_id: 'a0000000-0000-4000-8000-000000000001', role: 'teacher',
      action: 'lesson_x', entity: 'lessons', entity_id: 'L1', result: 'error', from: '2026-10-01', to: '2026-10-31',
      sort: 'status', dir: 'desc',
    });
    await new ActivityRepo(db).list(q);
    expect(calls).toEqual(expect.arrayContaining([
      ['eq', 'actor_id', 'a0000000-0000-4000-8000-000000000001'],
      ['eq', 'actor_role', 'teacher'],
      ['like', 'action', 'lesson\\_x%'],
      ['eq', 'entity', 'lessons'],
      ['eq', 'entity_id', 'L1'],
      ['gte', 'status', 400],
      ['gte', 'at', '2026-10-01T00:00:00+03:00'],
      ['lt', 'at', '2026-11-01T00:00:00+03:00'],
      ['order', 'status', { ascending: false }],
      ['order', 'at', { ascending: false }],
      ['range', 20, 29],
    ]));
  });

  it('result=ok keeps statuses under 400', async () => {
    const { db, calls } = fakeDb({ data: [], count: 0, error: null });
    await new ActivityRepo(db).list(activityListQuery.parse({ result: 'ok' }));
    expect(calls).toContainEqual(['lt', 'status', 400]);
  });

  it('turns a DB error into an exception', async () => {
    const { db } = fakeDb({ data: [], count: 0, error: { code: 'XX000', message: 'boom' } });
    await expect(new ActivityRepo(db).list(activityListQuery.parse({}))).rejects.toThrow(/boom/);
  });
});

describe('helpers', () => {
  it('escapes like wildcards and rolls a day over month ends', () => {
    expect(likePrefix('a%b_c\\')).toBe('a\\%b\\_c\\\\%');
    expect(nextDayStart('2026-12-31')).toBe('2027-01-01T00:00:00+03:00');
  });
});
