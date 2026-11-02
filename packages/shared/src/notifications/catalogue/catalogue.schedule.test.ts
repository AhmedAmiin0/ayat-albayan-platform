import { describe, expect, it } from 'vitest';
import type { TemplateStatus, WaLine } from '@ab/catalog';
import { SETTING_DEFAULTS, type AcademySettings } from '@ab/settings';
import { resolveRule } from '../rules.effective.js';
import { RULE_SETTING_KEYS, type RuleSettings } from '../rules.legacy.js';
import { entryView, type CatalogueInputs } from './catalogue-state.js';
import { notificationEntry } from './catalogue.js';
import { SCHEDULE_ENTRIES } from './catalogue.schedule.js';

// The schedule-change rows (owner 2026-10-30): the guardian AND the teacher, WhatsApp + bells.

const KEYS = SCHEDULE_ENTRIES.map((e) => e.key);
const ON: AcademySettings = { ...SETTING_DEFAULTS, messaging_enabled: true };
const LINE: WaLine = 'notifications';
const status = (s: TemplateStatus) => new Map(KEYS.map((k) => [k, { status: s, line: LINE }]));
const view = (key: (typeof KEYS)[number], patch: Partial<CatalogueInputs> = {}) =>
  entryView(notificationEntry(key), { settings: ON, gateReason: null, templates: status('approved'), ...patch });
const legacy = (): RuleSettings =>
  Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])) as RuleSettings;

describe('the four schedule-change rows', () => {
  it('each: its own template and push kind, guardian + teacher, three channels, default on', () => {
    expect(KEYS).toEqual(['lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed']);
    for (const e of SCHEDULE_ENTRIES) {
      expect(e).toMatchObject({ templates: [e.key], pushKind: e.key, audience: 'guardian', alsoTo: ['teacher'] });
      expect([...e.channels]).toEqual(['whatsapp', 'push', 'bell']);
      const flags = [e.automatic, e.manual, e.locked, e.defaults.enabled];
      expect(flags).toEqual([false, false, false, true]);
    }
  });

  it('on with no stored row (legacy and module); its own switch turns it off', () => {
    for (const key of KEYS) {
      const entry = notificationEntry(key);
      expect(resolveRule(entry, { mode: 'legacy', row: null, settings: legacy() }).enabled).toBe(true);
      const off = { enabled: false, channels: null, timing: null, number_id: null };
      expect(resolveRule(entry, { mode: 'module', row: off, settings: legacy() }).enabled).toBe(false);
    }
  });

  it('not held by the automatic switch; held by messaging_enabled and the template’s approval', () => {
    const autoOff = { ...ON, auto_messages_enabled: false };
    expect(view('lesson_cancelled', { settings: autoOff })).toMatchObject({ state: 'on' });
    expect(view('lesson_cancelled', { settings: SETTING_DEFAULTS }).blocker).toBe('messaging_off');
    expect(view('course_paused', { templates: status('not_submitted') }).blocker).toBe('template_not_approved');
    expect(view('course_resumed', { templates: new Map() }).lines).toEqual(['notifications']);
  });

  it('the view lists the teacher too (v2 also_to)', () => {
    expect(view('lesson_rescheduled')).toMatchObject({ audience: 'guardian', also_to: ['teacher'] });
    expect(entryView(notificationEntry('report_ready'), { settings: ON, gateReason: null, templates: new Map() })).not.toHaveProperty('also_to');
  });
});
