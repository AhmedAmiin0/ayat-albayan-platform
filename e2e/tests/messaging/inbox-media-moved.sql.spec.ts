import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';

// Migration 20261107000100: a message whose only change is its media relocated to MinIO
// (storage-move, docs/45 §6: «minio:» + the same path) sends no 'thread_changed'; media arriving
// (null → path) and every other update still do (860). The sender is replaced by a recorder inside
// the rolled-back transaction, as in inbox-realtime.sql.spec.ts.

const A = '+966500001075';
const B = '+966500001076';
const C = '+966500001077';

async function captureSends(tx: Tx): Promise<() => Promise<string[][]>> {
  await tx.unsafe(`create temp table live_sent (id serial, phones text[]) on commit drop;
    create or replace function public.inbox_live_send(p_phones text[]) returns void
      language sql set search_path = '' as $$ insert into pg_temp.live_sent (phones) values (p_phones) $$;`);
  return async () =>
    (await tx<{ phones: string[] }[]>`select phones from pg_temp.live_sent order by id`).map((r) =>
      [...r.phones].sort(),
    );
}

/** The row's updated_at (the sync cursor), as text: microseconds kept. */
const updatedAt = async (tx: Tx, phone: string) =>
  (await tx<{ at: string }[]>`select updated_at::text as at from public.messages
    where phone_e164 = ${phone}`)[0]?.at ?? '';

test.describe('inbox broadcast skips a media move (20261107000100)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('media arriving broadcasts; its move to MinIO does not, yet the sync cursor moves', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.messages (direction, phone_e164, body) values
        ('inbound', ${A}, 'one'), ('inbound', ${B}, 'two')`;
      const sends = await captureSends(tx);
      await tx`update public.messages set media_path = 'in/' || id || '.jpg' where phone_e164 = ${A}`;
      expect(await sends()).toEqual([[A]]);
      const before = await updatedAt(tx, A);
      await tx`update public.messages set media_path = 'minio:' || media_path where phone_e164 = ${A}`;
      expect(await sends()).toEqual([[A]]);
      const [moved] = await tx<{ later: boolean }[]>`select updated_at > ${before}::timestamptz as later
        from public.messages where phone_e164 = ${A}`;
      expect(moved?.later).toBe(true);
    });
  });

  test('a move together with another change, or next to another row, still broadcasts', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.messages (direction, phone_e164, body, media_path) values
        ('inbound', ${A}, 'one', 'in/a.jpg'), ('inbound', ${B}, 'two', 'in/b.jpg'),
        ('inbound', ${C}, 'three', 'in/c.jpg')`;
      const sends = await captureSends(tx);
      await tx`update public.messages set media_path = 'minio:' || media_path, read_at = now()
        where phone_e164 = ${A}`;
      // B moves only (skipped), C moves and is delivered (sent): one send, C alone.
      await tx`update public.messages
        set media_path = 'minio:' || media_path,
            status = case when phone_e164 = ${C} then 'delivered' else status end
        where phone_e164 in (${B}, ${C})`;
      await tx`update public.messages set media_path = 'other/a.jpg' where phone_e164 = ${A}`;
      expect(await sends()).toEqual([[A], [C], [A]]);
    });
  });
});
