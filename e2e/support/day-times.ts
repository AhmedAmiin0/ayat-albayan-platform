import { BASE, iso, MIN, type Tx } from './edit-time';
import { USERS } from './users';

// Helpers of e2e/tests/booking-day-times.sql.spec.ts: create_booking with `siblings` (migration 465,
// «اختر موعدًا لكل يوم»), payloads in the shape the API's bookingPayload builds, inside a rolled-back
// transaction.

const DAY = 24 * 60 * MIN;
export const PHONE = '+966500000996';

export interface DaySeed {
  teacher: string;
  actor: string;
  guardian: string;
  students: string[];
}

/** The e2e teacher and a guardian with two children (one confirmation for both). */
export async function seedSiblings(tx: Tx): Promise<DaySeed> {
  const [t] = await tx<{ id: string; profile_id: string }[]>`
    select t.id, t.profile_id from public.teachers t join auth.users u on u.id = t.profile_id
    where u.email = ${USERS.teacher.email}`;
  if (!t) throw new Error('e2e teacher missing (global setup)');
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر أيام', ${PHONE}, 'SA', 'Asia/Riyadh') returning id`;
  if (!g) throw new Error('guardian not written');
  const students = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz)
    values (${g.id}, 'سهيلة أيام', 'سهيلة أيام', 'Asia/Riyadh'), (${g.id}, 'مريم أيام', 'مريم أيام', 'Asia/Riyadh')
    returning id`;
  return { teacher: t.id, actor: t.profile_id, guardian: g.id, students: students.map((s) => s.id) };
}

const weekday = (ms: number) => new Date(ms).getUTCDay();
const lessons = (first: number) =>
  [first, first + 7 * DAY].map((at) => ({ starts_at: iso(at), ends_at: iso(at + 45 * MIN), meeting_link: null, override_reason: null }));
/** BASE is 14:00Z = 17:00 Riyadh; the sibling is two days later at 19:30 Riyadh (16:30Z). */
const SIBLING_FIRST = BASE + 2 * DAY + 150 * MIN;
const timing = (at: number, time: string) => ({
  duration_min: 45, start_time_local: time, tz: 'Asia/Riyadh', byday: [weekday(at)],
  starts_on: iso(BASE).slice(0, 10), ends_on: null, meeting_link: null, package: '8',
});

type PayloadOptions = { requestId: string | null; siblings: boolean; invoice: boolean };

/** A package booking of both children: a weekly 17:00 first rule, optionally a 19:30 sibling two days later. */
export function dayTimesPayload(s: DaySeed, o: PayloadOptions) {
  return {
    rule: { ...timing(BASE, '17:00'), teacher_id: s.teacher, client_request_id: o.requestId },
    student_ids: s.students,
    lead: null,
    new_guardian: null,
    new_student: null,
    lessons: lessons(BASE),
    ...(o.siblings ? { siblings: [{ rule: timing(SIBLING_FIRST, '19:30'), lessons: lessons(SIBLING_FIRST) }] } : {}),
    messages: [{ guardian_id: s.guardian, phone_e164: PHONE, template_key: 'booking_confirmation_plain', template_params: { '1': 'سهيلة ومريم', '2': 'الأحد' } }],
    makeup_of: null,
    invoice: o.invoice
      ? { kind: 'package', path: `${o.requestId ?? 'x'}/a.png`, mime: 'image/png', size_bytes: 10, source: 'upload', message_id: null }
      : null,
    audit: { after: { kind: 'package', package: '8' } },
  };
}

type BookingRow = { rule_id: string; lessons: { id: string }[]; message_ids: string[]; invoice_id: string | null };

export async function book(tx: Tx, payload: ReturnType<typeof dayTimesPayload>, actor: string): Promise<BookingRow> {
  const [row] = await tx<{ r: BookingRow }[]>`select public.create_booking(${tx.json(payload)}, ${actor}) as r`;
  if (!row) throw new Error('create_booking returned nothing');
  return row.r;
}

/** The instant-lesson RPC with an old payload (no siblings): one rule, one lesson. */
export async function bookInstant(tx: Tx, s: DaySeed): Promise<BookingRow> {
  const base = dayTimesPayload(s, { requestId: null, siblings: false, invoice: false });
  const payload = { ...base, rule: { ...base.rule, package: null }, lessons: base.lessons.slice(0, 1), messages: [] };
  const [row] = await tx<{ r: BookingRow }[]>`select public.create_instant_lesson(${tx.json(payload)}, ${s.actor}) as r`;
  if (!row) throw new Error('create_instant_lesson returned nothing');
  return row.r;
}

type RuleFacts = { id: string; first_rule_id: string | null; client_request_id: string | null; start_time_local: string };

/** The rules of the seeded teacher written in this transaction, first rule first. */
export async function rulesOf(tx: Tx, s: DaySeed): Promise<RuleFacts[]> {
  return tx<RuleFacts[]>`select r.id, r.first_rule_id, r.client_request_id, r.start_time_local::text as start_time_local
    from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id
    where rs.student_id = ${s.students[0] ?? ''} order by r.first_rule_id nulls first, r.start_time_local`;
}
