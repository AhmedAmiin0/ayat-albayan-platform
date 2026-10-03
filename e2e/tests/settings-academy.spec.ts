import { ar, expect, test } from '../support/fixtures';
import { fillStable } from '../support/fill';
import { setSetting } from '../support/messages';
import { restoreSettings, settingText, snapshotSettings } from '../support/settings';

// /admin/settings academy form (R-SCH-07, R-SUB-02, R-REP-02, R-LEAD-05): one save writes the
// settings rows; the API's own schema rejects a non-ascending follow-up list. Everything the
// form writes (the whole PATCH) is put back afterwards.

const KEYS = [
  'late_cancel_hours', 'booking_horizon_weeks', 'renewal_alert_remaining', 'flag_future_lessons_when_unpaid',
  'report_teacher_edit_hours', 'reporting_currency', 'payout_count_late', 'payout_count_no_show',
  'follow_up_hours', 'reminder_minutes_before', 'reminder_24h_enabled',
];

test.describe('settings — academy fields', () => {
  let saved: Awaited<ReturnType<typeof snapshotSettings>> = [];
  test.beforeEach(async () => {
    saved = await snapshotSettings(KEYS);
    await setSetting('late_cancel_hours', 24); // ON, so the hours box is enabled
    await setSetting('follow_up_hours', [24, 72]);
  });
  test.afterEach(async () => {
    await restoreSettings({ keys: KEYS, rows: saved });
  });

  test('saving writes lateCancelHours, renewalAlertRemaining and reportTeacherEditHours; a non-ascending list is refused', async ({
    asRole,
  }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin/settings');
    const field = (label: string) => admin.getByLabel(label, { exact: true });
    await expect(field(ar.settings.lateCancelHours)).toHaveValue('24');

    await fillStable(field(ar.settings.lateCancelHours), '12');
    await fillStable(field(ar.settings.renewalAlertRemaining), '3');
    await fillStable(field(ar.settings.reportTeacherEditHours), '48');
    await admin.getByRole('button', { name: ar.common.save, exact: true }).click();
    await expect(admin.getByRole('status')).toHaveText(ar.settings.saved);
    expect(await settingText('late_cancel_hours')).toBe('12');
    expect(await settingText('renewal_alert_remaining')).toBe('3');
    expect(await settingText('report_teacher_edit_hours')).toBe('48');

    // Not ascending: the message names the rule and nothing is written.
    await fillStable(field(ar.templates.settings.followUpHours), '72، 24');
    await admin.getByRole('button', { name: ar.common.save, exact: true }).click();
    await expect(admin.getByText(ar.settings.notAscending)).toBeVisible();
    expect(await settingText('follow_up_hours')).toBe('[24, 72]');

    // The saved values survive a reload.
    await admin.reload();
    await expect(field(ar.settings.lateCancelHours)).toHaveValue('12');
    await expect(field(ar.settings.renewalAlertRemaining)).toHaveValue('3');
  });
});
