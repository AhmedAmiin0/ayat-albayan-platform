import { randomUUID } from 'node:crypto';
import { seedSiblings, type DaySeed } from './day-times';
import { BASE, iso, MIN, type Tx } from './edit-time';

// Helpers of e2e/tests/pick-trial-date.sql.spec.ts: pick_trial_date (migration 20261025000660,
// «موعد تجريبي جديد») with payloads in the shapes the API's trial-date.plan.ts builds, rolled back.

const DAY = 24 * 60 * MIN;
export type TrialSeed = DaySeed & { student: string; rule: string; lesson: string };

/** One child (pending_subscription) with an upcoming trial at BASE (a one-day trial rule). */
export async function seedTrial(tx: Tx): Promise<TrialSeed> {
  const s = await seedSiblings(tx);
  const student = s.students[0] ?? '';
  await tx`update public.students set status = 'pending_subscription' where id = ${student}`;
  const day = iso(BASE).slice(0, 10);
  const [rule] = await tx<{ id: string }[]>`insert into public.schedule_rules
      (teacher_id, duration_min, start_time_local, tz, byday, starts_on, ends_on, package)
    values (${s.teacher}, 30, '17:00', 'Asia/Riyadh', ${[new Date(BASE).getUTCDay()]}, ${day}, ${day}, 'trial')
    returning id`;
  if (!rule) throw new Error('trial rule not written');
  await tx`insert into public.schedule_rule_students (rule_id, student_id) values (${rule.id}, ${student})`;
  const [lesson] = await tx<{ id: string }[]>`insert into public.lessons (rule_id, teacher_id, starts_at, ends_at)
    values (${rule.id}, ${s.teacher}, ${iso(BASE)}, ${iso(BASE + 30 * MIN)}) returning id`;
  if (!lesson) throw new Error('trial lesson not written');
  await tx`insert into public.lesson_students (lesson_id, student_id, chargeable) values (${lesson.id}, ${student}, false)`;
  return { ...s, student, rule: rule.id, lesson: lesson.id };
}

/** p.change: the upcoming trial moves two days later; the new row's id is the request id. */
export function movePayload(s: TrialSeed, newId: string = randomUUID()) {
  const at = BASE + 2 * DAY;
  return {
    actor: s.actor,
    student_ids: [s.student],
    teacher_id: s.teacher,
    change: {
      actor: s.actor,
      changes: [{ id: s.lesson, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }],
      lessons: [{ id: newId, rule_id: s.rule, teacher_id: s.teacher, starts_at: iso(at), ends_at: iso(at + 30 * MIN), meeting_link: null, override_reason: null, rescheduled_from_id: s.lesson, student_ids: [s.student] }],
      messages: [],
      audit: { entity: 'lessons', entity_id: s.lesson, action: 'trial_new_date', before: {}, after: {} },
    },
  };
}

/** p.booking: no upcoming trial, a new one-lesson trial rule three days later. */
export function bookPayload(s: TrialSeed) {
  const at = BASE + 3 * DAY;
  const day = iso(at).slice(0, 10);
  return {
    actor: s.actor,
    student_ids: [s.student],
    teacher_id: s.teacher,
    booking: {
      rule: { teacher_id: s.teacher, duration_min: 30, start_time_local: '17:00', tz: 'Asia/Riyadh', byday: [new Date(at).getUTCDay()], starts_on: day, ends_on: day, meeting_link: null, package: 'trial', client_request_id: randomUUID() },
      student_ids: [s.student],
      lead: null,
      new_guardian: null,
      new_student: null,
      lessons: [{ starts_at: iso(at), ends_at: iso(at + 30 * MIN), meeting_link: null, override_reason: null }],
      messages: [],
      makeup_of: null,
      invoice: null,
      audit: { after: { kind: 'trial', via: 'trial_new_date' } },
    },
  };
}
