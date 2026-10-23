import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { boundsText, defaultNote, defaultText, valueText } from './value-format';
import { countText, unitWord } from './value-units';

const v = t.settingsValues;

describe('value words', () => {
  it('counts with the unit in the right form', () => {
    expect(countText('fx_fresh_hours', 1)).toBe(v.units.hours.one);
    expect(countText('fx_fresh_hours', 2)).toBe(v.units.hours.two);
    expect(countText('booking_horizon_weeks', 5)).toBe(v.units.weeks.few.replace('{n}', '5'));
    expect(countText('booking_horizon_weeks', 11)).toBe(v.units.weeks.other.replace('{n}', '11'));
    expect(unitWord('upload_max_mb')).toBe(v.units.mb.unit);
    expect(unitWord('reporting_currency')).toBeUndefined();
  });

  it('writes each type as text', () => {
    expect(valueText('teachers_always_available', true)).toBe(v.on);
    expect(valueText('late_cancel_hours', null)).toBe(v.off);
    expect(valueText('reporting_currency', 'SAR')).toBe('SAR');
    expect(valueText('feedback_mode', 'link')).toBe(t.templates.settings.feedbackModeLink);
    expect(valueText('academy_contact', { site: 'a.org', email: 'x@a.org' })).toBe('a.org · x@a.org');
    expect(valueText('recording_consent_notice', null)).toBe(t.common.unset);
    expect(valueText('follow_up_hours', [24, 72])).toBe(`24${t.common.listSeparator}72 ${v.units.hours.unit}`);
  });

  it('gives the bounds and the default notes', () => {
    expect(boundsText('booking_horizon_weeks')).toBe(v.bounds.replace('{min}', '1').replace('{max}', '12'));
    expect(boundsText('default_meeting_title')).toBe(v.lengthBounds.replace('{min}', '1').replace('{max}', '60'));
    expect(boundsText('reporting_currency')).toBeUndefined();
    expect(defaultText('booking_horizon_weeks')).toBe(countText('booking_horizon_weeks', 5));
    expect(defaultNote('late_cancel_hours')).toContain(v.onValue.replace('{value}', '24'));
  });
});
