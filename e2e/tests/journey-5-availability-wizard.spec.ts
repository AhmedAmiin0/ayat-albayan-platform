import { ar, expect, test } from '../support/fixtures';
import { resetAbrar, seedFamily } from '../support/schedule';

// Journey 5 (docs/03 §5): the teacher sets availability → the booking wizard only offers those
// slots. R-TCH-02, R-SCH-08 (teacher self-service), R-SCH-06 (slot grid from real availability).

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

    // Next week is whole (this week's Wednesday may be gone): 45-minute starts inside 16:00–18:00.
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    const slots = step.getByRole('group', { name: ar.booking.freeSlots }).getByRole('button');
    await expect(slots).toHaveCount(2);
    await expect(slots.nth(0)).toContainText('16:00');
    await expect(slots.nth(1)).toContainText('16:45');
    const wednesday = step.getByRole('region', { name: new RegExp(`^${WEDNESDAY} `) });
    await expect(wednesday.getByRole('button')).toHaveCount(2);

    // Picking one moves on: the first lesson is that Wednesday at 16:00 Riyadh.
    await slots.nth(0).click();
    await expect(step.getByRole('status')).toContainText(`${WEDNESDAY}`);
    await expect(step.getByRole('status')).toContainText('16:00');
    await expect(admin.getByRole('button', { name: ar.booking.next })).toBeEnabled();
  });
});
