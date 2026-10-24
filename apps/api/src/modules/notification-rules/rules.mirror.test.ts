import { RULE_SETTING_KEYS, SETTING_DEFAULTS, type NotificationRuleRow, type RuleSettings } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { canonical, moduleLegacyValues, ruleDifferences } from './rules.mirror';

const SETTINGS = Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])) as RuleSettings;

const rowsOf = (rows: Partial<NotificationRuleRow>[]) =>
  new Map(rows.map((r) => [r.key ?? '', { key: r.key ?? '', enabled: true, channels: null, timing: null, number_id: null, updated_at: 'x', updated_by: null, ...r }]));

/** What migration 631 copies from these settings (the 6 mapped rows). */
const copied = (s: RuleSettings) =>
  rowsOf([
    { key: 'lesson_reminder', timing: { minutes_before: s.reminder_minutes_before } },
    { key: 'lesson_reminder_24h', enabled: s.reminder_24h_enabled },
    { key: 'teacher_lesson_reminder', enabled: s.teacher_whatsapp_lesson_reminder },
    { key: 'teacher_new_student', enabled: s.teacher_whatsapp_new_student },
    { key: 'follow_up_slots', timing: { slots_to_days: s.follow_up_slots_to_days, hours: s.follow_up_hours, slots_from_hours: s.follow_up_slots_from_hours } },
    { key: 'lesson_rating', enabled: s.feedback_mode === 'buttons' },
  ]);

describe('rules ↔ legacy keys mirror', () => {
  it('canonical sorts object keys (equal timings compare equal)', () => {
    expect(canonical({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(canonical(undefined)).toBe('null');
  });

  it('no rows, or the rows as migration 631 copies them: parity is empty', () => {
    expect(ruleDifferences({ rows: rowsOf([]), settings: SETTINGS })).toEqual([]);
    const s: RuleSettings = { ...SETTINGS, reminder_minutes_before: 45, reminder_24h_enabled: true, feedback_mode: 'link', follow_up_hours: [6] };
    expect(ruleDifferences({ rows: copied(s), settings: s })).toEqual([]);
  });

  it('lists each mapped part that differs, JSON-encoded', () => {
    const rows = rowsOf([
      { key: 'lesson_reminder', timing: { minutes_before: 30 } },
      { key: 'lesson_rating', enabled: false },
      // Not mapped: never a difference.
      { key: 'report_ready', enabled: false },
    ]);
    expect(ruleDifferences({ rows, settings: SETTINGS })).toEqual([
      { key: 'lesson_reminder', field: 'timing', legacy: '{"minutes_before":60}', module: '{"minutes_before":30}' },
      { key: 'lesson_rating', field: 'enabled', legacy: 'true', module: 'false' },
    ]);
  });

  it('a malformed stored timing falls back to legacy (no difference)', () => {
    expect(ruleDifferences({ rows: rowsOf([{ key: 'lesson_reminder', timing: { minutes_before: 'x' } }]), settings: SETTINGS })).toEqual([]);
  });

  it('moduleLegacyValues: every mapped key as the module path says it, only RULE_SETTING_KEYS', () => {
    const rows = rowsOf([
      { key: 'lesson_reminder', timing: { minutes_before: 30 } },
      { key: 'lesson_rating', enabled: false },
      { key: 'follow_up_slots', timing: { hours: [12], slots_from_hours: 2, slots_to_days: 3 } },
    ]);
    const values = moduleLegacyValues({ rows, settings: SETTINGS });
    expect(values).toEqual({
      reminder_minutes_before: 30,
      reminder_24h_enabled: false,
      teacher_whatsapp_lesson_reminder: true,
      teacher_whatsapp_new_student: true,
      follow_up_hours: [12],
      follow_up_slots_from_hours: 2,
      follow_up_slots_to_days: 3,
      feedback_mode: 'link',
    });
    expect(Object.keys(values).sort()).toEqual([...RULE_SETTING_KEYS].sort());
  });
});
