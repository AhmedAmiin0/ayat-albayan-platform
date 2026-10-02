import { normalizeArabic } from '@ab/shared';
import postgres from 'postgres';
import { USERS } from './users';

// Scheduling seed for journeys 4 and 5 (docs/03 §5). Deterministic without resetting the shared
// DB: each journey wipes only the e2e teacher «أبرار»'s lessons, rules and availability, and
// creates its family with a fresh phone. Times are Riyadh wall clock (UTC+3 all year, no DST).

type Sql = ReturnType<typeof postgres>;

export async function withSql<T>(run: (sql: Sql) => Promise<T>): Promise<T> {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL missing — run `pnpm env:local`');
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

const DAY_MS = 86_400_000;
const RIYADH_OFFSET_MS = 3 * 3_600_000;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Saturday of next week in Riyadh (weeks run السبت → الجمعة): always in the future. */
export function nextWeekSaturday(now = new Date()): string {
  const riyadh = new Date(now.getTime() + RIYADH_OFFSET_MS);
  const today = riyadh.toISOString().slice(0, 10);
  return addDays(today, 7 - ((riyadh.getUTCDay() + 1) % 7));
}

/** The instant of a Riyadh wall clock. */
export function riyadh(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+03:00`);
}

/** «أبرار» (owned by abrar@e2e.local) with no lessons, rules or availability left from a run. */
export async function resetAbrar(): Promise<string> {
  return withSql(async (sql) => {
    const [row] = await sql<{ id: string }[]>`
      select t.id from public.teachers t join auth.users u on u.id = t.profile_id
      where u.email = ${USERS.teacher.email}`;
    if (!row) throw new Error('e2e teacher row missing (global setup)');
    await sql`delete from public.lessons where teacher_id = ${row.id}`;
    await sql`delete from public.schedule_rules where teacher_id = ${row.id}`;
    await sql`delete from public.teacher_availability where teacher_id = ${row.id}`;
    await sql`delete from public.teacher_time_off where teacher_id = ${row.id}`;
    return row.id;
  });
}

/** Weekly availability in Riyadh time: [weekday (0 = الأحد), "HH:MM", "HH:MM"]. */
export async function setAvailability(teacherId: string, rows: [number, string, string][]): Promise<void> {
  await withSql(async (sql) => {
    for (const [weekday, start, end] of rows) {
      await sql`insert into public.teacher_availability (teacher_id, weekday, start_time, end_time, tz)
        values (${teacherId}, ${weekday}, ${start}, ${end}, 'Asia/Riyadh')`;
    }
  });
}

export interface Family {
  guardianId: string;
  studentIds: string[];
}

let families = 0;

/** A guardian (fresh Saudi mobile per call) with students in Riyadh, studying Quran. */
export async function seedFamily(guardian: string, students: string[]): Promise<Family> {
  // Time (per run) + a per-process counter (per call): two calls in one millisecond never clash.
  families += 1;
  const phone = `+9665${String(Date.now()).slice(-6)}${String(families % 100).padStart(2, '0')}`;
  return withSql(async (sql) => {
    const [g] = await sql<{ id: string }[]>`
      insert into public.guardians (name, phone_e164, country, tz)
      values (${guardian}, ${phone}, 'SA', 'Asia/Riyadh') returning id`;
    if (!g) throw new Error('guardian not written');
    const studentIds: string[] = [];
    for (const name of students) {
      const [s] = await sql<{ id: string }[]>`
        insert into public.students (guardian_id, name, name_normalized, tz)
        values (${g.id}, ${name}, ${normalizeArabic(name)}, 'Asia/Riyadh') returning id`;
      if (s) studentIds.push(s.id);
    }
    return { guardianId: g.id, studentIds };
  });
}

export interface LessonSeed {
  teacherId: string;
  studentId: string;
  startsAt: Date;
  minutes: number;
}

/** One scheduled (يحتاج تأكيد) lesson with its student. */
export async function seedLesson(l: LessonSeed): Promise<string> {
  return withSql(async (sql) => {
    const endsAt = new Date(l.startsAt.getTime() + l.minutes * 60_000);
    const [row] = await sql<{ id: string }[]>`
      insert into public.lessons (teacher_id, starts_at, ends_at, meeting_link)
      values (${l.teacherId}, ${l.startsAt}, ${endsAt}, 'https://meet.jit.si/ayat-e2e-abrar') returning id`;
    if (!row) throw new Error('lesson not written');
    await sql`insert into public.lesson_students (lesson_id, student_id) values (${row.id}, ${l.studentId})`;
    return row.id;
  });
}

export interface QueuedMessage {
  template_key: string | null;
  lesson_id: string | null;
  status: string;
}

/** Outbound WhatsApp rows queued for a guardian (sending is Phase 4; the queue is the contract). */
export async function queuedFor(guardianId: string): Promise<QueuedMessage[]> {
  return withSql((sql) => sql<QueuedMessage[]>`
    select template_key, lesson_id, status from public.messages
    where guardian_id = ${guardianId} and direction = 'outbound' order by created_at`);
}

/** starts_at of a lesson (to check where it moved). */
export async function lessonsOf(studentId: string): Promise<{ starts_at: Date; status: string }[]> {
  return withSql((sql) => sql<{ starts_at: Date; status: string }[]>`
    select l.starts_at, l.status from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id
    where ls.student_id = ${studentId} order by l.starts_at`);
}

/** The rule a booking made for a student: its idempotency key, its link and its in-transaction audit. */
export async function ruleOf(studentId: string): Promise<{ client_request_id: string | null; meeting_link: string | null; audits: number }[]> {
  return withSql((sql) => sql<{ client_request_id: string | null; meeting_link: string | null; audits: number }[]>`
    select r.client_request_id, r.meeting_link,
      (select count(*)::int from public.audit_log a where a.entity_id = r.id and a.action = 'book') as audits
    from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id
    where rs.student_id = ${studentId}`);
}
