import { quote } from '@ab/shared';
import { seedFamily, withSql, type Family } from '../schedule';

// Seed for journeys 2 and 3 (docs/03 §5): «أبرار» has a lesson today that has already started,
// with a student whose package has 3 lessons left (R-SUB-02 fires at 2). Deterministic: call
// resetAbrar() first; every call makes a fresh family. Prices come from the catalog (docs/08).

const MINUTE = 60_000;
const DAY = 86_400_000;

/** UTC offset of `tz` at `at`, in ms (Intl only, like the API's zoned-time helpers). */
function offsetMs(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return wall - Math.floor(at.getTime() / 1000) * 1000;
}

/** Local midnight of today in `tz`, as an instant. */
function dayStart(tz: string, now: Date): Date {
  const off = offsetMs(tz, now);
  const local = new Date(now.getTime() + off);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - off);
}

/** Local date (YYYY-MM-DD) in Riyadh, `days` from today. */
function riyadhDate(now: Date, days: number): string {
  return new Date(now.getTime() + offsetMs('Asia/Riyadh', now) + days * DAY).toISOString().slice(0, 10);
}

/**
 * A start that is already past (a report can be submitted, an outcome recorded) and still "today"
 * both in Riyadh (the test clock) and in Cairo (the teacher's dashboard): 30 minutes ago, clamped
 * to the later of the two midnights.
 */
export function startedToday(now = new Date()): Date {
  const floor = Math.max(dayStart('Asia/Riyadh', now).getTime(), dayStart('Africa/Cairo', now).getTime());
  return new Date(Math.max(now.getTime() - 30 * MINUTE, floor));
}

export interface PackageSeed extends Family {
  studentId: string;
  subscriptionId: string;
  /** The completed lesson that already used 1 of the 4. */
  pastLessonId: string;
  /** Today's started, still scheduled lesson: completing it leaves 2 (the renewal trigger). */
  todayLessonId: string;
  price: number;
}

/**
 * «باقة الحلقة الأسبوعية» (4 × 90 min, SAR 145 at the catalog price) started a week ago, one
 * lesson completed 3 days ago, one lesson today → 3 left. `paid: false` (journey 3) leaves the
 * package `unpaid`; `paid: true` (journey 2) records the bank transfer and makes it `active`.
 */
export async function seedPackageStudent(input: {
  teacherId: string;
  paid: boolean;
  guardian: string;
  student: string;
}): Promise<PackageSeed> {
  const family = await seedFamily(input.guardian, [input.student]);
  const studentId = family.studentIds[0];
  if (!studentId) throw new Error('student not written');
  const offer = { ...quote({ tier: 'weekly', duration: 45, country: 'SA', students: 1, discount: 0 }), fx: null };
  const now = new Date();
  const today = startedToday(now);
  const past = new Date(dayStart('Asia/Riyadh', now).getTime() - 3 * DAY + 10 * 60 * MINUTE);
  return withSql(async (sql) => {
    const [sub] = await sql<{ id: string }[]>`
      insert into public.subscriptions
        (student_id, package, duration, lessons_total, price, currency, price_source, starts_on, status)
      values (${studentId}, '4', ${offer.duration}, ${offer.lessons}, ${offer.afterDiscount}, ${offer.currency},
        ${sql.json(JSON.parse(JSON.stringify(offer)))}, ${riyadhDate(now, -7)}, ${input.paid ? 'active' : 'unpaid'})
      returning id`;
    if (!sub) throw new Error('subscription not written');
    const lesson = async (startsAt: Date, status: string) => {
      const [row] = await sql<{ id: string }[]>`
        insert into public.lessons (teacher_id, starts_at, ends_at, status, meeting_link)
        values (${input.teacherId}, ${startsAt}, ${new Date(startsAt.getTime() + 90 * MINUTE)}, ${status},
          'https://meet.jit.si/ayat-e2e-abrar') returning id`;
      if (!row) throw new Error('lesson not written');
      const attendance = status === 'completed' ? 'on_time' : null;
      await sql`insert into public.lesson_students (lesson_id, student_id, attendance)
        values (${row.id}, ${studentId}, ${attendance})`;
      return row.id;
    };
    const pastLessonId = await lesson(past, 'completed');
    const todayLessonId = await lesson(today, 'scheduled');
    if (input.paid)
      await sql`insert into public.payments (subscription_id, amount, currency, method, paid_at, note)
        values (${sub.id}, ${offer.afterDiscount}, ${offer.currency}, 'bank', ${new Date(now.getTime() - DAY)}, 'e2e seed')`;
    return { ...family, studentId, subscriptionId: sub.id, pastLessonId, todayLessonId, price: offer.afterDiscount };
  });
}

export interface BalanceRow {
  lessons_used: number;
  remaining: number;
}

/** v_subscription_balance for one package (journey 2: 3 → 2 after the report). */
export async function balanceOf(subscriptionId: string): Promise<BalanceRow | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<BalanceRow[]>`
      select lessons_used, remaining from public.v_subscription_balance
      where subscription_id = ${subscriptionId}`;
    return row;
  });
}

/** The subscription's status (journey 3: unpaid → active after the payment). */
export async function subscriptionStatus(subscriptionId: string): Promise<string | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<{ status: string }[]>`
      select status from public.subscriptions where id = ${subscriptionId}`;
    return row?.status;
  });
}

/** Admin tasks raised for a package (journey 3: renewal_due at 2 left). */
export async function tasksFor(subscriptionId: string): Promise<{ kind: string; dedup_key: string }[]> {
  return withSql((sql) => sql<{ kind: string; dedup_key: string }[]>`
    select kind, dedup_key from public.admin_tasks
    where subject_type = 'subscription' and subject_id = ${subscriptionId} order by created_at`);
}

/** The student's report on a lesson (journey 2: submitted, version 1, PDF state). */
export async function reportOf(lessonId: string): Promise<
  { status: string; version: number; pdf_status: string | null; pdf_path: string | null } | undefined
> {
  return withSql(async (sql) => {
    const [row] = await sql<{ status: string; version: number; pdf_status: string | null; pdf_path: string | null }[]>`
      select status, version, pdf_status, pdf_path from public.lesson_reports where lesson_id = ${lessonId}`;
    return row;
  });
}
