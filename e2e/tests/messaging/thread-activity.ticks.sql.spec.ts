import { expect, test } from '@playwright/test';
import { rolledBack } from '../../support/core/rls';
import { differ, put, SAME } from './thread-activity.helpers';

// Migration 20261106001100: every update the summary shows keeps v_threads equal to migration
// 984's aggregate (a tick, an edit, a line change, a row turning into / out of a hidden marker).
// Rolled back; database only, no message is ever sent.

const A = '+966500001103';
const MARKER = { type: 'edit', marker: true, target: 'wamid.e2e.1100.x', text: 'x' };

test.describe('v_threads follows every update (migration 20261106001100)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('a status tick, a body edit, a line change, a marker flip in and out', async () => {
    await rolledBack(async (tx) => {
      const out = await put(tx, { phone: A, dir: 'outbound', at: '2026-11-01T10:00:00Z' });
      const inb = await put(tx, {
        phone: A,
        dir: 'inbound',
        at: '2026-11-01T10:01:00Z',
        line: 'chat',
      });
      expect(await differ(tx)).toEqual(SAME);
      await tx`update public.messages set status = 'read' where id = ${out}`;
      expect(await differ(tx)).toEqual(SAME);
      await tx`update public.messages set body = 'نص معدل' where id = ${inb}`;
      expect(await differ(tx)).toEqual(SAME);
      await tx`update public.messages set line = 'notifications' where id = ${inb}`;
      expect(await differ(tx)).toEqual(SAME);
      // Only interactive_payload changes: the newest (unread) row becomes a hidden marker…
      await tx`update public.messages set interactive_payload = ${tx.json(MARKER)} where id = ${inb}`;
      expect(await differ(tx)).toEqual(SAME);
      const [hidden] = await tx<{ last: string; unread: number }[]>`select
        last_message_id::text as last, unread_count as unread
        from public.v_threads where phone_e164 = ${A}`;
      expect(hidden).toEqual({ last: out, unread: 0 });
      // …and back into a bubble.
      await tx`update public.messages set interactive_payload = null where id = ${inb}`;
      expect(await differ(tx)).toEqual(SAME);
      const [shown] = await tx<{ last: string }[]>`select last_message_id::text as last
        from public.v_threads where phone_e164 = ${A}`;
      expect(shown?.last).toBe(inb);
    });
  });
});
