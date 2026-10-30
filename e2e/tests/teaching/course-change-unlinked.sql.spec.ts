import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';
import { assistant, code, one, student } from '../../support/sales/assistant';
import { day, importedCourse, rule, teacher } from '../../support/teaching/course-stop';

// change_course v2 (PR #464 review B2, migration 991): «تغيير المعلم» / «تغيير موعد الحلقات» of a
// student whose rule has no subscription_id (imported, handover, admin booking) ends that rule and
// books the new one; a rule it cannot attribute is course_unattributed. Rolled back.

/** The change_course payload the API builds (course-change.payload.ts), reduced to the checks. */
interface Course {
  student: string;
  sub: string;
  rule: string;
}

function payload(c: Course, input: { teacher: string; actor: string }) {
  const id = randomUUID();
  return {
    client_request_id: randomUUID(),
    subscription_id: c.sub,
    starts_on: day(5),
    actor: input.actor,
    end_rules: [{ id: c.rule, ends_on: day(4), changes: [] }],
    new_rules: [{ ...newRule(c, input.teacher), id }],
    audit: { entity: 'subscriptions', entity_id: c.sub, action: 'course_change', before: {}, after: {} },
  };
}

/** The new rule: Sun + Tue 18:00 Riyadh with the new teacher, tied to the package. */
const newRule = (c: Course, teacher: string) => ({
  teacher_id: teacher,
  duration_min: 30,
  start_time_local: '18:00',
  tz: 'Asia/Riyadh',
  byday: [0, 2],
  starts_on: day(5),
  ends_on: day(30),
  meeting_link: null,
  package: '8',
  created_from_lead_id: null,
  subscription_id: c.sub,
  first_rule_id: null,
  student_ids: [c.student],
  lessons: [],
});

const change = async (tx: Tx, p: object) =>
  one(await tx<{ r: { rule_ids: string[] } }[]>`select public.change_course(${tx.json(p as never)}) as r`).r;

test.describe('change_course v2 (991)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a new teacher from a date: the imported rule ends the day before, the new rule is the package\'s', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'chg-imp');
      const c = await importedCourse(tx, { phone: '+966500000931' });
      const r = await change(tx, payload(c, { teacher: await teacher(tx), actor: a }));
      expect(r.rule_ids).toHaveLength(1);
      const old = one(await tx<{ ends_on: string }[]>`select ends_on::text from public.schedule_rules where id = ${c.rule}`);
      expect(old.ends_on).toBe(day(4));
      const [linked] = await tx`select subscription_id from public.schedule_rules where id = ${r.rule_ids[0] ?? ''}`;
      expect(linked).toEqual({ subscription_id: c.sub });
    });
  });

  test('a group rule of the student: course_unattributed, nothing changed', async () => {
    await rolledBack(async (tx) => {
      const a = await assistant(tx, 'chg-grp');
      const c = await importedCourse(tx, { phone: '+966500000932' });
      const other = await student(tx, { phone: '+966500000933' });
      await rule(tx, { teacher: await teacher(tx), students: [c.student, other] });
      const p = payload(c, { teacher: await teacher(tx), actor: a });
      expect(await code(tx, () => change(tx, p))).toBe('course_unattributed');
    });
  });
});
