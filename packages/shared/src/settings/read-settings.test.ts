import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from './registry.js';
import { settingsChanges } from './schema.js';
import { readSettings } from './validate.js';

// Ported from apps/api/src/common/settings/settings.values.test.ts (the API re-export goes away).

describe('readSettings (migration 073 + 123 defaults)', () => {
  it('no rows → every default; Phase 3 defaults are the documented ones', () => {
    expect(readSettings([])).toEqual(SETTING_DEFAULTS);
    expect(SETTING_DEFAULTS).toMatchObject({
      renewal_alert_remaining: 2,
      flag_future_lessons_when_unpaid: true,
      report_teacher_edit_hours: 24,
      reporting_currency: 'SAR',
      payout_count_late: false,
      payout_count_no_show: false,
    });
  });

  it('valid stored values win', () => {
    const rows = [
      { key: 'late_cancel_hours', value: 6 },
      { key: 'renewal_alert_remaining', value: 0 },
      { key: 'flag_future_lessons_when_unpaid', value: false },
      { key: 'reporting_currency', value: 'EGP' },
      { key: 'payout_count_no_show', value: true },
    ];
    expect(readSettings(rows)).toEqual({
      ...SETTING_DEFAULTS,
      late_cancel_hours: 6,
      renewal_alert_remaining: 0,
      flag_future_lessons_when_unpaid: false,
      reporting_currency: 'EGP',
      payout_count_no_show: true,
    });
  });

  it.each([
    ['renewal_alert_remaining', 'two'],
    ['renewal_alert_remaining', 1.5],
    ['report_teacher_edit_hours', -1],
    ['flag_future_lessons_when_unpaid', 'yes'],
    ['reporting_currency', 'sar'],
    ['payout_count_late', 1],
    ['booking_horizon_weeks', 0],
  ])('malformed %s = %j reads as the default', (key, value) => {
    expect(readSettings([{ key, value }])).toEqual(SETTING_DEFAULTS);
  });

  it('unknown keys are ignored', () => {
    expect(readSettings([{ key: 'something_else', value: 1 }])).toEqual(SETTING_DEFAULTS);
  });
});

describe('settingsChanges (PATCH /settings)', () => {
  it('maps only the sent camelCase fields; null passes through (OFF)', () => {
    expect(settingsChanges({ lateCancelHours: null, reportTeacherEditHours: 48 })).toEqual({
      late_cancel_hours: null,
      report_teacher_edit_hours: 48,
    });
    expect(settingsChanges({})).toEqual({});
  });
});
