import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import { differ, put, react, SAME } from './thread-activity.helpers';

// v_threads on thread_summaries (migration 20261106001100, docs/44 K4): column by column 984's
// aggregate (verbatim but for the id tiebreak, BUG9), + activity. Rolled back; no message is sent.

const A = '+966500001101';
const B = '+966500001102';
const LAST_INBOUND = 'last_notifications_inbound_at';
const ACTIVITY = ['last_family_read_at', 'last_activity_at'];

async function activity(tx: Tx, phone: string) {
  const [r] = await tx<{ fam: string | null; act: string | null; last: string }[]>`select
    (last_family_read_at at time zone 'UTC')::text as fam,
    (last_activity_at at time zone 'UTC')::text as act, last_message_id::text as last
    from public.v_threads where phone_e164 = ${phone}`;
  return r;
}

test.describe('v_threads on thread_summaries + activity (migration 20261106001100)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('every column equals migration 984’s aggregate on the seeded data', async () => {
    await rolledBack(async (tx) => {
      expect(await differ(tx)).toEqual(SAME);
    });
  });

  test('stays equal: a created_at tie, reactions, calls line, read stamps, deletes', async () => {
    await rolledBack(async (tx) => {
      const at = '2026-11-01T10:00:00Z';
      const ids = [
        await put(tx, { phone: A, dir: 'outbound', at }),
        await put(tx, { phone: A, dir: 'inbound', at, line: 'chat' }),
      ];
      await react(tx, A, '2026-11-01T10:05:00Z');
      await put(tx, { phone: B, dir: 'inbound', at, line: 'calls' });
      await react(tx, B, '2026-11-01T10:06:00Z');
      expect(await differ(tx)).toEqual(SAME);
      // BUG9: of two rows with one created_at, the chat's last bubble (id desc), not the reaction.
      expect((await activity(tx, A))?.last).toBe([...ids].sort().reverse()[0]);
      await tx`update public.messages set read_at = now()
        where phone_e164 = ${A} and direction = 'inbound'`;
      await tx`delete from public.messages where phone_e164 = ${B} and interactive_payload is null`;
      expect(await differ(tx)).toEqual(SAME);
      expect(await tx`select 1 from public.v_threads where phone_e164 = ${B}`).toHaveLength(0);
    });
  });

  test('last activity: the family read ours (outbound read_at alone) or wrote', async () => {
    await rolledBack(async (tx) => {
      const out = await put(tx, { phone: A, dir: 'outbound', at: '2026-11-01T09:00:00Z' });
      await put(tx, { phone: A, dir: 'inbound', at: '2026-11-01T08:00:00Z', line: 'chat' });
      // Staff opening the chat stamps INBOUND read_at: never the family's activity.
      await tx`update public.messages set read_at = '2026-11-01T11:00:00Z'
        where phone_e164 = ${A} and direction = 'inbound'`;
      expect(await activity(tx, A)).toMatchObject({ fam: null, act: '2026-11-01 08:00:00' });
      await tx`update public.messages set read_at = '2026-11-01T12:00:00Z' where id = ${out}`;
      const noon = '2026-11-01 12:00:00';
      expect(await activity(tx, A)).toMatchObject({ fam: noon, act: noon });
      const [badge] = await tx<{ same: boolean }[]>`select
        (select count(*) from public.thread_summaries where unread_count > 0)
        = (select count(*) from public.v_threads where unread_count > 0) as same`;
      expect(badge?.same).toBe(true);
    });
  });

  test('two columns appended to both views; anon and authenticated still denied', async () => {
    await rolledBack(async (tx) => {
      const cols = async (view: string) =>
        (
          await tx<{ c: string }[]>`select column_name as c from information_schema.columns
          where table_schema = 'public' and table_name = ${view}
          order by ordinal_position`
        ).map((r) => r.c);
      for (const view of ['v_threads', 'v_list_threads']) {
        expect((await cols(view)).slice(-3)).toEqual([LAST_INBOUND, ...ACTIVITY]);
      }
      const [g] = await tx<{ anon: boolean; auth: boolean }[]>`select
        has_table_privilege('anon', 'public.v_threads', 'select') as anon,
        has_table_privilege('authenticated', 'public.v_threads', 'select') as auth`;
      expect(g).toEqual({ anon: false, auth: false });
    });
  });
});
