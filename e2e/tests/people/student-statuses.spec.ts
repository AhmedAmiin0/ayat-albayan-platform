import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { resetAbrar, seedFamily, setAvailability } from '../../support/schedule';
import {
  bookTrial,
  completeLesson,
  profileChip,
  recordPayment,
  startNow,
  statusTrail,
  studentStatusOf,
  unpaidPackage,
} from '../../support/people/student-statuses';

// Student status pipeline (owner 2026-10-15, R-STU-05, docs/18): a registered student with no trial
// time is «جديد»; booking a trial lesson → «بانتظار الحلقة التجريبية»; attending it → «بانتظار
// الاشتراك»; a positive payment → «مشترك». Each step through the real API (:3100), checked in
// students.status, in its status_change audit row and on the admin profile chip. No WhatsApp is sent.

const E = ar.enums.studentStatus;
const NAME = `مسار الحالات ${String(Date.now()).slice(-6)}`;

/** The admin profile, freshly loaded, shows this status chip. */
async function expectChip(page: Page, input: { studentId: string; label: string }): Promise<void> {
  await page.goto(`/admin/students/${input.studentId}`);
  await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible();
  await expect(profileChip(page, input.label)).toBeVisible();
}

test.describe('student statuses (owner 2026-10-15, R-STU-05)', () => {
  test('new → trial on booking → pending_subscription on attendance → active on payment', async ({
    asRole,
    isMobile,
  }) => {
    test.skip(isMobile, 'one booking per run: the desktop run covers it');
    test.setTimeout(120_000);
    const teacherId = await resetAbrar();
    // resetAbrar clears her availability too: Sunday 16:00–19:00 Riyadh holds the 17:00 trial.
    await setAvailability(teacherId, [[0, '16:00', '19:00']]);
    const family = await seedFamily(`أم ${NAME}`, [NAME]);
    const studentId = family.studentIds[0] ?? '';

    // 1. Registered without a trial session time: the column default «جديد».
    expect(await studentStatusOf(studentId)).toBe('new');
    const admin = await asRole('admin');
    await expectChip(admin, { studentId, label: E.new });

    // 2. A trial lesson is booked → «بانتظار الحلقة التجريبية».
    const lessonId = await bookTrial(admin, { teacherId, studentId });
    await expect.poll(() => studentStatusOf(studentId)).toBe('trial');
    await expectChip(admin, { studentId, label: E.trial });

    // 3. The trial is attended (the teacher's «حضر») → «بانتظار الاشتراك».
    await startNow(lessonId);
    expect(await completeLesson(admin, lessonId)).toBe(200);
    await expect.poll(() => studentStatusOf(studentId)).toBe('pending_subscription');
    await expectChip(admin, { studentId, label: E.pending_subscription });

    // 4. A positive payment on a package → «مشترك».
    const pkg = await unpaidPackage(studentId);
    expect(await recordPayment(admin, pkg)).toBe(201);
    await expect.poll(() => studentStatusOf(studentId)).toBe('active');
    await expectChip(admin, { studentId, label: E.active });

    // One audited compare-and-set per move, with its reason (docs/18 transitions 2, 3a, 4).
    expect(await statusTrail(studentId)).toEqual([
      { from: 'new', to: 'trial', reason: 'trial_booked' },
      { from: 'trial', to: 'pending_subscription', reason: 'trial_attended' },
      { from: 'pending_subscription', to: 'active', reason: 'payment' },
    ]);
  });
});
