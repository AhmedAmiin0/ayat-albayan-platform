import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { book, bookInstant, dayTimesPayload, rulesOf, seedSiblings } from '../support/day-times';
import { rolledBack, type Tx } from '../support/edit-time';

// create_booking v5 (migration 20261018000465, owner 2026-10-18 «اختر موعدًا لكل يوم») against the real
// database, in a transaction that is rolled back: one schedule_rules row per distinct time, the other
// times as `siblings` tied to the first rule. Payloads have the shape the API's bookingPayload builds.

const confirmations = async (tx: Tx, lessonIds: string[]) => {
  const [row] = await tx<{ n: number }[]>`select count(*)::int as n from public.messages
    where lesson_id = any(${lessonIds}::uuid[]) and dedup_key like 'booking_confirmation:%'`;
  return row?.n;
};

test.describe('create_booking with per-day times (R-SCH-02, R-SCH-06, R-PAY-03)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a sibling: two rules, only the first has client_request_id, one invoice, one confirmation per guardian', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const requestId = randomUUID();
      const res = await book(tx, dayTimesPayload(s, { requestId, siblings: true, invoice: true }), s.actor);
      const rules = await rulesOf(tx, s);
      expect(rules.map((r) => [r.start_time_local.slice(0, 5), r.client_request_id, r.first_rule_id])).toEqual([
        ['17:00', requestId, null],
        ['19:30', null, res.rule_id],
      ]);
      expect(rules[0]?.id).toBe(res.rule_id);
      expect(res.lessons).toHaveLength(4);
      expect(res.message_ids).toHaveLength(1);
      expect(await confirmations(tx, res.lessons.map((l) => l.id))).toBe(1);
      const invoices = await tx<{ rule_id: string }[]>`select rule_id from public.invoices where client_request_id = ${requestId}`;
      expect(invoices).toEqual([{ rule_id: res.rule_id }]);
      expect(res.invoice_id).not.toBeNull();
      // Both students on both rules and on every lesson.
      const [links] = await tx<{ n: number }[]>`select count(*)::int as n from public.lesson_students
        where lesson_id = any(${res.lessons.map((l) => l.id)}::uuid[])`;
      expect(links?.n).toBe(8);
      const [audit] = await tx<{ lessons: number; rule_ids: string[] }[]>`select (after->>'lessons')::int as lessons,
        array(select jsonb_array_elements_text(after->'rule_ids')) as rule_ids
        from public.audit_log where entity = 'schedule_rules' and entity_id = ${res.rule_id} and action = 'book'`;
      expect(audit).toEqual({ lessons: 4, rule_ids: rules.map((r) => r.id) });
    });
  });

  test('a replay with the same client_request_id returns the same booking, still two rules', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const payload = dayTimesPayload(s, { requestId: randomUUID(), siblings: true, invoice: false });
      const first = await book(tx, payload, s.actor);
      const again = await book(tx, payload, s.actor);
      expect(again).toEqual(first);
      expect(await rulesOf(tx, s)).toHaveLength(2);
    });
  });

  test('an old payload (no siblings) is one rule, as before', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const res = await book(tx, dayTimesPayload(s, { requestId: randomUUID(), siblings: false, invoice: false }), s.actor);
      const rules = await rulesOf(tx, s);
      expect(rules.map((r) => [r.id, r.first_rule_id])).toEqual([[res.rule_id, null]]);
      expect(res.lessons).toHaveLength(2);
      expect(res.message_ids).toHaveLength(1);
    });
  });

  test('create_instant_lesson is unchanged: one rule, one instant lesson, no confirmation', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const res = await bookInstant(tx, s);
      expect(await rulesOf(tx, s)).toHaveLength(1);
      expect([res.lessons.length, res.message_ids.length]).toEqual([1, 0]);
      const [lesson] = await tx<{ instant: boolean }[]>`select instant from public.lessons where id = ${res.lessons[0]?.id ?? ''}`;
      expect(lesson?.instant).toBe(true);
    });
  });
});
