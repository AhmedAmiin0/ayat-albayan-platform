import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { SETTINGS } from './settings-fixture';
import { settingsForm, settingsUpdate } from './settings-form';

describe('settings form (docs/10, docs/11, docs/12 §2)', () => {
  it('round-trips the defaults: late cancel OFF is null, follow-ups as «24، 72»', () => {
    const form = settingsForm(SETTINGS);
    expect(form.lateCancelOn).toBe(false);
    expect(form.followUpHours).toBe('24، 72');
    expect(settingsUpdate(form)).toEqual({
      ok: true,
      value: {
        lateCancelHours: null,
        bookingHorizonWeeks: 5,
        renewalAlertRemaining: 2,
        flagFutureLessonsWhenUnpaid: true,
        reportTeacherEditHours: 24,
        reportingCurrency: 'SAR',
        payoutCountLate: false,
        payoutCountNoShow: false,
        reminderMinutesBefore: 60,
        reminder24hEnabled: false,
        followUpHours: [24, 72],
      },
    });
  });

  it('late cancel ON sends its hours; Latin commas and spaces split follow-up hours too', () => {
    const form = { ...settingsForm(SETTINGS), lateCancelOn: true, lateCancelHours: '12', followUpHours: '12, 48 96' };
    const result = settingsUpdate(form);
    expect(result.ok && result.value.lateCancelHours).toBe(12);
    expect(result.ok && result.value.followUpHours).toEqual([12, 48, 96]);
  });

  it('a blank or out-of-range number is refused in words, never sent as 0', () => {
    const form = { ...settingsForm(SETTINGS), bookingHorizonWeeks: '', reminderMinutesBefore: '2', renewalAlertRemaining: '1.5' };
    expect(settingsUpdate(form)).toEqual({
      ok: false,
      errors: {
        bookingHorizonWeeks: t.settings.invalid,
        reminderMinutesBefore: t.settings.invalid,
        renewalAlertRemaining: t.settings.invalid,
      },
    });
  });

  it('follow-up hours must go up', () => {
    const result = settingsUpdate({ ...settingsForm(SETTINGS), followUpHours: '72، 24' });
    expect(result).toEqual({ ok: false, errors: { followUpHours: t.settings.notAscending } });
    expect(settingsUpdate({ ...settingsForm(SETTINGS), followUpHours: '' }).ok).toBe(false);
  });
});
