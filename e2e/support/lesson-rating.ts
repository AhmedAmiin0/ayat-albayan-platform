import { resetAbrar, seedFamily, seedLesson, withSql } from './schedule';
import { stubSent, type StubSent } from './wa-stub';

// Seed and read helpers for tests/lesson-rating.spec.ts (migration 195).

export const RATING = 'lesson_rating';

export interface RatingScene {
  lessonId: string;
  studentId: string;
  guardianId: string;
  phone: string;
}

/** A family with a lesson that started 30 minutes ago and is still `scheduled` (the teacher has not closed it). */
export async function startedLesson(student: string): Promise<RatingScene> {
  const teacherId = await resetAbrar();
  const family = await seedFamily(`أم ${student}`, [student]);
  const [studentId = ''] = family.studentIds;
  const lessonId = await seedLesson({ teacherId, studentId, startsAt: new Date(Date.now() - 30 * 60_000), minutes: 45 });
  const phone = await withSql(async (sql) => {
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${family.guardianId}`;
    return g?.phone_e164 ?? '';
  });
  return { lessonId, studentId, guardianId: family.guardianId, phone };
}

/** The lesson_rating messages the stub got for this phone. */
export async function ratingsSentTo(phone: string): Promise<StubSent[]> {
  const digits = phone.replace(/\D/g, '');
  return (await stubSent()).filter((m) => m.template === RATING && m.to.replace(/\D/g, '') === digits);
}

/** The quick-reply payloads of a template message, by button index. */
export function payloadsOf(message: StubSent | undefined): string[] {
  const body = (message?.body ?? {}) as { template?: { components?: { type: string; sub_type?: string; parameters?: { payload?: string }[] }[] } };
  return (body.template?.components ?? []).filter((c) => c.sub_type === 'quick_reply').map((c) => c.parameters?.[0]?.payload ?? '');
}

/** lesson_feedback's button answer for this lesson and student. */
export async function quickRating(lessonId: string, studentId: string): Promise<{ quick_rating: string | null; source: string } | null> {
  const [row] = await withSql((sql) => sql<{ quick_rating: string | null; source: string }[]>`
    select quick_rating::text, source::text from public.lesson_feedback where lesson_id = ${lessonId} and student_id = ${studentId}`);
  return row ?? null;
}

/** The outbound lesson_rating rows for this lesson (the dedup key keeps it at one per guardian). */
export async function ratingRows(lessonId: string): Promise<{ status: string; dedup_key: string }[]> {
  return withSql((sql) => sql<{ status: string; dedup_key: string }[]>`
    select status::text, dedup_key from public.messages where lesson_id = ${lessonId} and template_key = ${RATING} and direction = 'outbound'`);
}
