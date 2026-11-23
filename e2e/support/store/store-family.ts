import { quote } from '@ab/money';
import { createClient } from '@supabase/supabase-js';
import { addDays, resetAbrar, riyadh, seedFamily, withSql } from '../core/schedule';
import { DEMO } from './store-demo';
import type { DemoLesson, DemoReport, StoreFamily } from './store.types';

// The store screenshots' family (Google Play listing): one guardian, two children taught by the
// e2e teacher «أبرار», an active 8-lesson package, two sent reports and lessons ahead. Fictional
// names and text only, written to the CI database the workflow starts and throws away.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LESSON_MS = 45 * 60_000;
const RIYADH_MS = 3 * HOUR;

/** Today's date on a Riyadh wall clock (UTC+3, no DST). */
const riyadhToday = (now: Date): string =>
  new Date(now.getTime() + RIYADH_MS).toISOString().slice(0, 10);

/** The next lesson: tomorrow at 18:00, or the day after when tomorrow's is under 20 h away. */
function nextLessonAt(now: Date): Date {
  const tomorrow = riyadh(addDays(riyadhToday(now), 1), '18:00');
  const soon = tomorrow.getTime() - now.getTime() < 20 * HOUR;
  return soon ? riyadh(addDays(riyadhToday(now), 2), '18:00') : tomorrow;
}

/** The Saturday that opens the academy week of a «YYYY-MM-DD» day (getUTCDay: Saturday = 6). */
function weekStart(day: string): number {
  const at = new Date(`${day}T00:00:00Z`);
  return at.getTime() - ((at.getUTCDay() + 1) % 7) * DAY;
}

/** On a Friday (or a late Thursday) the next lesson already sits in the next academy week. */
const weekOf = (next: Date, now: Date): StoreFamily['week'] =>
  weekStart(riyadhToday(next)) > weekStart(riyadhToday(now)) ? 'next' : 'this';

async function uploadPdf(path: string): Promise<void> {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const storage = createClient(url, key, { auth: { persistSession: false } });
  const pdf = new TextEncoder().encode('%PDF-1.4\n%store\n');
  const opts = { contentType: 'application/pdf', upsert: true };
  const { error } = await storage.storage.from('reports').upload(path, pdf, opts);
  if (error) throw new Error(`pdf upload: ${error.message}`);
}

async function addLesson(input: { teacherId: string; studentId: string; lesson: DemoLesson }) {
  const { startsAt, done } = input.lesson;
  return withSql(async (sql) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.lessons (teacher_id, starts_at, ends_at, status, meeting_link)
      values (${input.teacherId}, ${startsAt}, ${new Date(startsAt.getTime() + LESSON_MS)},
        ${done ? 'completed' : 'scheduled'}, 'https://meet.jit.si/ayat-store-demo') returning id`;
    if (!row) throw new Error('lesson not written');
    await sql`insert into public.lesson_students (lesson_id, student_id, attendance)
      values (${row.id}, ${input.studentId}, ${done ? 'on_time' : null})`;
    return row.id;
  });
}

async function addReport(ids: { lessonId: string; studentId: string; teacherId: string },
  report: DemoReport): Promise<void> {
  const path = `${ids.studentId}/${ids.lessonId}.pdf`;
  await uploadPdf(path);
  await withSql((sql) => sql`insert into public.lesson_reports
    (lesson_id, student_id, teacher_id, attendance, program, recited, new_memorization, revision,
      notes, homework, next_plan, grade_recitation, grade_memorization, grade_revision,
      grade_tajweed, grade_engagement, grade_commitment, grade_overall, status, version,
      submitted_at, pdf_status, pdf_path, sent_at)
    values (${ids.lessonId}, ${ids.studentId}, ${ids.teacherId}, 'on_time', 'quran',
      ${report.recited}, ${report.newMemorization}, ${report.revision}, ${report.notes},
      ${report.homework}, ${report.nextPlan}, 'excellent', 'very_good', 'excellent', 'very_good',
      'excellent', 'excellent', ${report.overall}, 'submitted', 1, now(), 'ready', ${path},
      now())`);
}

async function addPackage(studentId: string, now: Date): Promise<void> {
  const offer = quote({ tier: 'starter', duration: 45, country: 'SA', students: 1, discount: 0 });
  const priced = { ...offer, fx: null };
  await withSql(async (sql) => {
    const [sub] = await sql<{ id: string }[]>`insert into public.subscriptions
      (student_id, package, duration, lessons_total, price, currency, price_source, starts_on,
        status)
      values (${studentId}, '8', ${offer.duration}, ${offer.lessons}, ${offer.afterDiscount},
        ${offer.currency}, ${sql.json(priced)},
        ${addDays(riyadhToday(now), -10)}, 'active') returning id`;
    if (!sub) throw new Error('subscription not written');
    await sql`insert into public.payments (subscription_id, amount, currency, method, paid_at)
      values (${sub.id}, ${offer.afterDiscount}, ${offer.currency}, 'bank',
        ${new Date(now.getTime() - 10 * DAY)})`;
  });
}

/** One child's lessons, and a sent report on each past lesson that has one. */
async function addLessons(input: { teacherId: string; studentId: string; lessons: DemoLesson[] }) {
  for (const lesson of input.lessons) {
    const lessonId = await addLesson({ ...input, lesson });
    const ids = { lessonId, studentId: input.studentId, teacherId: input.teacherId };
    if (lesson.report) await addReport(ids, lesson.report);
  }
}

export async function seedStoreFamily(now = new Date()): Promise<StoreFamily> {
  const teacherId = await resetAbrar();
  const family = await seedFamily(DEMO.guardian, [DEMO.first, DEMO.second]);
  const [firstId = '', secondId = ''] = family.studentIds;
  const next = nextLessonAt(now);
  await addPackage(firstId, now);
  await addLessons({ teacherId, studentId: firstId, lessons: DEMO.firstLessons(next) });
  await addLessons({ teacherId, studentId: secondId, lessons: DEMO.secondLessons(next) });
  const [row] = await withSql((sql) => sql<{ phone: string }[]>`
    select phone_e164 as phone from public.guardians where id = ${family.guardianId}`);
  if (!row) throw new Error('guardian not written');
  return {
    phone: row.phone,
    first: { id: firstId, name: DEMO.first },
    second: { id: secondId, name: DEMO.second },
    frozenAt: new Date(Math.floor(now.getTime() / HOUR) * HOUR),
    week: weekOf(next, now),
  };
}
