import { ar, expect, test } from '../../support/core/fixtures';
import { uploadInvoice } from '../../support/finance/invoice';
import { lessonsOf, queuedFor, resetAbrar, ruleOf, seedFamily } from '../../support/core/schedule';
import { fillLessonRow } from '../../support/teaching/lesson-rows';

// Journey 5 (docs/03 §5): the teacher sets availability → the booking wizard only offers those
// times. R-TCH-02, R-SCH-08 (teacher self-service), R-SCH-06 (times read against availability).

const WEDNESDAY = ar.enums.weekday['3'];

test.describe('journey 5 — availability drives the wizard (R-SCH-06, R-SCH-08)', () => {
  test('Wednesday 16:00–18:00 Riyadh → the wizard offers 16:00 and 16:45 on Wednesday only', async ({
    asRole,
  }) => {
    await resetAbrar(); // no availability, no lessons
    const family = await seedFamily('أم سارة', ['سارة']);

    // The teacher, on their own dashboard: one range, saved in Riyadh time.
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await teacher.getByRole('tab', { name: ar.availability.title }).click();
    await teacher.getByLabel(ar.availability.tz).selectOption('Asia/Riyadh');
    await teacher.getByRole('button', { name: `${ar.availability.addSlot} ${WEDNESDAY}`, exact: true }).click();
    await teacher.getByLabel(`${WEDNESDAY} ${ar.availability.from}`).selectOption('16:00');
    await teacher.getByLabel(`${WEDNESDAY} ${ar.availability.to}`).selectOption('18:00');
    await teacher.getByRole('button', { name: ar.availability.save }).click();
    await expect(teacher.getByRole('status')).toHaveText(ar.availability.saved);

    // The admin books for Sara: «أبرار» is pickable now, and her grid is exactly that range.
    const admin = await asRole('admin');
    await admin.goto(`/admin/book?studentId=${family.studentIds[0] ?? ''}`);
    await expect(admin.getByRole('checkbox', { name: /سارة/ })).toBeChecked();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    // Length + package come before the slot (the repeat days depend on the package).
    await expect(admin.getByRole('radio', { name: new RegExp(ar.enums.packageSize['8']) })).toBeChecked();
    await admin.getByRole('button', { name: ar.booking.next }).click();

    // Next week is whole (this week's Wednesday may be gone): 45-minute starts inside 16:00–18:00.
    // 17:30 would end past 18:00 (outside her availability, with 16:00 and 16:45 offered instead);
    // 16:00 is free and becomes the first lesson.
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await fillLessonRow(step, 1, { weekday: 3, time: '17:30' });
    await expect(step.getByText(/خارج المواعيد المتاحة للمعلم/)).toBeVisible();
    const nearest = step.getByRole('group', { name: ar.lessonTimes.nearest }).getByRole('button');
    await expect(nearest).toHaveCount(2);
    await nearest.first().click();
    await expect(step.getByText(ar.lessonTimes.free)).toBeVisible();
    const dayAt = ar.booking.dayAt.replace('{day}', WEDNESDAY).replace('{time}', '16:00');
    await expect(step.getByRole('region', { name: new RegExp(ar.booking.pickDays) }).getByText(dayAt)).toBeVisible();
    await expect(admin.getByRole('button', { name: ar.booking.next })).toBeEnabled();

    // Review → «احجز»: one transaction writes the rule (idempotency key, no frozen link), the
    // Wednesday lessons, one queued confirmation and the audit row (migrations 110–112).
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await uploadInvoice(admin);
    await admin.getByRole('button', { name: ar.booking.submit }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();
    const studentId = family.studentIds[0] ?? '';
    const lessons = await lessonsOf(studentId);
    expect(lessons.length).toBeGreaterThan(0);
    for (const l of lessons) {
      expect([l.status, l.starts_at.getUTCDay(), l.starts_at.getUTCHours()]).toEqual(['scheduled', 3, 13]);
    }
    expect(await ruleOf(studentId)).toEqual([
      { client_request_id: expect.any(String), meeting_link: null, audits: 1 },
    ]);
    await expect.poll(() => queuedFor(family.guardianId)).toEqual([expect.objectContaining({ status: 'queued' })]);
  });
});
