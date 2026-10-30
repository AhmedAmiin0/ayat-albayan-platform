import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { change, changeOf, CHANGE, seedCourse } from '../../support/finance/change-course';
import { BASE, iso, rolledBack, type Tx } from '../../support/teaching/edit-time';

// change_course (migration 20261018000480, owner 2026-10-18 «تغيير أيام الحلقات»): the old rules of an
// assistant course end, their future lessons move, the new rules keep the course tie, in one
// transaction, idempotent on client_request_id. Rolled back.

const DAY = 864e5;
type RuleRow = { id: string; ends_on: string; status: string; subscription_id: string | null; first_rule_id: string | null; client_request_id: string | null };
const rulesOf = (tx: Tx, sub: string) => tx<RuleRow[]>`select id, ends_on::text, status::text, subscription_id, first_rule_id,
  client_request_id from public.schedule_rules where subscription_id = ${sub} order by created_at, first_rule_id nulls first`;
const lessonsOf = (tx: Tx, ids: string[]) => tx<{ status: string; chargeable: boolean }[]>`select l.status::text, ls.chargeable
  from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id where l.id = any(${ids}) order by l.starts_at`;

test.describe('change_course: the remaining lessons of a course on new days (R-ASST-01)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('ends the old rules the day before, moves their future lessons, writes the new rules tied to the course', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const requestId = randomUUID();
      const payload = changeOf(c, { requestId });
      const res = await change(tx, payload);
      const ids = payload.new_rules.map((r) => r.id);
      expect(res).toEqual({ rule_ids: ids, ends_on: iso(CHANGE + 14 * DAY).slice(0, 10) });
      const rules = await rulesOf(tx, c.sub);
      const old = rules.filter((r) => c.rules.includes(r.id));
      expect(old.map((r) => [r.ends_on, r.status])).toEqual(c.rules.map(() => [iso(CHANGE - DAY).slice(0, 10), 'active']));
      const fresh = rules.filter((r) => ids.includes(r.id));
      expect(fresh.map((r) => [r.subscription_id, r.first_rule_id, r.client_request_id])).toEqual([
        [c.sub, null, requestId],
        [c.sub, ids[0], null],
      ]);
      const moved = c.lessons.filter((l) => Date.parse(l.starts_at) >= CHANGE).map((l) => l.id);
      const kept = c.lessons.filter((l) => Date.parse(l.starts_at) < CHANGE).map((l) => l.id);
      expect(await lessonsOf(tx, moved)).toEqual(moved.map(() => ({ status: 'rescheduled', chargeable: false })));
      expect(await lessonsOf(tx, kept)).toEqual(kept.map(() => ({ status: 'scheduled', chargeable: true })));
      const [n] = await tx<{ n: number }[]>`select count(*)::int as n from public.lesson_students ls join public.lessons l
        on l.id = ls.lesson_id where l.rule_id = any(${ids}) and ls.student_id = ${c.students[0] ?? ''}`;
      expect(n?.n).toBe(4);
      const audit = await tx<{ action: string; actor_id: string }[]>`select action, actor_id from public.audit_log
        where entity = 'subscriptions' and entity_id = ${c.sub}`;
      expect(audit).toEqual([{ action: 'course_change', actor_id: c.actor }]);
    });
  });

  test('the same client_request_id again returns the first change and writes nothing', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const requestId = randomUUID();
      const first = await change(tx, changeOf(c, { requestId }));
      const again = await change(tx, changeOf(c, { requestId }));
      expect(again).toEqual(first);
      expect(await rulesOf(tx, c.sub)).toHaveLength(4);
    });
  });

  test('a rule of another course rolls everything back (course_mismatch): all-or-nothing', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const bad = changeOf(c, { requestId: randomUUID(), sub: randomUUID() });
      const code = await tx.savepoint((sp) => change(sp, bad)).then(() => 'ok', (e: { message?: string }) => e.message);
      expect(code).toBe('course_mismatch');
      const rules = await rulesOf(tx, c.sub);
      expect(rules.map((r) => r.id)).toEqual(c.rules);
      expect(new Set(rules.map((r) => r.ends_on))).toEqual(new Set([iso(CHANGE + 14 * DAY).slice(0, 10)]));
      expect(await lessonsOf(tx, c.lessons.map((l) => l.id))).toEqual(c.lessons.map(() => ({ status: 'scheduled', chargeable: true })));
    });
  });

  test('without new rules or an audit row it is refused (22023)', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const empty = { ...changeOf(c, { requestId: randomUUID() }), new_rules: [] };
      const code = await tx.savepoint((sp) => change(sp, empty)).then(() => 'ok', (e: { code?: string }) => e.code);
      expect(code).toBe('22023');
    });
  });

  test('a change never lengthens a rule: a later requested end leaves its ends_on (fix 1)', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const seeded = iso(BASE + 21 * DAY).slice(0, 10);
      await change(tx, changeOf(c, { requestId: randomUUID(), at: BASE + 28 * DAY }));
      const old = (await rulesOf(tx, c.sub)).filter((r) => c.rules.includes(r.id));
      expect(old.map((r) => r.ends_on)).toEqual([seeded, seeded]);
    });
  });

  test('a second change does not push the first change’s old rules later (fix 1)', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const first = await change(tx, changeOf(c, { requestId: randomUUID() }));
      const rules = [...c.rules, ...first.rule_ids];
      await change(tx, changeOf(c, { requestId: randomUUID(), at: CHANGE + 7 * DAY, rules }));
      const all = await rulesOf(tx, c.sub);
      expect(all.filter((r) => c.rules.includes(r.id)).map((r) => r.ends_on)).toEqual(c.rules.map(() => iso(CHANGE - DAY).slice(0, 10)));
      expect(all.filter((r) => first.rule_ids.includes(r.id)).map((r) => r.ends_on)).toEqual(first.rule_ids.map(() => iso(CHANGE + 6 * DAY).slice(0, 10)));
    });
  });

  test('a change planned before another one landed is refused (course_changed): one set of new rules (fix 6)', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      await change(tx, changeOf(c, { requestId: randomUUID() }));
      const stale = changeOf(c, { requestId: randomUUID() });
      const code = await tx.savepoint((sp) => change(sp, stale)).then(() => 'ok', (e: { message?: string }) => e.message);
      expect(code).toBe('course_changed');
      expect(await rulesOf(tx, c.sub)).toHaveLength(4);
    });
  });

  test('the moved lessons of a rule with no end_rule step are written through `changes` (fix 3)', async () => {
    await rolledBack(async (tx) => {
      const c = await seedCourse(tx);
      const [active, paused] = c.rules;
      await tx`update public.schedule_rules set status = 'paused' where id = ${paused ?? ''}`;
      const base = changeOf(c, { requestId: randomUUID(), rules: [active ?? ''] });
      const ofPaused = c.lessons.filter((l) => l.rule_id === paused && Date.parse(l.starts_at) >= CHANGE).map((l) => l.id);
      const changes = ofPaused.map((id) => ({ id, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }));
      await change(tx, { ...base, changes });
      expect(await lessonsOf(tx, ofPaused)).toEqual(ofPaused.map(() => ({ status: 'rescheduled', chargeable: false })));
    });
  });
});
