import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { seedSiblings, type DaySeed } from '../../support/teaching/day-times';
import { iso, BASE, rolledBack, type Tx } from '../../support/edit-time';

// apply_lesson_changes v3 (migration 20261018000475, PR #113 review): the replacement rule of a
// whole-rule reschedule stores the course's subscription_id, so a second reschedule keeps its last
// day. Rolled back; new_rule has the shape planNewRule builds.

async function subscriptionOf(tx: Tx, s: DaySeed): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on)
    values (${s.students[0] ?? ''}, 45, 8, 0, '{}'::jsonb, current_date) returning id`;
  if (!row) throw new Error('subscription not written');
  return row.id;
}

const newRule = (s: DaySeed, subscriptionId: string | null) => ({
  id: randomUUID(), teacher_id: s.teacher, duration_min: 45, start_time_local: '18:00', tz: 'Asia/Riyadh',
  byday: [new Date(BASE).getUTCDay()], starts_on: iso(BASE).slice(0, 10), ends_on: iso(BASE + 7 * 864e5).slice(0, 10),
  meeting_link: null, package: '8', created_from_lead_id: null, subscription_id: subscriptionId,
  first_rule_id: null, student_ids: s.students.slice(0, 1),
});

async function applyAndRead(tx: Tx, s: DaySeed, subscriptionId: string | null) {
  const rule = newRule(s, subscriptionId);
  await tx`select public.apply_lesson_changes(${tx.json({ actor: s.actor, new_rule: rule })})`;
  return tx<{ subscription_id: string | null; ends_on: string }[]>`
    select subscription_id, ends_on::text as ends_on from public.schedule_rules where id = ${rule.id}`;
}

test.describe('apply_lesson_changes keeps the course tie of a replacement rule (R-SCH-07)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a new_rule carrying subscription_id stores it', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const sub = await subscriptionOf(tx, s);
      const [row] = await applyAndRead(tx, s, sub);
      expect(row).toEqual({ subscription_id: sub, ends_on: iso(BASE + 7 * 864e5).slice(0, 10) });
    });
  });

  test('a new_rule without it stores null, as before', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const [row] = await applyAndRead(tx, s, null);
      expect(row?.subscription_id).toBeNull();
    });
  });
});
