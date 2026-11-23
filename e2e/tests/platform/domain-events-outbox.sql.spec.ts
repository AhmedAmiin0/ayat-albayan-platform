import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { withSql } from '../../support/core/schedule';
import { rolledBack, type Tx } from '../../support/core/rls';

// The domain events outbox (migration 20261123000100) against the real database: the event exists
// iff the producer's transaction committed, and its id is the dedup key (rule 8). The worker may
// deliver the committed probe meanwhile; that changes its state, never the row count.

const PROBE = { probe_id: '0b6c1d2e-3f40-4a51-8b62-7c8d9e0f1a2b' };

const enqueue = (tx: Tx, id: string) =>
  tx`select public.enqueue_domain_event('events.probe', ${tx.json(PROBE)}, ${id}::uuid)`;

const countOf = (id: string) =>
  withSql(async (sql) => {
    const [row] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.domain_events where id = ${id}::uuid`;
    return row?.n ?? -1;
  });

const remove = (id: string) =>
  withSql((sql) => sql`delete from public.domain_events where id = ${id}::uuid`);

test.describe('domain events outbox (SQL)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a rolled-back producer leaves no event', async () => {
    const id = randomUUID();
    await rolledBack(async (tx) => {
      await enqueue(tx, id);
      const [seen] = await tx<{ n: number }[]>`
        select count(*)::int as n from public.domain_events where id = ${id}::uuid`;
      expect(seen?.n).toBe(1);
    });
    expect(await countOf(id)).toBe(0);
  });

  test('a committed producer leaves exactly one, and the same id again adds none', async () => {
    const id = randomUUID();
    try {
      await withSql((sql) => sql.begin((tx) => enqueue(tx, id)));
      await withSql((sql) => sql.begin((tx) => enqueue(tx, id)));
      expect(await countOf(id)).toBe(1);
    } finally {
      await remove(id);
    }
  });

  test('clients cannot read the outbox or call its functions', async () => {
    await rolledBack(async (tx) => {
      const [grants] = await tx<{ rls: boolean; read: boolean; enqueue: boolean }[]>`
        select c.relrowsecurity as rls,
          has_table_privilege('authenticated', 'public.domain_events', 'select') as read,
          has_function_privilege('authenticated',
            'public.enqueue_domain_event(text, jsonb, uuid)', 'execute') as enqueue
        from pg_class c where c.oid = 'public.domain_events'::regclass`;
      expect(grants).toEqual({ rls: true, read: false, enqueue: false });
    });
  });
});
