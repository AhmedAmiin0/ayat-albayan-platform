import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fieldIds, isDefault, isDirty, resetPatch } from './settings-dirty';
import { settingsForm } from './settings-form';

const saved = settingsForm({ ...SETTING_DEFAULTS, activity_retention_days: 30 });

describe('settings form: dirty tracking and reset-to-default', () => {
  it('nothing is dirty until a field changes, and changing it back clears it', () => {
    expect(isDirty('booking_horizon_weeks', saved, saved)).toBe(false);
    const edited = { ...saved, bookingHorizonWeeks: '8' };
    expect(isDirty('booking_horizon_weeks', edited, saved)).toBe(true);
    expect(isDirty('booking_horizon_weeks', { ...edited, bookingHorizonWeeks: '5' }, saved)).toBe(false);
    expect(isDirty('reporting_currency', edited, saved)).toBe(false);
  });

  it('a switched-off number ignores its leftover text; switching it on is a change', () => {
    expect(isDirty('late_cancel_hours', { ...saved, lateCancelHours: '99' }, saved)).toBe(false);
    expect(isDirty('late_cancel_hours', { ...saved, lateCancelHoursOn: true }, saved)).toBe(true);
    expect(isDirty('recording_retention_days', { ...saved, recordingRetentionDaysOn: true }, saved)).toBe(true);
  });

  it('knows which fields stand behind a setting', () => {
    expect(fieldIds('booking_horizon_weeks')).toEqual(['bookingHorizonWeeks']);
    expect(fieldIds('late_cancel_hours')).toEqual(['lateCancelHours', 'lateCancelHoursOn']);
    expect(fieldIds('academy_contact')).toEqual(['academyContact.site', 'academyContact.email']);
  });

  it('a value is at its default or not; reset puts every field back, switch and boxes included', () => {
    expect(isDefault('activity_retention_days', saved)).toBe(false);
    const back = { ...saved, ...resetPatch('activity_retention_days') };
    expect(back.activityRetentionDays).toBe('180');
    expect(isDefault('activity_retention_days', back)).toBe(true);
    const late = { ...saved, lateCancelHoursOn: true, lateCancelHours: '6' };
    expect(isDefault('late_cancel_hours', late)).toBe(false);
    expect(isDefault('late_cancel_hours', { ...late, ...resetPatch('late_cancel_hours') })).toBe(true);
    expect(resetPatch('academy_contact')).toEqual({
      'academyContact.site': 'ayatalbayan.com',
      'academyContact.email': '',
    });
  });
});
