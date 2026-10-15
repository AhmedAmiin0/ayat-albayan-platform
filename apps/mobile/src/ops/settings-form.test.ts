import { settings } from './fixtures';
import { isDirty, serverErrors, settingsForm, settingsUpdate } from './settings-form';
import { t } from '@/lib/i18n';

const saved = settingsForm(settings);

test('late cancel off shows the 24 h default; the lists read as «24، 72»', () => {
  expect(saved).toMatchObject({
    lateCancelOn: false,
    lateCancelHours: '24',
    followUpHours: `24${t.common.listSeparator}72`,
    reportingCurrency: 'SAR',
  });
});

test('dirty tracking: any changed text or switch, and back again', () => {
  expect(isDirty(saved, settingsForm(settings))).toBe(false);
  expect(isDirty({ ...saved, bookingHorizonWeeks: '6' }, saved)).toBe(true);
  expect(isDirty({ ...saved, lateCancelOn: true }, saved)).toBe(true);
  expect(isDirty({ ...saved, bookingHorizonWeeks: '5' }, saved)).toBe(false);
});

test('«أيام انتهاء الاشتراك» reads the saved days and PATCHes 1..90 only', () => {
  const days = settingsForm({ ...settings, subscription_expiry_days: 7 });
  expect(days.subscriptionExpiryDays).toBe('7');
  expect(settingsUpdate({ ...days, subscriptionExpiryDays: '١٤' }, days)).toEqual({ ok: true, value: { subscriptionExpiryDays: 14 } });
  const r = settingsUpdate({ ...days, subscriptionExpiryDays: '91' }, days);
  expect(r.ok ? null : r.errors.subscriptionExpiryDays).toBe(t.settings.invalid);
});

test('the PATCH carries only what changed', () => {
  const r = settingsUpdate({ ...saved, bookingHorizonWeeks: '8', reportingCurrency: 'egp' }, saved);
  expect(r).toEqual({ ok: true, value: { bookingHorizonWeeks: 8, reportingCurrency: 'EGP' } });
});

test('turning late cancel on sends its hours; off again sends null', () => {
  const on = settingsUpdate({ ...saved, lateCancelOn: true, lateCancelHours: '12' }, saved);
  expect(on).toEqual({ ok: true, value: { lateCancelHours: 12 } });
  const withOn = settingsForm({ ...settings, late_cancel_hours: 12 });
  expect(settingsUpdate({ ...withOn, lateCancelOn: false }, withOn)).toEqual({
    ok: true,
    value: { lateCancelHours: null },
  });
});

test('Arabic-Indic digits and «،» separators are accepted', () => {
  const r = settingsUpdate(
    { ...saved, renewalAlertRemaining: '٣', followUpHours: '١٢، ٤٨' },
    saved,
  );
  expect(r).toEqual({ ok: true, value: { renewalAlertRemaining: 3, followUpHours: [12, 48] } });
});

test('validation with the API schema: blank, out of range, not ascending, bad currency', () => {
  const bad = {
    ...saved,
    bookingHorizonWeeks: '',
    renewalAlertRemaining: '11',
    followUpHours: '72, 24',
    reportingCurrency: 'SA',
  };
  const r = settingsUpdate(bad, saved);
  if (r.ok) throw new Error('expected errors');
  expect(r.errors.bookingHorizonWeeks).toBe(t.settings.invalid);
  expect(r.errors.renewalAlertRemaining).toBe(t.settings.invalid);
  expect(r.errors.followUpHours).toBe(t.settings.notAscending);
  expect(r.errors.reportingCurrency).toBe(t.settings.invalid);
});

test('late cancel on with a blank box fails; off ignores the box', () => {
  expect(settingsUpdate({ ...saved, lateCancelOn: true, lateCancelHours: ' ' }, saved).ok).toBe(
    false,
  );
  expect(settingsUpdate({ ...saved, lateCancelHours: 'abc' }, saved)).toEqual({
    ok: true,
    value: {},
  });
});

test('the API’s 400 issues land on their fields; anything else is ignored', () => {
  const body = {
    message: 'validation_failed',
    issues: [
      { path: 'bookingHorizonWeeks', message: 'Too big' },
      { path: 'followUpHours', message: 'not_ascending' },
    ],
  };
  expect(serverErrors(body)).toEqual({
    bookingHorizonWeeks: t.settings.invalid,
    followUpHours: t.settings.notAscending,
  });
  expect(serverErrors(null)).toEqual({});
  expect(serverErrors({ issues: 'x' })).toEqual({});
});
