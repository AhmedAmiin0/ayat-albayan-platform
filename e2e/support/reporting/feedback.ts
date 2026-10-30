import { expect } from '../core/fixtures';
import { addDays, nextWeekSaturday, riyadh, seedFamily, seedLesson, withSql } from '../core/schedule';
import { STUB_URL, stubSent, stubTemplateStatus } from '../wa-stub';

// Seed and capture helpers for the «رأيك يهمّنا» journey (tests/feedback.spec.ts).

export const TEMPLATE = 'lesson_feedback_request';

/** The template exists on the stub and is approved there and in the DB (an explicit admin action in prod). */
export async function approveTemplate(): Promise<void> {
  const created = await fetch(`${STUB_URL}/v21.0/e2e-waba/message_templates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer e2e-token' },
    body: JSON.stringify({
      name: TEMPLATE,
      language: 'ar',
      category: 'UTILITY',
      components: [
        { type: 'BODY', text: 'شكرًا لثقتكم بينا في حلقة {{1}} مع {{2}}. رأيكم يهمنا', example: { body_text: [['سهيلة', 'أبرار']] } },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'رأيك يهمّنا', url: 'http://localhost:5180/feedback/{{1}}', example: ['http://localhost:5180/feedback/sample'] }] },
      ],
    }),
  });
  expect([200, 400]).toContain(created.status); // 400 = left over from an earlier run (already exists)
  await stubTemplateStatus(TEMPLATE, 'APPROVED');
  await withSql(async (sql) => {
    const rows = await sql`update public.message_templates set status = 'approved' where key = ${TEMPLATE} returning key`;
    expect(rows, 'the migration seeds the lesson_feedback_request template').toHaveLength(1);
  });
}

/** The seeded state (migration 166): not on Meta yet. approveTemplate() changes it, so a journey puts it back. */
export async function unapproveTemplate(): Promise<void> {
  await withSql((sql) => sql`update public.message_templates set status = 'not_submitted' where key = ${TEMPLATE}`);
}

/** A student with a completed lesson next week (the API only asks about lessons that took place). */
export async function completedLesson(teacherId: string, student: string): Promise<{ lessonId: string; studentId: string; guardianId: string }> {
  const family = await seedFamily(`أم ${student}`, [student]);
  const [studentId = ''] = family.studentIds;
  const startsAt = riyadh(addDays(nextWeekSaturday(), 1), '14:00');
  const lessonId = await seedLesson({ teacherId, studentId, startsAt, minutes: 45 });
  await withSql(async (sql) => {
    await sql`update public.lessons set status = 'completed' where id = ${lessonId}`;
    await sql`update public.lesson_students set attendance = 'on_time' where lesson_id = ${lessonId}`;
  });
  return { lessonId, studentId, guardianId: family.guardianId };
}


/** The link's token: the template's URL button value, as the stub captured it. */
export async function tokenSentTo(guardianId: string): Promise<string> {
  const phone = await withSql(async (sql) => {
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${guardianId}`;
    return (g?.phone_e164 ?? '').replace(/\D/g, '');
  });
  let token = '';
  await expect
    .poll(async () => {
      const sent = (await stubSent()).filter((m) => m.template === TEMPLATE && m.to.replace(/\D/g, '') === phone);
      const body = sent[0]?.body as { template?: { components?: { type: string; parameters?: { text?: string }[] }[] } } | undefined;
      token = body?.template?.components?.find((c) => c.type === 'button')?.parameters?.[0]?.text ?? '';
      return token;
    }, { timeout: 60_000 })
    .not.toBe('');
  return token;
}
