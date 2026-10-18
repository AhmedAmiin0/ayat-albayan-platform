import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { book, dayTimesPayload, seedSiblings, type DaySeed } from '../support/day-times';
import { rolledBack, type Tx } from '../support/edit-time';

// create_booking v6 (migration 20261018000470, PR #113 review M3): every rule of the assistant's course
// carries the subscription it books, the first rule and its siblings, so one paid plan books one course.
// Rolled back; payloads have the shape the API's bookingPayload builds.

async function subscriptionOf(tx: Tx, s: DaySeed): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on)
    values (${s.students[0] ?? ''}, 45, 8, 0, '{}'::jsonb, current_date) returning id`;
  if (!row) throw new Error('subscription not written');
  return row.id;
}

const tiesOf = (tx: Tx, s: DaySeed) => tx<{ subscription_id: string | null }[]>`
  select r.subscription_id from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id
  where rs.student_id = ${s.students[0] ?? ''} order by r.first_rule_id nulls first`;

test.describe('create_booking ties an assistant course to its subscription (R-ASST-01)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('rule.subscription_id on the first rule and on the sibling', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const sub = await subscriptionOf(tx, s);
      const base = dayTimesPayload(s, { requestId: randomUUID(), siblings: true, invoice: false });
      const siblings = (base.siblings ?? []).map((x) => ({ ...x, rule: { ...x.rule, subscription_id: sub } }));
      const payload = { ...base, rule: { ...base.rule, subscription_id: sub }, siblings };
      await book(tx, payload, s.actor);
      expect(await tiesOf(tx, s)).toEqual([{ subscription_id: sub }, { subscription_id: sub }]);
    });
  });

  test('a payload without it (the admin, a trial, an import) leaves subscription_id null', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      await book(tx, dayTimesPayload(s, { requestId: randomUUID(), siblings: true, invoice: false }), s.actor);
      expect(await tiesOf(tx, s)).toEqual([{ subscription_id: null }, { subscription_id: null }]);
    });
  });
});
