import { ar, expect, test } from '../support/fixtures';
import { addDays, lessonsOf, queuedFor, resetAbrar, riyadh, seedFamily, seedLesson, setAvailability, withSql } from '../support/schedule';
import { riyadhDay } from '../support/schedule-extra';

// A teacher's «اقترح موعدًا آخر» the admin answers «ارفض الاقتراح» (R-SCH-08): the proposal is
// `rejected` and decided, the lesson stays exactly where it was, the guardian hears nothing and the
// teacher's card is back to «اقترح موعدًا آخر». (proposals.spec covers the propose form and approve.)

const MINUTE = 60_000;
const NOTE = 'مش هقدر في الميعاد ده';

async function proposalOf(lessonId: string): Promise<{ status: string; decided_by: string | null } | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<{ status: string; decided_by: string | null }[]>`
      select status, decided_by from public.lesson_proposals where lesson_id = ${lessonId}`;
    return row;
  });
}

test.describe('lesson proposal — admin rejects (R-SCH-08)', () => {
  test('«ارفض الاقتراح» → rejected, the lesson is unchanged, the teacher can propose again', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [0, 1, 2, 3, 4, 5, 6].map((d) => [d, '10:00', '22:00']));
    const name = `ملك${String(Date.now()).slice(-4)}`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const [studentId = ''] = family.studentIds;
    const startsAt = riyadh(addDays(riyadhDay(new Date()), 2), '14:00');
    const lessonId = await seedLesson({ teacherId, studentId, startsAt, minutes: 45 });
    const proposed = new Date(startsAt.getTime() + 90 * MINUTE);
    await withSql((sql) => sql`
      insert into public.lesson_proposals (lesson_id, teacher_id, proposed_starts_at, note)
      values (${lessonId}, ${teacherId}, ${proposed}, ${NOTE})`);
    const waiting = ar.teacherDash.propose.pending.split('{when}')[1] ?? '';

    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await teacher.getByRole('tab', { name: ar.teacherDash.week }).click();
    const card = teacher.getByRole('article', { name: new RegExp(name) });
    await expect(card.getByText(waiting)).toBeVisible();
    await expect(card.getByRole('button', { name: ar.teacherDash.proposeReschedule })).toHaveCount(0);

    const admin = await asRole('admin');
    await admin.goto('/admin/schedule');
    const panel = admin.getByRole('region', { name: new RegExp(ar.lessons.proposal.title) });
    await panel.getByRole('button', { name: new RegExp(name) }).click();
    const drawer = admin.getByRole('dialog', { name });
    await expect(drawer.getByText(NOTE)).toBeVisible();
    await drawer.getByRole('button', { name: ar.lessons.proposal.reject }).click();
    await expect(admin.getByRole('status').filter({ hasText: ar.lessons.proposal.rejected })).toBeVisible();
    await expect(panel.getByRole('button', { name: new RegExp(name) })).toHaveCount(0);

    expect(await proposalOf(lessonId)).toEqual({ status: 'rejected', decided_by: expect.any(String) });
    const rows = await lessonsOf(studentId);
    expect(rows.map((l) => [l.status, l.starts_at.toISOString()])).toEqual([['scheduled', startsAt.toISOString()]]);
    expect(await queuedFor(family.guardianId)).toEqual([]);

    await teacher.reload();
    await teacher.getByRole('tab', { name: ar.teacherDash.week }).click();
    await expect(card.getByText(waiting)).toHaveCount(0);
    await expect(card.getByRole('button', { name: ar.teacherDash.proposeReschedule })).toBeVisible();
  });
});
