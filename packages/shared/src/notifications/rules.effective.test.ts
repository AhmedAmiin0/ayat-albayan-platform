import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from '@ab/settings';
import { notificationEntry } from './catalogue/catalogue.js';
import { resolveRule, validTiming } from './rules.effective.js';
import { RULE_SETTING_KEYS, type RuleSettings } from './rules.legacy.js';

const settings = (over: Partial<RuleSettings> = {}): RuleSettings =>
  ({ ...Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])), ...over }) as RuleSettings;
const row = (over: Partial<{ enabled: boolean; channels: string[] | null; timing: unknown; number_id: string | null }>) => ({
  enabled: true,
  channels: null,
  timing: null,
  number_id: null,
  ...over,
});

describe('resolveRule: legacy mode keeps today’s behaviour', () => {
  it('no row: the legacy keys and the entry defaults', () => {
    const r = resolveRule(notificationEntry('lesson_reminder'), { mode: 'legacy', row: null, settings: settings() });
    expect(r).toEqual({ enabled: true, channels: ['whatsapp'], timing: { minutes_before: 60 }, number_id: null });
    expect(resolveRule(notificationEntry('lesson_reminder_24h'), { mode: 'legacy', row: null, settings: settings() }).enabled).toBe(false);
  });

  it('the legacy key wins over a row on the mapped parts', () => {
    const input = { mode: 'legacy' as const, row: row({ enabled: true, timing: { minutes_before: 30 } }), settings: settings({ reminder_minutes_before: 90 }) };
    expect(resolveRule(notificationEntry('lesson_reminder'), input).timing).toEqual({ minutes_before: 90 });
    const rating = { mode: 'legacy' as const, row: row({ enabled: true }), settings: settings({ feedback_mode: 'link' }) };
    expect(resolveRule(notificationEntry('lesson_rating'), rating).enabled).toBe(false);
  });

  it('the row decides what has no legacy key (day-before hour, booking confirmation)', () => {
    const day = { mode: 'legacy' as const, row: row({ timing: { send_at_local: '20:00' } }), settings: settings() };
    expect(resolveRule(notificationEntry('lesson_reminder_24h'), day).timing).toEqual({ send_at_local: '20:00' });
    const booking = { mode: 'legacy' as const, row: row({ enabled: false }), settings: settings() };
    expect(resolveRule(notificationEntry('booking_confirmation'), booking).enabled).toBe(false);
  });
});

describe('resolveRule: module mode', () => {
  it('the row decides; a malformed timing falls back to the legacy key', () => {
    const input = { mode: 'module' as const, row: row({ timing: { minutes_before: 30 } }), settings: settings({ reminder_minutes_before: 90 }) };
    expect(resolveRule(notificationEntry('lesson_reminder'), input).timing).toEqual({ minutes_before: 30 });
    const bad = { ...input, row: row({ timing: { minutes_before: 'x' } }) };
    expect(resolveRule(notificationEntry('lesson_reminder'), bad).timing).toEqual({ minutes_before: 90 });
  });

  it('locked and manual rows stay on; channels must keep the first channel', () => {
    const off = { mode: 'module' as const, row: row({ enabled: false, channels: ['push'] }), settings: settings() };
    const failed = resolveRule(notificationEntry('reminder_failed'), off);
    expect(failed.enabled).toBe(true);
    expect(failed.channels).toEqual(['bell', 'push']);
    const bellOnly = { ...off, row: row({ channels: ['bell'] }) };
    expect(resolveRule(notificationEntry('new_lead'), bellOnly).channels).toEqual(['bell']);
  });
});

describe('validTiming', () => {
  it('accepts each kind’s schema only', () => {
    expect(validTiming('follow_up_slots', { hours: [24, 72], slots_from_hours: 12, slots_to_days: 7 })).not.toBeNull();
    expect(validTiming('follow_up_slots', { hours: [72, 24], slots_from_hours: 12, slots_to_days: 7 })).toBeNull();
    expect(validTiming('lesson_reminder_24h', { send_at_local: '20:30' })).toBeNull();
    expect(validTiming('report_ready', { minutes_before: 10 })).toBeNull();
    expect(validTiming('lesson_reminder', { minutes_before: 60, extra: 1 })).toBeNull();
  });
});
