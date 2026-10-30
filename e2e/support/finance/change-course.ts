import { randomUUID } from 'node:crypto';
import { dayTimesPayload, seedSiblings, type DaySeed } from '../day-times';
import { BASE, iso, MIN, type Tx } from '../edit-time';

// Helpers of e2e/tests/change-course.sql.spec.ts: change_course (migration 480, «تغيير أيام الحلقات») on a
// two-rule assistant course, payloads in the shape the API's changePayload builds, rolled back.

const DAY = 24 * 60 * MIN;
const day = (ms: number) => iso(ms).slice(0, 10);
/** The change point: the course's second week (BASE + 7 days). */
export const CHANGE = BASE + 7 * DAY;

type Course = DaySeed & { sub: string; rules: string[]; lessons: { id: string; rule_id: string; starts_at: string }[] };

/** One child, an 8-lesson subscription and its course: 17:00 on BASE's weekday + 19:30 two days later, two weeks each. */
export async function seedCourse(tx: Tx): Promise<Course> {
  const seed = await seedSiblings(tx);
  const s = { ...seed, students: seed.students.slice(0, 1) };
  const [sub] = await tx<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on, package)
    values (${s.students[0] ?? ''}, 45, 8, 0, '{}'::jsonb, current_date, '8') returning id`;
  if (!sub) throw new Error('subscription not written');
  const base = dayTimesPayload(s, { requestId: randomUUID(), siblings: true, invoice: false });
  const tie = { subscription_id: sub.id, ends_on: day(BASE + 21 * DAY) };
  const payload = {
    ...base,
    rule: { ...base.rule, ...tie },
    siblings: (base.siblings ?? []).map((x) => ({ ...x, rule: { ...x.rule, ...tie } })),
  };
  await tx`select public.create_booking(${tx.json(payload)}, ${s.actor})`;
  const rules = await tx<{ id: string }[]>`select id from public.schedule_rules where subscription_id = ${sub.id}
    order by first_rule_id nulls first`;
  const lessons = await tx<{ id: string; rule_id: string; starts_at: string }[]>`select l.id, l.rule_id, l.starts_at::text
    from public.lessons l join public.schedule_rules r on r.id = l.rule_id where r.subscription_id = ${sub.id} order by l.starts_at`;
  return { ...s, sub: sub.id, rules: rules.map((r) => r.id), lessons };
}

type NewRuleInput = { at: number; time: string; first: string | null; sub: string; from: number };

function newRule(c: Course, o: NewRuleInput & { id: string }) {
  const lessons = [o.at, o.at + 7 * DAY].map((at) => ({
    id: randomUUID(), rule_id: o.id, teacher_id: c.teacher, starts_at: iso(at), ends_at: iso(at + 45 * MIN),
    meeting_link: null, override_reason: null, rescheduled_from_id: null, student_ids: c.students,
  }));
  return {
    id: o.id, teacher_id: c.teacher, duration_min: 45, start_time_local: o.time, tz: 'Asia/Riyadh',
    byday: [new Date(o.at).getUTCDay()], starts_on: day(o.from), ends_on: day(o.from + 14 * DAY), meeting_link: null,
    package: '8', created_from_lead_id: null, subscription_id: o.sub, first_rule_id: o.first, student_ids: c.students, lessons,
  };
}

type ChangeOptions = {
  requestId: string;
  /** Overrides the second new rule's course. */
  sub?: string;
  /** The change point (default CHANGE). */
  at?: number;
  /** The rules the payload ends (default the course's first two). */
  rules?: string[];
};

/**
 * The rules end the day before the change point; their seeded lessons from it move; two new rules (18:00
 * one day after it, 20:00 three days after) with two lessons each.
 */
export function changeOf(c: Course, o: ChangeOptions) {
  const at = o.at ?? CHANGE;
  const first = randomUUID();
  const moved = c.lessons.filter((l) => Date.parse(l.starts_at) >= at);
  return {
    actor: c.actor,
    client_request_id: o.requestId,
    subscription_id: c.sub,
    starts_on: day(at),
    end_rules: (o.rules ?? c.rules).map((id) => ({
      id, ends_on: day(at - DAY),
      changes: moved.filter((l) => l.rule_id === id).map((l) => ({ id: l.id, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false })),
    })),
    new_rules: [
      newRule(c, { id: first, at: at + DAY + 60 * MIN, time: '18:00', first: null, sub: c.sub, from: at }),
      newRule(c, { id: randomUUID(), at: at + 3 * DAY + 180 * MIN, time: '20:00', first, sub: o.sub ?? c.sub, from: at }),
    ],
    messages: [],
    audit: { entity: 'subscriptions', entity_id: c.sub, action: 'course_change', after: { by: 'sales' } },
  };
}

type Move = { id: string; from_status: string; to_status: string; chargeable: boolean };
type ChangeResult = { rule_ids: string[]; ends_on: string | null };

export async function change(tx: Tx, payload: ReturnType<typeof changeOf> & { changes?: Move[] }): Promise<ChangeResult> {
  const [row] = await tx<{ r: ChangeResult }[]>`select public.change_course(${tx.json(payload)}) as r`;
  if (!row) throw new Error('change_course returned nothing');
  return row.r;
}
