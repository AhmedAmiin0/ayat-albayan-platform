import { dateText } from '@ab/shared';
import { ar, expect, test } from '../../support/core/fixtures';
import { API, bearer, setSetting } from '../../support/core/messages';
import {
  addDays,
  resetAbrar,
  riyadh,
  seedLesson,
  setAvailability,
  withSql,
} from '../../support/core/schedule';
import { seedPackageStudent } from '../../support/finance/money';
import { fillAttended } from '../../support/reporting/teacher-extra';

// docs/47 PR 1 «ملف الطالب» (owner 2026-11-13): her student's file shows the course start and
// end, an excused lesson with its reason, a lesson the admin moved with its old time and the
// move reason, and per-lesson reports: «اكتب التقرير» → submit → «تعديل التقرير».

const WINDOW_MIN = 30;
const EXCUSE = 'مرض الطالب';
const MOVE = 'سفر الأسرة';
const log = ar.sales.student.log;
const before = (text: string, key: string) => text.split(key)[0]?.trim() ?? '';
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

/** A past lesson of hers the family excused, with its reason (a one-lesson cancel). */
const seedExcused = (input: { teacherId: string; studentId: string }) =>
  withSql(async (sql) => {
    const startsAt = new Date(Date.now() - 5 * 60_000);
    const [row] = await sql<{ id: string }[]>`
      insert into public.lessons
        (teacher_id, starts_at, ends_at, status, cancel_reason, meeting_link)
      values (${input.teacherId}, ${startsAt}, ${new Date(startsAt.getTime() + 45 * 60_000)},
        'excused', ${EXCUSE}, 'https://meet.jit.si/ayat-e2e-abrar') returning id`;
    if (!row) throw new Error('lesson not written');
    await sql`insert into public.lesson_students (lesson_id, student_id, attendance)
      values (${row.id}, ${input.studentId}, 'excused')`;
  });

const startsOn = (subscriptionId: string) =>
  withSql(async (sql) => {
    const [row] = await sql<{ d: string }[]>`
      select to_char(starts_on, 'YYYY-MM-DD') as d from public.subscriptions
      where id = ${subscriptionId}`;
    return row?.d ?? '';
  });

const dayLabel = (date: string) =>
  dateText(new Date(`${date}T00:00:00Z`), { tz: 'UTC', locale: 'ar' }, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const riyadhToday = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);

test.describe('teacher student file (docs/47 PR 1)', () => {
  test.beforeEach(() => setSetting('report_teacher_edit_minutes', WINDOW_MIN));
  test.afterEach(() => setSetting('report_teacher_edit_minutes', 0));

  test('course dates, reasons, a moved lesson, write → edit on its row', async ({ asRole }) => {
    test.setTimeout(180_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, EVERY_DAY.map((d) => [d, '14:00', '20:00']));
    const tag = String(Date.now()).slice(-4);
    const name = `ميار ${tag}`;
    const family = { guardian: `أم ${name}`, student: name };
    const s = await seedPackageStudent({ teacherId, paid: true, ...family });
    await seedExcused({ teacherId, studentId: s.studentId });

    // The admin moves tomorrow's lesson to the day after, with a reason (owner call 4).
    const tomorrow = addDays(riyadhToday(), 1);
    const startsAt = riyadh(tomorrow, '14:00');
    const moving = await seedLesson({ teacherId, studentId: s.studentId, startsAt, minutes: 45 });
    const to = riyadh(addDays(tomorrow, 1), '15:30').toISOString();
    const admin = await asRole('admin');
    const moved = await admin.request.post(`${API}/lessons/${moving}/reschedule`, {
      headers: await bearer(admin),
      data: { scope: 'one', startsAt: to, reason: MOVE },
    });
    expect(moved.status()).toBe(200);

    const teacher = await asRole('teacher');
    await teacher.goto(`/teacher/students/${s.studentId}`);
    await expect(teacher.getByText(name).first()).toBeVisible({ timeout: 30_000 });

    // The course: its start (a calendar date) and how it ends; never a price.
    const course = teacher.getByRole('region', { name: ar.teacherFile.course });
    const start = dayLabel(await startsOn(s.subscriptionId));
    await expect(course).toContainText(ar.teacherFile.courseStart.replace('{date}', start));
    await expect(course).toContainText(/تنتهي الدورة بعد|النهاية المتوقعة للدورة|انتهت الدورة/);

    // The next 14 days: the old time says where it went, the new one what it replaced, both why.
    const upcoming = teacher.getByRole('table', { name: ar.teacherFile.upcoming });
    await expect(upcoming).toContainText(before(log.movedTo, '{when}'));
    await expect(upcoming).toContainText(before(log.movedFrom, '{when}'));
    await expect(upcoming).toContainText(log.moveReason.replace('{reason}', MOVE));

    // The month log: the excused lesson reads «اعتذر» with the family's reason.
    const month = teacher.getByRole('table', { name: ar.teacherBoard.attendanceLog });
    await expect(month).toContainText(log.cancelReason.replace('{reason}', EXCUSE));
    await expect(month).toContainText(ar.sales.student.kind.excused);

    // Today's started lesson: «اكتب التقرير» opens its form; once sent, «تعديل التقرير».
    const reportLink = month.locator(`a[href="/teacher/report/${s.todayLessonId}"]`);
    await expect(reportLink).toHaveText(ar.teacherBoard.writeReport);
    await reportLink.click();
    await expect(teacher.getByRole('region', { name: ar.reports.identity })).toBeVisible();
    await fillAttended(teacher);
    await teacher.getByRole('button', { name: ar.reports.submit }).click();
    await expect(teacher.getByText(ar.reports.submitted)).toBeVisible();

    await teacher.goto(`/teacher/students/${s.studentId}`);
    const after = teacher.getByRole('table', { name: ar.teacherBoard.attendanceLog });
    const edit = after.locator(`a[href="/teacher/report/${s.todayLessonId}"]`);
    await expect(edit).toHaveText(ar.reports.edit, { timeout: 30_000 });

    // docs/49: the sent report reads inside its own row (no «التقارير» tab), still with no money.
    const editHref = teacher.locator(`a[href="/teacher/report/${s.todayLessonId}"]`);
    const today = after.getByRole('row').filter({ has: editHref });
    await today.locator('summary', { hasText: ar.reports.view }).click();
    await expect(teacher.getByRole('article', { name: ar.reportPage.title })).toBeVisible();
    await expect(teacher.locator('body')).not.toContainText(/ريال|SAR|EGP/);
  });
});
