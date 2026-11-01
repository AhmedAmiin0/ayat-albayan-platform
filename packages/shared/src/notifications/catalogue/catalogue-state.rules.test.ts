import { describe, expect, it } from 'vitest';
import type { TemplateStatus, WaLine } from '@ab/catalog';
import { TEMPLATE_KEYS } from '../../messaging/templates/templates.js';
import { SETTING_DEFAULTS, type AcademySettings } from '@ab/settings';
import { catalogueViews, entryView, type CatalogueInputs } from './catalogue-state.js';
import { NOTIFICATION_CATALOGUE, notificationEntry, type NotificationKey } from './catalogue.js';
import { resolveRule } from '../rules.effective.js';
import type { EffectiveRule } from '../rules.types.js';

const approvedAll = new Map(TEMPLATE_KEYS.map((k) => [k, { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]));
const ALL_ON: AcademySettings = { ...SETTING_DEFAULTS, messaging_enabled: true, auto_messages_enabled: true };

/** Every row's effective rule for these stored rows (module mode). */
function rulesOf(rows: Record<string, Partial<EffectiveRule> & { enabled?: boolean; timing?: unknown }>, settings = ALL_ON) {
  return new Map<string, EffectiveRule>(
    NOTIFICATION_CATALOGUE.map((e) => {
      const r = rows[e.key];
      const row = r ? { enabled: r.enabled ?? true, channels: null, timing: r.timing ?? null, number_id: null } : null;
      return [e.key, resolveRule(e, { mode: 'module', row, settings })];
    }),
  );
}

const view = (key: NotificationKey, patch: Partial<CatalogueInputs> = {}) =>
  entryView(notificationEntry(key), { settings: ALL_ON, gateReason: null, templates: approvedAll, ...patch });

describe('entryView with the effective rules (docs/23b)', () => {
  it('a row the rules switch off is row_off, even where the legacy switch is on (WhatsApp and bell rows)', () => {
    const rules = rulesOf({ booking_confirmation: { enabled: false }, new_lead: { enabled: false } });
    expect(view('booking_confirmation', { rules })).toMatchObject({ state: 'off', blocker: 'row_off' });
    expect(view('new_lead', { rules })).toMatchObject({ state: 'off', blocker: 'row_off' });
    expect(view('new_lead')).toMatchObject({ state: 'on', blocker: null });
  });

  it('a locked row stays on whatever is stored', () => {
    expect(view('reminder_failed', { rules: rulesOf({ reminder_failed: { enabled: false } }) })).toMatchObject({ state: 'on', blocker: null });
  });

  it('the rules win over the legacy switch when given (24 h reminder on by its row)', () => {
    const settings = { ...ALL_ON, reminder_24h_enabled: false };
    expect(view('lesson_reminder_24h', { settings }).blocker).toBe('row_off');
    expect(view('lesson_reminder_24h', { settings, rules: rulesOf({ lesson_reminder_24h: { enabled: true } }, settings) }).blocker).toBeNull();
  });

  it('classroom_off holds only lesson_join_link, after row_off and before the template', () => {
    expect(view('lesson_join_link', { classroom: false }).blocker).toBe('classroom_off');
    expect(view('lesson_reminder', { classroom: false }).blocker).toBeNull();
    expect(view('lesson_join_link', { classroom: false, rules: rulesOf({ lesson_join_link: { enabled: false } }) }).blocker).toBe('row_off');
    expect(view('lesson_join_link', { classroom: false, templates: new Map() }).blocker).toBe('classroom_off');
    expect(view('lesson_join_link').blocker).toBeNull();
  });

  it('timing comes from the effective rules: families’ lead time, the teacher’s own, the follow-up hours', () => {
    const rules = rulesOf({
      lesson_reminder: { timing: { minutes_before: 30 } },
      teacher_lesson_reminder: { timing: { minutes_before: 90 } },
      follow_up_slots: { timing: { hours: [6, 48], slots_from_hours: 12, slots_to_days: 7 } },
    });
    const t = (key: NotificationKey) => view(key, { rules }).timing?.value;
    expect([t('lesson_reminder'), t('lesson_join_link'), t('lesson_needs_confirmation')]).toEqual(['30', '30', '30']);
    expect(t('teacher_lesson_reminder')).toBe('90');
    expect(t('follow_up_slots')).toBe('6، 48');
    expect(view('renewal_due', { rules, settings: { ...ALL_ON, renewal_alert_remaining: 3 } }).timing).toEqual({ key: 'renewal_alert_remaining', value: '3' });
  });

  it('the teacher’s lead time follows the families’ when it has none', () => {
    const rules = rulesOf({ lesson_reminder: { timing: { minutes_before: 45 } } });
    expect(view('teacher_lesson_reminder', { rules }).timing?.value).toBe('45');
  });

  it('approval counts the approved variants (some approved is still on)', () => {
    const templates = new Map([['lesson_reminder', { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]]);
    expect(view('lesson_reminder', { templates })).toMatchObject({ state: 'on', approval: 'some' });
    expect(view('lesson_reminder').approval).toBe('all');
    expect(view('lesson_reminder', { templates: new Map() }).approval).toBe('none');
    expect(view('new_lead').approval).toBeNull();
  });

  it('legacy mode with no stored rows gives exactly the rows of today (backward compatible)', () => {
    for (const settings of [ALL_ON, { ...ALL_ON, reminder_24h_enabled: true, feedback_mode: 'link' as const, follow_up_hours: [12] }]) {
      const rules = new Map(NOTIFICATION_CATALOGUE.map((e) => [e.key, resolveRule(e, { mode: 'legacy', row: null, settings })] as const));
      const before = catalogueViews({ settings, gateReason: null, templates: approvedAll });
      expect(catalogueViews({ settings, gateReason: null, templates: approvedAll, rules, classroom: true })).toEqual(before);
    }
  });
});
