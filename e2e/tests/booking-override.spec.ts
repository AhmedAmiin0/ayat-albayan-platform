import { ar, expect, test } from '../support/fixtures';
import { uploadInvoice } from '../support/finance/invoice';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, ruleOf, seedFamily, seedLesson, setAvailability, withSql } from '../support/schedule';

// Booking over a clash (R-SCH-04): the slot stays pickable, «احجز» → 409 → ConflictNotice, and
// «احجز رغم التعارض» needs a reason that lands on the clashing lessons only (+ the book audit).

const REASON = 'ولي الأمر طلب الميعاد ده';

test.describe('booking override with a reason (R-SCH-04)', () => {
  test('a busy Sunday 16:00 → conflict → no reason is refused → with a reason it books, the reason is stored', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '16:00', '18:00']]);
    const sunday = addDays(nextWeekSaturday(), 1);
    const stamp = String(Date.now()).slice(-4);
    const other = await seedFamily(`أم ملاك${stamp}`, [`ملاك${stamp}`]);
    const mine = await seedFamily(`أم نور${stamp}`, [`نور${stamp}`]);
    const [otherId = ''] = other.studentIds;
    const [studentId = ''] = mine.studentIds;
    await seedLesson({ teacherId, studentId: otherId, startsAt: riyadh(sunday, '16:00'), minutes: 45 });

    const admin = await asRole('admin');
    await admin.goto(`/admin/book?studentId=${studentId}`);
    const next = () => admin.getByRole('button', { name: ar.booking.next }).click();
    await next();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await next();
    await next(); // package 8, 45 min
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
    await expect(step.getByText(ar.booking.seriesCheck.replace('{n}', '1'))).toBeVisible(); // the check sees the clash early
    await next();
    await uploadInvoice(admin);
    await admin.getByRole('button', { name: ar.booking.submit }).click();

    // The clash is listed in Arabic; the override needs its reason first.
    await expect(admin.getByText(ar.booking.conflictTitle)).toBeVisible();
    await expect(admin.getByText(/المعلم\/ة مشغول\/ة بحلقة أخرى في هذا الموعد/)).toBeVisible();
    await admin.getByRole('button', { name: ar.booking.override }).click();
    await expect(admin.getByText(ar.common.required)).toBeVisible();
    expect(await ruleOf(studentId)).toEqual([]);

    await admin.getByLabel(ar.booking.overrideReason).fill(REASON);
    await admin.getByRole('button', { name: ar.booking.override }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();

    // Only the clashing first lesson carries the reason; the rule has its in-transaction audit.
    const rows = await withSql((sql) => sql<{ starts_at: Date; override_reason: string | null }[]>`
      select l.starts_at, l.override_reason from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id
      where ls.student_id = ${studentId} order by l.starts_at`);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((l) => l.override_reason)).toEqual(rows.map((_, i) => (i === 0 ? REASON : null)));
    expect(rows[0]?.starts_at.toISOString()).toBe(riyadh(sunday, '16:00').toISOString());
    expect(await ruleOf(studentId)).toEqual([{ client_request_id: expect.any(String), meeting_link: null, audits: 1 }]);
  });
});
