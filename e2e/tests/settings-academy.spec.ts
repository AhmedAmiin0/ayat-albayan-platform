import { ar, expect, test } from '../support/fixtures';
import { fillStable } from '../support/fill';
import { setSetting } from '../support/messages';
import { restoreSettings, settingText, snapshotSettings } from '../support/settings';

// «القيم» /admin/settings/values (R-SCH-07, R-SUB-02, R-REP-02, docs/26b §2): each row saves on its
// own with its row «حفظ» (PATCH /settings with that one key); a value out of bounds is refused
// inline and nothing is written. The follow-up hours (R-LEAD-05) moved to «التواصل»
// (/admin/settings/communications, the catalogue tab), whose timing form keeps its page «حفظ»:
// the API's own schema still rejects a non-ascending list there. Everything written is put back.
// The three values used here are among the seven fields PATCH /settings keeps after 26-P3.

const KEYS = ['booking_horizon_weeks', 'renewal_alert_remaining', 'report_teacher_edit_hours', 'follow_up_hours'];
const v = ar.settingsValues;

test.describe('settings — «القيم» rows and the follow-up hours', () => {
  let saved: Awaited<ReturnType<typeof snapshotSettings>> = [];
  test.beforeEach(async () => {
    saved = await snapshotSettings(KEYS);
    await setSetting('booking_horizon_weeks', 5);
    await setSetting('follow_up_hours', [24, 72]);
  });
  test.afterEach(async () => {
    await restoreSettings({ keys: KEYS, rows: saved });
  });

  test('each row saves alone; out of bounds is refused inline; the values survive a reload', async ({ asRole }) => {
    const admin = await asRole('admin');
    const field = (label: string) => admin.getByLabel(label, { exact: true });
    const saveRow = (label: string) => admin.getByRole('button', { name: `${ar.common.save}: ${label}`, exact: true });

    await admin.goto('/admin/settings/values?group=schedule');
    const horizon = ar.settings.bookingHorizonWeeks;
    await expect(field(horizon)).toHaveValue('5');
    // Out of bounds (1–12): the line under the box, «حفظ» does nothing, nothing is written.
    await fillStable(field(horizon), '40');
    await expect(admin.getByText(v.invalidRange.replace('{min}', '1').replace('{max}', '12'))).toBeVisible();
    await expect(saveRow(horizon)).toHaveAttribute('aria-disabled', 'true');
    expect(await settingText('booking_horizon_weeks')).toBe('5');
    await fillStable(field(horizon), '8');
    await saveRow(horizon).click();
    await expect(admin.getByText(v.saved, { exact: true })).toBeVisible();
    await expect.poll(() => settingText('booking_horizon_weeks')).toBe('8');

    await admin.goto('/admin/settings/values?group=accounts');
    const renewal = ar.settings.renewalAlertRemaining;
    await fillStable(field(renewal), '3');
    await saveRow(renewal).click();
    await expect.poll(() => settingText('renewal_alert_remaining')).toBe('3');

    await admin.goto('/admin/settings/values?group=reports');
    const edit = ar.settings.reportTeacherEditHours;
    await fillStable(field(edit), '48');
    await saveRow(edit).click();
    await expect.poll(() => settingText('report_teacher_edit_hours')).toBe('48');

    // The saved values survive a reload.
    await admin.goto('/admin/settings/values?group=schedule');
    await expect(field(horizon)).toHaveValue('8');
    await admin.goto('/admin/settings/values?group=accounts');
    await expect(field(renewal)).toHaveValue('3');
  });

  test('follow-up hours on «التواصل»: a non-ascending list is refused and nothing is written', async ({ asRole }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin/settings/communications?tab=catalogue');
    const hours = admin.getByLabel(ar.templates.settings.followUpHours, { exact: true });
    await expect(hours).toBeVisible();
    await fillStable(hours, '72، 24');
    await admin.getByRole('button', { name: ar.common.save, exact: true }).click();
    await expect(admin.getByText(ar.settings.notAscending)).toBeVisible();
    expect(await settingText('follow_up_hours')).toBe('[24, 72]');
  });
});
