import { ESSENTIAL_OFF_TEXT, notificationEntry, RULE_SETTING_KEYS, SETTING_DEFAULTS, type NotificationKey, type NotificationRuleRow, type RulePatchInput, type RuleSettings, type RulesMode } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { planPatch } from './rules.patch';
import type { RulesSnapshot } from './store/rules.reader';

const SETTINGS = Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])) as RuleSettings;

function snap(mode: RulesMode = 'legacy', rows: Partial<NotificationRuleRow>[] = [], settings: Partial<RuleSettings> = {}): RulesSnapshot {
  const map = new Map<string, NotificationRuleRow>();
  for (const r of rows) {
    const key = r.key ?? '';
    map.set(key, { key, enabled: true, channels: null, timing: null, number_id: null, updated_at: '2026-10-24T00:00:00Z', updated_by: null, ...r });
  }
  return { mode, rows: map, settings: { ...SETTINGS, ...settings } };
}

const plan = (key: NotificationKey, patch: RulePatchInput, snapshot = snap()) => planPatch({ entry: notificationEntry(key), snapshot, patch });
const code = (fn: () => unknown): unknown => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as { getStatus: () => number; getResponse: () => { code: string } }).getResponse().code;
  }
};

describe('planPatch (docs/23b decision 4)', () => {
  it('manual rows are not editable; a locked row cannot go off (its other fields can change)', () => {
    expect(code(() => plan('inbox_templates', { enabled: true }))).toBe('not_editable');
    expect(code(() => plan('reminder_failed', { enabled: false }))).toBe('locked');
    expect(plan('reminder_failed', { channels: ['bell'] }).row).toMatchObject({ enabled: true, channels: ['bell'] });
  });

  it('channels: a subset keeping the first, in the entry’s order', () => {
    expect(plan('new_lead', { channels: ['push', 'bell'] }).row.channels).toEqual(['bell', 'push']);
    expect(code(() => plan('new_lead', { channels: ['push'] }))).toBe('invalid');
    expect(code(() => plan('report_ready', { channels: ['whatsapp', 'push'] }))).toBe('invalid');
  });

  it('timing: the key’s own schema; null = the default; none on a non-timed row', () => {
    expect(plan('lesson_reminder_24h', { timing: { send_at_local: '20:00' } }).row.timing).toEqual({ send_at_local: '20:00' });
    expect(plan('teacher_lesson_reminder', { timing: { minutes_before: null } }).row.timing).toEqual({ minutes_before: null });
    expect(plan('lesson_reminder', { timing: null }).row.timing).toBeNull();
    expect(code(() => plan('lesson_reminder', { timing: { minutes_before: 721 } }))).toBe('invalid');
    expect(code(() => plan('lesson_reminder', { timing: { minutes_before: 30, extra: 1 } }))).toBe('invalid');
    expect(code(() => plan('report_ready', { timing: { minutes_before: 30 } }))).toBe('invalid');
  });

  it('a number only on a WhatsApp row', () => {
    const id = 'b0000000-0000-4000-8000-000000000001';
    expect(plan('report_ready', { number_id: id }).row.number_id).toBe(id);
    expect(code(() => plan('new_lead', { number_id: id }))).toBe('invalid');
  });

  it('an essential ON → OFF needs the exact word (trimmed); OFF → OFF and ON do not', () => {
    expect(code(() => plan('report_ready', { enabled: false }))).toBe('confirmation_required');
    expect(code(() => plan('report_ready', { enabled: false, confirmText: 'ايقاف' }))).toBe('confirmation_required');
    expect(plan('report_ready', { enabled: false, confirmText: `  ${ESSENTIAL_OFF_TEXT}\n` }).essentialOff).toBe(true);
    const off = snap('module', [{ key: 'report_ready', enabled: false }]);
    expect(plan('report_ready', { enabled: false }, off).essentialOff).toBe(false);
    expect(plan('report_ready', { enabled: true }, off).essentialOff).toBe(false);
    expect(plan('lesson_reminder', { enabled: false }).essentialOff).toBe(false);
  });

  it('unspecified fields keep the current effective values', () => {
    const p = plan('follow_up_slots', { enabled: true }, snap('legacy', [], { follow_up_hours: [6, 30] }));
    expect(p.row).toEqual({ key: 'follow_up_slots', enabled: true, channels: ['whatsapp'], timing: { hours: [6, 30], slots_from_hours: 12, slots_to_days: 7 }, number_id: null });
  });

  it('legacy mode: the mirrored legacy keys; module mode: none', () => {
    expect(plan('lesson_rating', { enabled: false }).legacy).toEqual({ feedback_mode: 'link' });
    expect(plan('lesson_reminder', { timing: { minutes_before: 45 } }).legacy).toEqual({ reminder_minutes_before: 45 });
    expect(plan('report_ready', { number_id: null }).legacy).toEqual({});
    expect(plan('lesson_rating', { enabled: false }, snap('module')).legacy).toEqual({});
  });

  it('after is the effective rule once written (legacy mode reads the mirrored keys)', () => {
    const p = plan('lesson_reminder_24h', { enabled: true });
    expect([p.before.enabled, p.after.enabled]).toEqual([false, true]);
    const m = plan('lesson_reminder', { timing: { minutes_before: 15 } }, snap('module'));
    expect(m.after.timing).toEqual({ minutes_before: 15 });
  });
});
