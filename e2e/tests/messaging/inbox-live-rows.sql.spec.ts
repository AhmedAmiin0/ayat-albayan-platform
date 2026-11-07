import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import { captureEvents, type LiveEvent } from './inbox-live.helpers';

// Migration 20261107000200 (docs/44 P1-2 / K1): the push carries the tick, {phone, rows:[{id, s,
// d, at}]}, and {phone} alone for anything not every 'inbox:staff' reader may see, anything the
// tick cannot describe, and more than 20 rows. Real database, rolled back.

const A = '+966500001201';
const B = '+966500001202';
const OWN = '+966500001209';

const idsOf = async (tx: Tx, phone: string) =>
  (
    await tx<{ id: string }[]>`select id from public.messages where phone_e164 = ${phone}
    order by created_at, id`
  ).map((r) => r.id);

/** The first row of the first event of statement `n`. */
const firstRow = (all: LiveEvent[][], n: number) => all[n]?.[0]?.rows?.[0];

/** Each event as its phone and its rows' ids and statuses (null: phone only). */
const shape = (events: LiveEvent[]) =>
  events.map((e) => [e.phone, e.rows?.map((r) => `${r.s}:${r.d}`) ?? null]);

test.describe('inbox live rows (20261107000200)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('a new row and a tick carry id, status, direction and time; nothing else', async () => {
    await rolledBack(async (tx) => {
      const events = await captureEvents(tx);
      await tx`insert into public.messages (direction, phone_e164, body) values
        ('outbound', ${A}, 'secret body'), ('inbound', ${B}, 'hello')`;
      const [id = ''] = await idsOf(tx, A);
      await tx`update public.messages set error_code = 'sending', attempts = 1 where id = ${id}`;
      await tx`update public.messages set status = 'sent', error_code = null, sent_at = now(),
        wa_message_id = 'e2e-live-1' where id = ${id}`;
      const all = await events();
      expect(all.map(shape)).toEqual([
        [
          [A, ['queued:outbound']],
          [B, ['queued:inbound']],
        ],
        [[A, ['queued:outbound']]],
        [[A, ['sent:outbound']]],
      ]);
      const row = firstRow(all, 2);
      expect(Object.keys(row ?? {}).sort()).toEqual(['at', 'd', 'id', 's']);
      expect(row?.id).toBe(id);
      expect(JSON.stringify(all)).not.toContain('secret body');
    });
  });

  test('link templates, hidden, reaction and own-number rows go out as {phone} only', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.wa_numbers (label, purpose, phone_number_id, display_phone_e164)
        values ('e2e live', 'chat', 'e2e-live-own', ${OWN})`;
      const events = await captureEvents(tx);
      await tx`insert into public.messages (direction, phone_e164, template_key, template_params)
        values ('outbound', ${A}, 'lesson_join_link', '{"button": "abc"}')`;
      await tx`insert into public.messages (direction, phone_e164, body, interactive_payload)
        values ('inbound', ${B}, '👍', '{"type": "reaction"}')`;
      await tx`insert into public.messages (direction, phone_e164, body) values ('outbound', ${OWN}, 'x')`;
      await tx`insert into public.messages (direction, phone_e164, body, hidden_at)
        values ('outbound', ${B}, 'gone', now())`;
      // One untellable row hides the whole phone's ids, the tellable one beside it included.
      await tx`insert into public.messages (direction, phone_e164, body, template_key) values
        ('outbound', ${A}, 'plain', null), ('outbound', ${A}, null, 'lesson_feedback_request')`;
      expect((await events()).map(shape)).toEqual([
        [[A, null]],
        [[B, null]],
        [[OWN, null]],
        [[B, null]],
        [[A, null]],
      ]);
    });
  });

  test('edits, hides, failures and inbound read marks re-read; over 20 rows is {phone}', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.messages (direction, phone_e164, body) values
        ('outbound', ${A}, 'one'), ('inbound', ${B}, 'two')`;
      const events = await captureEvents(tx);
      await tx`update public.messages set body = 'edited', edited_at = now() where phone_e164 = ${A}`;
      await tx`update public.messages set hidden_at = now() where phone_e164 = ${A}`;
      await tx`update public.messages set status = 'failed', error_code = '131',
        error_text = 'x' where phone_e164 = ${A}`;
      await tx`update public.messages set read_at = now() where phone_e164 = ${B}`;
      await tx`insert into public.messages (direction, phone_e164, body)
        select 'outbound', ${B}, 'n' || g from generate_series(1, 21) g`;
      await tx`insert into public.messages (direction, phone_e164, body)
        select 'outbound', ${A}, 'n' || g from generate_series(1, 20) g`;
      const all = await events();
      expect(all.slice(0, 5).map(shape)).toEqual([
        [[A, null]],
        [[A, null]],
        [[A, null]],
        [[B, null]],
        [[B, null]],
      ]);
      expect(all[5]?.[0]?.rows).toHaveLength(20);
      const bytes = Buffer.byteLength(JSON.stringify(all[5]?.[0]));
      expect(bytes).toBeLessThan(4_096); // Realtime's limit is 256 KB on the smallest plan
    });
  });

  test('the SQL twin of LINK_TEMPLATES and the row rule', async () => {
    await rolledBack(async (tx) => {
      const [row] = await tx<{ keys: string[] }[]>`select public.inbox_link_templates() as keys`;
      expect([...(row?.keys ?? [])].sort()).toEqual([
        'lesson_feedback_request',
        'lesson_join_link',
      ]);
    });
  });
});
