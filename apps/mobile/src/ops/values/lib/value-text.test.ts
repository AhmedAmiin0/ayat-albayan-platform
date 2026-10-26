import { EDITABLE_VALUE_KEYS, OWNED_VALUE_GROUPS, type SettingKey } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { GROUP_IDS, groupKeys, groupLabel } from './value-groups';
import { boundsOf, hintOf, impactOf, labelOf, optionLabel, textAt, valueText } from './value-text';

test('textAt reads a dotted path, undefined when missing', () => {
  expect(textAt('settings.bookingHorizonWeeks')).toBe(t.settings.bookingHorizonWeeks);
  expect(textAt('settings.nope')).toBeUndefined();
  expect(textAt('settings')).toBeUndefined();
});

test('every row has a real label (never its key)', () => {
  const keys: SettingKey[] = [...EDITABLE_VALUE_KEYS, ...Object.values(OWNED_VALUE_GROUPS).flat()];
  for (const key of keys) expect(labelOf(key)).not.toBe(key);
});

test('impactOf: the switch hint first, else the hint (as the web confirmation)', () => {
  expect(impactOf('recording_retention_days')).toBe(t.config.recordingRetentionHint);
  expect(impactOf('activity_retention_days')).toBe(t.config.activityRetentionDaysHint);
  expect(impactOf('teachers_always_available')).toBe(t.settings.hints.teachersAlwaysAvailable);
});

test('hintOf: the hint, or the switch hint of a number that can be off', () => {
  expect(hintOf('booking_horizon_weeks')).toBe(t.settings.hints.bookingHorizonWeeks);
  expect(hintOf('late_cancel_hours')).toBe(t.settings.lateCancelHint);
});

test('valueText: digits, on/off, lists, objects, options', () => {
  const m = t.mobileAdmin.settings;
  expect(valueText('booking_horizon_weeks', 5)).toBe('5');
  expect(valueText('late_cancel_hours', null)).toBe(m.off);
  expect(valueText('meeting_link_auto', true)).toBe(m.on);
  expect(valueText('follow_up_hours', [24, 72])).toBe(`24${t.common.listSeparator}72`);
  expect(valueText('academy_contact', { site: 'a.com', email: 'x@a.com' })).toBe('a.com · x@a.com');
  expect(valueText('recording_consent_notice', null)).toBe(t.mobileValues.empty);
  expect(valueText('feedback_mode', 'buttons')).toBe(optionLabel('feedback_mode', 'buttons'));
  expect(valueText('reporting_currency', 'SAR')).toBe('SAR');
});

test('optionLabel: enum words from i18n, zones with their city', () => {
  expect(optionLabel('feedback_mode', 'link')).not.toBe('link');
  expect(optionLabel('academy_timezone', 'Africa/Cairo')).toContain('Africa/Cairo');
  expect(optionLabel('feedback_mode', 'other')).toBe('other');
});

test('boundsOf: numbers only', () => {
  expect(boundsOf('booking_horizon_weeks')).toMatch(/\d/);
  expect(boundsOf('meeting_link_auto')).toBeUndefined();
});

test('groups: every chip has a name and keys; owned groups come last', () => {
  for (const id of GROUP_IDS) {
    expect(groupLabel(id)).not.toBe(id);
    expect(groupKeys(id).length).toBeGreaterThan(0);
  }
  expect(GROUP_IDS.slice(-2)).toEqual(['notifications', 'sending']);
});
