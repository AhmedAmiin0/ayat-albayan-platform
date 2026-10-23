import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { defaultForm, isModified, rowForm, rowUpdate } from './row-form';

const S = { ...SETTING_DEFAULTS };

describe('rowForm', () => {
  it('turns each kind of value into its editor fields', () => {
    expect(rowForm('booking_horizon_weeks', 5)).toEqual({ bookingHorizonWeeks: '5' });
    expect(rowForm('teachers_always_available', true)).toEqual({ teachersAlwaysAvailable: true });
    expect(rowForm('late_cancel_hours', null)).toEqual({ lateCancelHours: '24', lateCancelHoursOn: false });
    expect(rowForm('late_cancel_hours', 12)).toEqual({ lateCancelHours: '12', lateCancelHoursOn: true });
    expect(rowForm('academy_contact', { site: 'a.org' })).toEqual({ 'academyContact.site': 'a.org', 'academyContact.email': '' });
    expect(rowForm('feedback_mode', 'link')).toEqual({ feedbackMode: 'link' });
  });

  it('the default form is the default value’s fields', () => {
    expect(defaultForm('sales_auto_assign')).toEqual({ salesAutoAssign: true });
  });
});

describe('isModified', () => {
  it('compares the stored value with the default', () => {
    expect(isModified('booking_horizon_weeks', S)).toBe(false);
    expect(isModified('booking_horizon_weeks', { ...S, booking_horizon_weeks: 4 })).toBe(true);
    expect(isModified('feedback_mode', { ...S, feedback_mode: 'link' })).toBe(true);
    expect(isModified('academy_contact', { ...S, academy_contact: { site: 'ayatalbayan.com' } })).toBe(false);
  });
});

describe('rowUpdate', () => {
  it('sends only the one camelCase field', () => {
    expect(rowUpdate('booking_horizon_weeks', { bookingHorizonWeeks: '8' })).toEqual({ ok: true, body: { bookingHorizonWeeks: 8 }, value: 8 });
    expect(rowUpdate('late_cancel_hours', { lateCancelHours: '12', lateCancelHoursOn: false })).toMatchObject({
      ok: true,
      body: { lateCancelHours: null },
    });
    expect(rowUpdate('sales_auto_assign', { salesAutoAssign: false })).toMatchObject({ ok: true, body: { salesAutoAssign: false } });
  });

  it('normalises a local phone to E.164', () => {
    expect(rowUpdate('academy_whatsapp_e164', { academyWhatsappE164: '+966 50 000 0000' })).toMatchObject({
      ok: true,
      body: { academyWhatsappE164: '+966500000000' },
    });
  });

  it('names the bounds of a refused number, and the other kinds’ messages', () => {
    expect(rowUpdate('booking_horizon_weeks', { bookingHorizonWeeks: '13' })).toEqual({
      ok: false,
      error: t.settingsValues.invalidRange.replace('{min}', '1').replace('{max}', '12'),
    });
    expect(rowUpdate('booking_horizon_weeks', { bookingHorizonWeeks: '' })).toMatchObject({ ok: false });
    expect(rowUpdate('academy_whatsapp_e164', { academyWhatsappE164: '12' })).toEqual({ ok: false, error: t.settings.invalidPhone });
    expect(rowUpdate('default_meeting_title', { defaultMeetingTitle: ' ' })).toMatchObject({ ok: false });
    expect(rowUpdate('academy_contact', { 'academyContact.site': 'not a host', 'academyContact.email': '' })).toEqual({
      ok: false,
      error: t.settings.invalidText,
    });
  });

  it('refuses a key PATCH /settings never writes', () => {
    expect(rowUpdate('comms_source', { commsSource: 'module' })).toMatchObject({ ok: false });
  });
});
