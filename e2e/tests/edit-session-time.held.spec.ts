import { ar, expect, test } from '../support/fixtures';
import { resetAbrar, seedFamily, seedLesson, withSql } from '../support/schedule';
import { auditOf, fillForm, L, lessonRows, openForm, save } from './edit-session-time.helpers';

// «عدّل الوقت» on a COMPLETED lesson (R-SCH-11, correct mode): fix the recorded length the same day,
// reason required. Last month, as in payouts.spec.ts: the month is over, so it can be approved.
// Needs the API's PATCH /lessons/:id/time (migration 174), so it only passes once that is merged.

/** Last month on the e2e teacher's clock (Africa/Cairo), YYYY-MM. */
function lastMonth(now = new Date()): string {
  const [y = 0, m = 1] = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).split('-').map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

/** «45 دقيقة: 1 × 70 = 70 ج.م», the breakdown line of the payouts table. */
const line = (d: '45' | '60', rate: number) =>
  `${ar.pricing.durations[d]}: ${ar.payouts.line.replace('{lessons}', '1').replace('{rate}', String(rate)).replace('{amount}', `${rate} ${ar.payouts.currency}`)}`;

/** A completed 45-minute lesson on the 10th with a sent report (PDF ready); rates 70 / 90 EGP. */
async function seedHeld() {
  const teacherId = await resetAbrar();
  const month = lastMonth();
  const family = await seedFamily('أم جنى', ['جنى']);
  const studentId = family.studentIds[0] ?? '';
  const lessonId = await seedLesson({ teacherId, studentId, startsAt: new Date(`${month}-10T10:00:00Z`), minutes: 45 });
  await withSql(async (sql) => {
    await sql`update public.teachers set rate_45 = 70, rate_60 = 90 where id = ${teacherId}`;
    await sql`delete from public.teacher_payouts where teacher_id = ${teacherId}`;
    await sql`update public.lessons set status = 'completed' where id = ${lessonId}`;
    await sql`update public.lesson_students set attendance = 'on_time' where lesson_id = ${lessonId}`;
    await sql`insert into public.lesson_reports (lesson_id, student_id, teacher_id, attendance, status, version, submitted_at, pdf_status, pdf_path)
      values (${lessonId}, ${studentId}, ${teacherId}, 'on_time', 'submitted', 1, now(), 'ready', ${`reports/${studentId}/${lessonId}.pdf`})`;
  });
  return { teacherId, lessonId, month, date: `${month}-10` };
}

test.describe('«عدّل الوقت» — held lessons (R-SCH-11)', () => {
  test('45 → 60 keeps the status, audits the reason, refreshes the PDF and moves the payout line', async ({ asRole }) => {
    const s = await seedHeld();
    const admin = await asRole('admin');
    await admin.goto(`/admin/payouts?month=${s.month}`);
    await admin.getByRole('button', { name: ar.payouts.generate }).click();
    const row = admin.getByRole('row').filter({ hasText: 'أبرار' });
    await expect(row).toContainText(line('45', 70));

    const drawer = await openForm(admin, { date: s.date, teacherId: s.teacherId, name: 'جنى' });
    await expect(drawer.getByRole('button', { name: L.submit })).toBeDisabled(); // nothing changed yet
    await fillForm(drawer, { minutes: '60' });
    await expect(drawer.getByText(L.payoutWarn)).toBeVisible();
    await save(drawer);
    await expect(drawer.getByText(ar.lessons.error.reason_required)).toBeVisible(); // required, asked before any request
    await fillForm(drawer, { reason: 'الحلقة خدت ساعة بدل 45 دقيقة' });
    await save(drawer);
    await expect(drawer.getByText(L.payoutDraft)).toBeVisible();
    await expect(drawer.getByText(L.pdfRefresh)).toBeVisible();
    await drawer.getByRole('button', { name: L.close }).click();

    const [lesson] = await lessonRows(s.teacherId);
    expect(lesson).toMatchObject({ id: s.lessonId, status: 'completed' });
    expect((lesson?.ends_at.getTime() ?? 0) - (lesson?.starts_at.getTime() ?? 0)).toBe(60 * 60_000);
    expect((await auditOf(s.lessonId))[0]?.after).toMatchObject({ mode: 'correct', reason: 'الحلقة خدت ساعة بدل 45 دقيقة' });
    const [report] = await withSql((sql) => sql<{ pdf_status: string }[]>`select pdf_status from public.lesson_reports where lesson_id = ${s.lessonId}`);
    expect(report?.pdf_status).toBe('pending');

    // Nothing regenerates by itself: «إعادة الحساب» picks up the 60-minute rate.
    await admin.goto(`/admin/payouts?month=${s.month}`);
    await admin.getByRole('button', { name: ar.payouts.regenerate }).click();
    await expect(row).toContainText(line('60', 90));
  });

  test('an approved month refuses a length change that would alter its line', async ({ asRole }) => {
    const s = await seedHeld();
    await withSql((sql) => sql`
      insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at, breakdown)
      values (${s.teacherId}, ${`${s.month}-01`}, 1, 70, 'approved', now(), ${JSON.stringify({ lessons: [s.lessonId] })}::jsonb)`);
    const admin = await asRole('admin');
    const drawer = await openForm(admin, { date: s.date, teacherId: s.teacherId, name: 'جنى' });
    await fillForm(drawer, { minutes: '60', reason: 'الحلقة خدت ساعة' });
    await save(drawer);
    await expect(drawer.getByRole('alert').filter({ hasText: ar.lessons.timeEdit.startOnly })).toBeVisible();
    const [lesson] = await lessonRows(s.teacherId);
    expect((lesson?.ends_at.getTime() ?? 0) - (lesson?.starts_at.getTime() ?? 0)).toBe(45 * 60_000);
  });
});
