import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { FORM_KEYS, settingsForm, settingsUpdate } from './settings-form';

describe('settings form (generated from the settings registry)', () => {
  it('round-trips the defaults: late cancel OFF is null, follow-ups as «24، 72», the new keys too', () => {
    const form = settingsForm(SETTINGS);
    expect(form['lateCancelHoursOn']).toBe(false);
    expect(form['followUpHours']).toBe('24، 72');
    const result = settingsUpdate(form);
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        lateCancelHours: null,
        bookingHorizonWeeks: 5,
        reportingCurrency: 'SAR',
        followUpHours: [24, 72],
        joinOpensBeforeMin: 15,
        joinClosesAfterMin: 120,
        uploadMaxMb: 10,
        academyWhatsappE164: '+966566101447',
        academyTimezone: 'Asia/Riyadh',
        defaultMeetingTitle: 'اجتماع',
        meetingLinkAuto: false,
      }),
    });
  });

  it('never sends the switches that save on their own', () => {
    const result = settingsUpdate(settingsForm(SETTINGS));
    expect(result.ok && Object.keys(result.value)).not.toContain('messagingEnabled');
    expect(FORM_KEYS).not.toContain('feedback_mode');
    expect(FORM_KEYS).toContain('join_opens_before_min');
  });

  it('late cancel ON sends its hours; Latin commas and spaces split follow-up hours too', () => {
    const form = { ...settingsForm(SETTINGS), lateCancelHoursOn: true, lateCancelHours: '12', followUpHours: '12, 48 96' };
    const result = settingsUpdate(form);
    expect(result.ok && result.value.lateCancelHours).toBe(12);
    expect(result.ok && result.value.followUpHours).toEqual([12, 48, 96]);
  });

  it('a blank or out-of-range number is refused in words, never sent as 0', () => {
    const form = { ...settingsForm(SETTINGS), bookingHorizonWeeks: '', reminderMinutesBefore: '2', joinOpensBeforeMin: '181' };
    expect(settingsUpdate(form)).toEqual({
      ok: false,
      errors: {
        bookingHorizonWeeks: t.settings.invalid,
        reminderMinutesBefore: t.settings.invalid,
        joinOpensBeforeMin: t.settings.invalid,
      },
    });
  });

  it('a typed local phone becomes E.164; a bad one is refused with the phone message', () => {
    const ok = settingsUpdate({ ...settingsForm(SETTINGS), academyWhatsappE164: '+966 50 123 4567' });
    expect(ok.ok && ok.value.academyWhatsappE164).toBe('+966501234567');
    const bad = settingsUpdate({ ...settingsForm(SETTINGS), academyWhatsappE164: '12' });
    expect(bad).toEqual({ ok: false, errors: { academyWhatsappE164: t.settings.invalidPhone } });
  });

  it('a blank meeting title is refused; follow-up hours must go up', () => {
    expect(settingsUpdate({ ...settingsForm(SETTINGS), defaultMeetingTitle: '  ' })).toEqual({
      ok: false,
      errors: { defaultMeetingTitle: t.settings.invalidText },
    });
    const result = settingsUpdate({ ...settingsForm(SETTINGS), followUpHours: '72، 24' });
    expect(result).toEqual({ ok: false, errors: { followUpHours: t.settings.notAscending } });
  });

  it('a stored value shows as stored', () => {
    const form = settingsForm({ ...SETTING_DEFAULTS, late_cancel_hours: 6, join_closes_after_min: 30 });
    expect([form['lateCancelHoursOn'], form['lateCancelHours'], form['joinClosesAfterMin']]).toEqual([true, '6', '30']);
  });
});
