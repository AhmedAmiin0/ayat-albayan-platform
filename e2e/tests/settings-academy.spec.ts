import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { fillStable } from '../support/fill';
import { setSetting } from '../support/messages';
import { restoreSettings, settingText, snapshotSettings } from '../support/settings';

// «القيم» /admin/settings/values (R-SCH-07, R-SUB-02, R-REP-02, docs/26b §2): each row saves on its
// own with its row «حفظ» (PATCH /config/entries/:key with the row's version, 26-P3); a value out of
// bounds is refused inline and nothing is written. The follow-up hours (R-LEAD-05) moved to «التواصل»
// (/admin/settings/communications, the «مواعيد الرسائل» tab), whose timing form keeps its page «حفظ»:
// the API's own schema still rejects a non-ascending list there. Everything written is put back.
// The spec reads only roles and labels, never request URLs, so the save route can change under it.

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
    // Desktop: the row's own box and «حفظ: الاسم». Phones (Pixel 7): the row's value button opens a
    // bottom sheet named by the label, with the box and «احفظ»; the sheet closes once the save lands.
    const phone = test.info().project.name === 'mobile';
    const sheet = (label: string) => admin.getByRole('dialog', { name: label, exact: true });
    const open = async (label: string) => {
      if (!phone) return admin;
      await admin.getByRole('button', { name: v.sheet.edit.replace('{name}', label) }).click();
      await expect(sheet(label)).toBeVisible();
      return sheet(label);
    };
    const field = (scope: Page | Locator, label: string) => scope.getByLabel(label, { exact: true });
    const saveRow = (scope: Page | Locator, label: string) =>
      phone ? scope.getByRole('button', { name: v.sheet.save, exact: true }) : scope.getByRole('button', { name: `${ar.common.save}: ${label}`, exact: true });
    const saveValue = async (label: string, value: string) => {
      const scope = await open(label);
      await fillStable(field(scope, label), value);
      await saveRow(scope, label).click();
      if (phone) await expect(sheet(label)).toBeHidden();
    };

    await admin.goto('/admin/settings/values?group=schedule');
    const horizon = ar.settings.bookingHorizonWeeks;
    const box = await open(horizon);
    await expect(field(box, horizon)).toHaveValue('5');
    // Out of bounds (1–12): the line under the box, «حفظ» does nothing, nothing is written.
    await fillStable(field(box, horizon), '40');
    await expect(box.getByText(v.invalidRange.replace('{min}', '1').replace('{max}', '12'))).toBeVisible();
    if (phone) await saveRow(box, horizon).click();
    else await expect(saveRow(box, horizon)).toHaveAttribute('aria-disabled', 'true');
    expect(await settingText('booking_horizon_weeks')).toBe('5');
    await fillStable(field(box, horizon), '8');
    await saveRow(box, horizon).click();
    await expect(admin.getByText(v.saved, { exact: true })).toBeVisible();
    await expect.poll(() => settingText('booking_horizon_weeks')).toBe('8');
    if (phone) await expect(sheet(horizon)).toBeHidden();

    await admin.goto('/admin/settings/values?group=accounts');
    const renewal = ar.settings.renewalAlertRemaining;
    await saveValue(renewal, '3');
    await expect.poll(() => settingText('renewal_alert_remaining')).toBe('3');

    await admin.goto('/admin/settings/values?group=reports');
    const edit = ar.settings.reportTeacherEditHours;
    await saveValue(edit, '48');
    await expect.poll(() => settingText('report_teacher_edit_hours')).toBe('48');

    // The saved values survive a reload.
    await admin.goto('/admin/settings/values?group=schedule');
    await expect(field(await open(horizon), horizon)).toHaveValue('8');
    await admin.goto('/admin/settings/values?group=accounts');
    await expect(field(await open(renewal), renewal)).toHaveValue('3');
  });

  test('follow-up hours on «التواصل»: a non-ascending list is refused and nothing is written', async ({ asRole }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin/settings/communications?tab=timing');
    const hours = admin.getByLabel(ar.templates.settings.followUpHours, { exact: true });
    await expect(hours).toBeVisible();
    await fillStable(hours, '72، 24');
    await admin.getByRole('button', { name: ar.common.save, exact: true }).click();
    await expect(admin.getByText(ar.settings.notAscending)).toBeVisible();
    expect(await settingText('follow_up_hours')).toBe('[24, 72]');
  });
});
