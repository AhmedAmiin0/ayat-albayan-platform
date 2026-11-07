import { ar, expect, test } from '../../support/core/fixtures';
import { uploadInvoice } from '../../support/finance/invoice';
import { lessonsOf, resetAbrar, seedFamily, setAvailability, withSql } from '../../support/core/schedule';
import { fillLessonRow } from '../../support/teaching/lesson-rows';

// A time per weekday (owner 2026-10-18, R-SCH-06): the admin wizard sets Sunday 16:00 AND Wednesday
// 18:00 in the lesson rows (a date input and a time input per day, owner 2026-11-07). «الأيام المتاحة» lists both,
// the review shows each day with its time, and the booking writes ONE schedule_rules row per distinct
// time (the Wednesday one linked to the first by first_rule_id), lessons on both days at their times.

const weekday = ar.enums.weekday;
const dayAt = (day: '0' | '3', time: string) => ar.booking.dayAt.replace('{day}', weekday[day]).replace('{time}', time);

test.describe('a package with a different time on each day (R-SCH-06)', () => {
  test('Sunday 16:00 + Wednesday 18:00: two rules, one series, lessons at each day’s time', async ({ asRole, isMobile }) => {
    test.skip(isMobile, 'one teacher week per run: the desktop run covers it');
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '16:00', '18:00'], [3, '18:00', '19:00']]);
    const name = `هالة${String(Date.now()).slice(-4)}`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const [studentId = ''] = family.studentIds;

    const admin = await asRole('admin');
    await admin.goto(`/admin/book?studentId=${studentId}`);
    const next = () => admin.getByRole('button', { name: ar.booking.next }).click();
    await next();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await next();
    await next(); // package 8, 45 min
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await expect(step.getByText(ar.booking.pickDayTimes)).toBeVisible();
    await fillLessonRow(step, 1, { weekday: 0, time: '16:00' });
    await fillLessonRow(step, 2, { weekday: 3, time: '18:00' });
    await expect(step.getByText(ar.lessonTimes.free)).toHaveCount(2);
    const days = step.getByRole('region', { name: new RegExp(ar.booking.pickDays) });
    await expect(days.getByText(dayAt('0', '16:00'))).toBeVisible();
    await expect(days.getByText(dayAt('3', '18:00'))).toBeVisible();
    await expect(step.getByText(ar.booking.seriesFree)).toBeVisible();
    await next();
    await uploadInvoice(admin);
    const review = admin.getByRole('region', { name: ar.booking.steps.review });
    await expect(review.getByText(dayAt('0', '16:00'))).toBeVisible();
    await expect(review.getByText(dayAt('3', '18:00'))).toBeVisible();
    await admin.getByRole('button', { name: ar.booking.submit }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();

    // One rule per distinct time; the second points at the first (one booking, one series).
    const rules = await withSql((sql) => sql<{ id: string; byday: number[]; start_time_local: string; first_rule_id: string | null }[]>`
      select r.id, r.byday, to_char(r.start_time_local, 'HH24:MI') as start_time_local, r.first_rule_id
      from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id
      where rs.student_id = ${studentId} order by r.start_time_local`);
    expect(rules.map((r) => [r.byday, r.start_time_local])).toEqual([
      [[0], '16:00'],
      [[3], '18:00'],
    ]);
    const [first, second] = rules;
    expect(first?.first_rule_id).toBeNull();
    expect(second?.first_rule_id).toBe(first?.id);

    // Sunday lessons at 13:00Z (16:00 Riyadh), Wednesday ones at 15:00Z (18:00 Riyadh).
    const lessons = await lessonsOf(studentId);
    expect(lessons.length).toBeGreaterThanOrEqual(4);
    const times = new Set(lessons.map((l) => `${l.starts_at.getUTCDay()}@${l.starts_at.getUTCHours()}`));
    expect(times).toEqual(new Set(['0@13', '3@15']));
  });
});
