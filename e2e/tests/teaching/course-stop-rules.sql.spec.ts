import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { rolledBack } from '../../support/core/rls';
import { assistant, code, student, subscription } from '../../support/sales/assistant';
import { day, importedCourse, lesson, rule, stop, teacher } from '../../support/teaching/course-stop';

// stop_course (PR #464 review B2, B3 and the minors, migration 991): the course of a student whose
// rule has no subscription_id (imported / handover / admin-booked), one transaction, replayed by
// clientRequestId.

const statusesOf = (tx: Parameters<Parameters<typeof rolledBack>[0]>[0], ruleId: string) =>
  tx<{ status: string; chargeable: boolean }[]>`select l.status, ls.chargeable from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id where l.rule_id = ${ruleId} order by l.starts_at`;

test.describe('stop_course (991)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('an imported rule ends on the stop day, its open lessons cancel, the student churns', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-rule');
      const c = await importedCourse(tx, { phone: '+966500000921' });
      const r = await stop(tx, { ...c, actor: a });
      expect(r).toMatchObject({ ended_rules: [c.rule], student_status: 'churned', replayed: false });
      expect(r.cancelled_lessons).toHaveLength(3);
      const [ruleRow] = await tx`select status from public.schedule_rules where id = ${c.rule}`;
      expect(ruleRow).toEqual({ status: 'ended' });
      expect((await statusesOf(tx, c.rule)).map((l) => `${l.status}:${String(l.chargeable)}`)).toEqual([
        ...Array<string>(3).fill('completed:true'),
        ...Array<string>(3).fill('cancelled_by_admin:false'),
      ]);
      const [sub] = await tx`select status, cancel_kind from public.subscriptions where id = ${c.sub}`;
      expect(sub).toEqual({ status: 'cancelled', cancel_kind: 'stopped' });
    });
  });

  test('the same clientRequestId answers the first stop; another one is already_cancelled', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-replay');
      const c = await importedCourse(tx, { phone: '+966500000922' });
      const requestId = randomUUID();
      const first = await stop(tx, { ...c, actor: a, requestId });
      const again = await stop(tx, { ...c, actor: a, requestId });
      expect(again).toMatchObject({ replayed: true, cancelled_lessons: first.cancelled_lessons });
      expect(await code(tx, () => stop(tx, { ...c, actor: a }))).toBe('already_cancelled');
    });
  });

  test('a group rule cannot be attributed: course_unattributed, nothing written', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-group');
      const c = await importedCourse(tx, { phone: '+966500000923' });
      const other = await student(tx, { phone: '+966500000924' });
      const group = await rule(tx, { teacher: await teacher(tx), students: [c.student, other] });
      await lesson(tx, { rule: group, days: 2 });
      expect(await code(tx, () => stop(tx, { ...c, actor: a }))).toBe('course_unattributed');
      const [sub] = await tx`select status from public.subscriptions where id = ${c.sub}`;
      expect(sub).toEqual({ status: 'unpaid' });
    });
  });

  test('a rule running into the next package cannot be attributed; one ending before it can', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-next');
      const c = await importedCourse(tx, { phone: '+966500000925' });
      await subscription(tx, c.student, { price: 100, startsOn: day(20) });
      expect(await code(tx, () => stop(tx, { ...c, actor: a }))).toBe('course_unattributed');
      await tx`update public.schedule_rules set ends_on = ${day(10)}::date where id = ${c.rule}`;
      const r = await stop(tx, { ...c, actor: a });
      expect(r).toMatchObject({ ended_rules: [c.rule], student_status: 'active' }); // the next package runs
    });
  });

  test('an open course pause is closed; its paused rule ends', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'stop-pause');
      const c = await importedCourse(tx, { phone: '+966500000926' });
      await tx`update public.schedule_rules set status = 'paused' where id = ${c.rule}`;
      await tx`insert into public.course_pauses (student_id, subscription_id, rule_ids, from_date, student_status_before, started_at)
        values (${c.student}, ${c.sub}, array[${c.rule}::uuid], current_date, 'active', now())`;
      const r = await stop(tx, { ...c, actor: a });
      expect(r.closed_pause).not.toBeNull();
      const [pause] = await tx`select resumed_at is not null as closed, extended_days from public.course_pauses
        where student_id = ${c.student}`;
      expect(pause).toEqual({ closed: true, extended_days: 0 });
      const [ruleRow] = await tx`select status from public.schedule_rules where id = ${c.rule}`;
      expect(ruleRow).toEqual({ status: 'ended' });
    });
  });
});
