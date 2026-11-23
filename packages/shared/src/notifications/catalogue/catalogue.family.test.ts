import { describe, expect, it } from 'vitest';
import { FAMILY_PUSH_KINDS } from '@ab/catalog';
import { SETTING_DEFAULTS } from '@ab/settings';
import { optionalChannels, resolveRule } from '../rules.effective.js';
import { RULE_SETTING_KEYS, type RuleSettings } from '../rules.legacy.js';
import { entryView } from './catalogue-state/index.js';
import { notificationEntry } from './catalogue.js';
import { FAMILY_ENTRIES } from './catalogue.family.js';

// The family app's pushes (docs/50 §5 item 6): on by default, bell + push, the admin's to turn off.

const legacy = (): RuleSettings =>
  Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])) as RuleSettings;
const OFF = { enabled: false, channels: null, timing: null, number_id: null };
const BELL_ONLY = { enabled: true, channels: ['bell'], timing: null, number_id: null };

describe('the family push rows', () => {
  it('one row per family kind, named after it: the guardian, bell + push, no WhatsApp', () => {
    expect(FAMILY_ENTRIES.map((e) => e.key)).toEqual([...FAMILY_PUSH_KINDS]);
    for (const e of FAMILY_ENTRIES) {
      expect(e).toMatchObject({ pushKind: e.key, audience: 'guardian', templates: [] });
      expect([...e.channels]).toEqual(['bell', 'push']);
      expect([e.automatic, e.manual, e.locked, e.defaults.enabled]).toEqual([
        false,
        false,
        false,
        true,
      ]);
    }
  });

  it('on with no stored row; the admin turns it off, or keeps the bell row only', () => {
    for (const key of FAMILY_PUSH_KINDS) {
      const entry = notificationEntry(key);
      const fresh = resolveRule(entry, { mode: 'module', row: null, settings: legacy() });
      expect(fresh).toMatchObject({ enabled: true, channels: ['bell', 'push'] });
      expect(resolveRule(entry, { mode: 'module', row: OFF, settings: legacy() }).enabled).toBe(
        false,
      );
      const bell = resolveRule(entry, { mode: 'module', row: BELL_ONLY, settings: legacy() });
      expect(bell.channels).toEqual(['bell']);
      expect(optionalChannels(entry)).toEqual(['push']);
    }
  });

  it('the rule screen shows it on, held by nothing but its own switch', () => {
    const inputs = { settings: SETTING_DEFAULTS, gateReason: null, templates: new Map() };
    const view = entryView(notificationEntry('lesson_starting'), inputs);
    expect(view).toMatchObject({ state: 'on', blocker: null, audience: 'guardian' });
  });
});
