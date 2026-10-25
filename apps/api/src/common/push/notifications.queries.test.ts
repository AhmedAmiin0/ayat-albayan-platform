import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { NotificationsQueries, WEB_PUSH_MAX_PER_PROFILE } from './notifications.queries';

// The takeover check has its own tests (web-push.claim.test.ts); here every browser is free.
vi.mock('./web-push.claim', () => ({ assertBrowserClaim: vi.fn(async () => undefined) }));

type Call = [string, ...unknown[]];

/** Records every builder call per query; awaiting a chain resolves `result`. */
function recordingDb(result: (calls: Call[]) => object) {
  const queries: Call[][] = [];
  const chain = (calls: Call[]): unknown =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          if (prop === 'then') return (ok: (v: unknown) => void) => ok(result(calls));
          return (...args: unknown[]) => {
            calls.push([prop, ...args]);
            return chain(calls);
          };
        },
      },
    );
  const from = (table: string) => {
    const calls: Call[] = [['from', table]];
    queries.push(calls);
    return chain(calls);
  };
  return { db: { from } as unknown as Db, queries };
}

const ROW = { id: 'n1', kind: 'new_student', title: 't', body: 'b', data: { kind: 'new_student', lessonId: 'l1', n: 3 }, created_at: '2026-10-12T08:00:00Z', read_at: null };

describe('NotificationsQueries (R-NOT-01)', () => {
  it('lists the profile’s own rows, newest first, hiding superseded ones; counts unread', async () => {
    const { db } = recordingDb((calls) => (calls.some((c) => c[0] === 'is') ? { data: null, count: 4, error: null } : { data: [ROW], count: 9, error: null }));
    const page = await new NotificationsQueries(db).list('p1', { page: 2, pageSize: 5 });
    expect(page).toEqual({ items: [{ ...ROW, data: { kind: 'new_student', lessonId: 'l1' } }], total: 9, page: 2, pageSize: 5, unread: 4 });
  });

  it('scopes every query to the profile and the :old: filter', async () => {
    const { db, queries } = recordingDb(() => ({ data: [], count: 0, error: null }));
    await new NotificationsQueries(db).list('p1', { page: 2, pageSize: 5 });
    for (const calls of queries) {
      expect(calls).toContainEqual(['eq', 'profile_id', 'p1']);
      expect(calls).toContainEqual(['not', 'dedup_key', 'like', '%:old:%']);
    }
    expect(queries[0]).toContainEqual(['range', 5, 9]);
    expect(queries[1]).toContainEqual(['is', 'read_at', null]);
  });

  it('marks read only the profile’s unread rows (the ids given, or all)', async () => {
    const { db, queries } = recordingDb(() => ({ error: null }));
    const q = new NotificationsQueries(db);
    await q.readMine('p1', ['n1']);
    await q.readMine('p1');
    expect(queries[0]).toEqual(expect.arrayContaining([['eq', 'profile_id', 'p1'], ['is', 'read_at', null], ['in', 'id', ['n1']]]));
    expect(queries[1]?.some((c) => c[0] === 'in')).toBe(false);
    expect(queries[1]).toContainEqual(['eq', 'profile_id', 'p1']);
  });

  it('upserts a browser on its endpoint for the caller (newest again); deletes only the caller’s row', async () => {
    const { db, queries } = recordingDb(() => ({ error: null, data: [] }));
    const q = new NotificationsQueries(db);
    await q.subscribe('p1', { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'k', auth: 'a' } }, 'sess-1');
    await q.unsubscribe('p1', 'https://fcm.googleapis.com/x');
    const row = {
      profile_id: 'p1',
      session_id: 'sess-1',
      endpoint: 'https://fcm.googleapis.com/x',
      p256dh: 'k',
      auth: 'a',
      created_at: expect.any(String),
    };
    expect(queries[0]).toContainEqual(['upsert', row, { onConflict: 'endpoint' }]);
    // Nothing past the cap: no delete; then the unsubscribe.
    expect(queries[1]).toContainEqual([
      'range',
      WEB_PUSH_MAX_PER_PROFILE,
      WEB_PUSH_MAX_PER_PROFILE + 999,
    ]);
    expect(queries[2]).toEqual(
      expect.arrayContaining([
        ['delete'],
        ['eq', 'profile_id', 'p1'],
        ['eq', 'endpoint', 'https://fcm.googleapis.com/x'],
      ]),
    );
  });

  it('keeps only the caller’s newest 10 browsers: the rest are deleted after the upsert', async () => {
    const { db, queries } = recordingDb((calls) => ({
      error: null,
      data: calls.some((c) => c[0] === 'range') ? [{ id: 's11' }, { id: 's12' }] : [],
    }));
    await new NotificationsQueries(db).subscribe('p1', {
      endpoint: 'https://fcm.googleapis.com/y',
      keys: { p256dh: 'k', auth: 'a' },
    }, 'sess-1');
    expect(queries[1]).toEqual(
      expect.arrayContaining([
        ['eq', 'profile_id', 'p1'],
        ['order', 'created_at', { ascending: false }],
      ]),
    );
    expect(queries[2]).toEqual(
      expect.arrayContaining([
        ['delete'],
        ['eq', 'profile_id', 'p1'],
        ['in', 'id', ['s11', 's12']],
      ]),
    );
  });

  it('a session that has just ended (FK violation): 401 no_session, nothing else runs', async () => {
    const { db, queries } = recordingDb(() => ({ error: { code: '23503', message: 'fk' }, data: null }));
    const sub = { endpoint: 'https://fcm.googleapis.com/z', keys: { p256dh: 'k', auth: 'a' } };
    await expect(new NotificationsQueries(db).subscribe('p1', sub, 'sess-gone')).rejects.toMatchObject({ status: 401 });
    expect(queries).toHaveLength(1);
  });
});
