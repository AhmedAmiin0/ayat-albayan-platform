import { expect, test } from '@playwright/test';
import { withSql } from '../../support/core/schedule';

// The update trigger of migration 20261028000921 (thread_summaries) must refresh a phone on every status / text tick,
// with no unlocked "is it the newest?" pre-filter: here one session deletes the phone's newest row
// while another ticks the next row; once both commit the summary shows the tick. Two real sessions
// (committed rows, deleted at the end); database only, no message is ever sent.

const C = '+966500000852';

/** A promise and its resolver, to order the two sessions. */
function gate(): { wait: Promise<void>; open: () => void } {
  let open = (): void => undefined;
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait, open };
}

test.describe('thread_summaries under two concurrent sessions', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a delete of the newest row and a tick of the next row in parallel leave the summary correct', async () => {
    await withSql(async (sql) => {
      await sql`delete from public.messages where phone_e164 = ${C}`;
      const [next] = await sql<{ id: string }[]>`insert into public.messages (direction, phone_e164, body, status, created_at)
        values ('outbound', ${C}, 'التالية', 'queued', now() - interval '2 minutes') returning id`;
      await sql`insert into public.messages (direction, phone_e164, body, status, created_at)
        values ('outbound', ${C}, 'الأحدث', 'queued', now() - interval '1 minute')`;
      if (!next) throw new Error('next row not written');
      try {
        const deleted = gate();
        const ticked = gate();
        const first = sql.begin(async (tx) => {
          await tx`delete from public.messages where phone_e164 = ${C} and body = 'الأحدث'`;
          deleted.open();
          await ticked.wait;
        });
        await deleted.wait;
        let pid = 0;
        let done = false;
        const second = withSql((other) =>
          other.begin(async (tx) => {
            const [me] = await tx<{ pid: number }[]>`select pg_backend_pid() as pid`;
            pid = me?.pid ?? 0;
            await tx`update public.messages set status = 'sent' where id = ${next.id}`;
            done = true;
          }),
        );
        // The first commits only once the tick has run (old pre-filter) or waits on the phone's lock (fix).
        await withSql(async (watch) => {
          for (let i = 0; i < 200 && !done; i += 1) {
            const [w] = await watch<{ blocked: boolean }[]>`select exists (select 1 from pg_locks
              where pid = ${pid} and not granted) as blocked`;
            if (pid > 0 && w?.blocked) break;
            await new Promise((r) => setTimeout(r, 25));
          }
        });
        ticked.open();
        await Promise.all([first, second]);
        const [row] = await sql<{ id: string; status: string }[]>`select last_message_id as id, last_status::text as status
          from public.thread_summaries where phone_e164 = ${C}`;
        expect(row).toEqual({ id: next.id, status: 'sent' });
      } finally {
        await sql`delete from public.messages where phone_e164 = ${C}`;
      }
    });
  });
});
