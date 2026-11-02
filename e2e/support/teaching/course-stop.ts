import { randomUUID } from 'node:crypto';
import type { Tx } from '../core/rls';
import { one, student, subscription } from '../sales/assistant';

// Helpers of the «إلغاء الاشتراك» SQL specs (migration 991): a student whose weekly rule carries
// no subscription_id (imported, calendar handover, admin booking: migration 470), its lessons, the
// stop.

/** A teacher row of its own (no login needed by the RPCs). */
export async function teacher(tx: Tx): Promise<string> {
  return one(await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender)
    values ('معلم SQL', 'male') returning id`).id;
}

interface RuleInput {
  teacher: string;
  students: readonly string[];
  /** Days from today (UTC) the rule starts; default 60 days ago. */
  from?: number;
  subscriptionId?: string | null;
}

/** A daily 17:00 Riyadh rule, open-ended, its students on it. */
export async function rule(tx: Tx, r: RuleInput): Promise<string> {
  const { id } = one(await tx<{ id: string }[]>`insert into public.schedule_rules
      (teacher_id, duration_min, start_time_local, tz, byday, starts_on, subscription_id)
    values (${r.teacher}, 30, '17:00', 'Asia/Riyadh', '{0,1,2,3,4,5,6}',
      current_date + ${r.from ?? -60}::int, ${r.subscriptionId ?? null}) returning id`);
  for (const s of r.students)
    await tx`insert into public.schedule_rule_students (rule_id, student_id) values (${id}, ${s})`;
  return id;
}

/** One lesson of the rule `days` from today (UTC) at 14:00Z: done before today, else scheduled. */
export async function lesson(tx: Tx, input: { rule: string; days: number }): Promise<string> {
  const { id } = one(await tx<{ id: string }[]>`insert into public.lessons
      (rule_id, teacher_id, starts_at, ends_at, status)
    select r.id, r.teacher_id, (current_date + ${input.days}::int) + time '14:00',
      (current_date + ${input.days}::int) + time '14:30',
      case when ${input.days}::int < 0 then 'completed' else 'scheduled' end::public.lesson_status
    from public.schedule_rules r where r.id = ${input.rule} returning id`);
  await tx`insert into public.lesson_students (lesson_id, student_id)
    select ${id}, rs.student_id from public.schedule_rule_students rs where rs.rule_id = ${input.rule}`;
  return id;
}

/** A course that started 10 days ago on an imported rule: 3 lessons held, 3 to come. */
interface CourseInput {
  phone: string;
  broughtBy?: string;
  price?: number;
}

export async function importedCourse(tx: Tx, input: CourseInput) {
  const s = await student(tx, {
    phone: input.phone,
    broughtBy: input.broughtBy ?? null,
    broughtAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  });
  await tx`update public.students set status = 'active' where id = ${s}`;
  const sub = await subscription(tx, s, { price: input.price ?? 200, startsOn: day(-10) });
  await tx`update public.subscriptions set created_at = now() - interval '11 days' where id = ${sub}`;
  const r = await rule(tx, { teacher: await teacher(tx), students: [s] });
  for (const d of [-3, -2, -1, 1, 2, 3]) await lesson(tx, { rule: r, days: d });
  return { student: s, sub, rule: r };
}

export const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

interface Stop {
  student: string;
  sub: string;
  /** A profile (audit_log / course_pauses.resumed_by point at it). */
  actor: string;
  requestId?: string;
}

/** stop_course as the API calls it; a fresh clientRequestId unless given. */
/** stop_course's answer (the fields the specs read). */
interface StopRow {
  cancelled_lessons: string[];
  ended_rules: string[];
  student_status: string;
  closed_pause: string | null;
  replayed: boolean;
}

export async function stop(tx: Tx, c: Stop): Promise<StopRow> {
  const p = {
    subscription_id: c.sub,
    student_id: c.student,
    client_request_id: c.requestId ?? randomUUID(),
    actor: c.actor,
    reason: 'سفر',
  };
  const rows = await tx<{ r: StopRow }[]>`select public.stop_course(${tx.json(p)}) as r`;
  return one(rows).r;
}

/** What the money readers say about a package: balance, commission kind, fully paid. */
export const moneyOf = async (tx: Tx, sub: string) =>
  one(await tx<Record<string, unknown>[]>`select
    (select row(b.lessons_used, b.remaining, b.is_last)::text from public.v_subscription_balance b
      where b.subscription_id = ${sub}) as balance,
    public.subscription_commission_kind(${sub}) as kind,
    public.subscription_full_at(${sub}) as full_at`);
