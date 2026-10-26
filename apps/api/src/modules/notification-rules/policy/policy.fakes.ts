import { SETTING_DEFAULTS, RULE_SETTING_KEYS, type NotificationRuleRow, type RuleSettings, type RulesMode } from '@ab/shared';
import { NotificationPolicy } from './policy';
import { RulesReader, type RulesSnapshot } from '../store/rules.reader';

const defaults = (): RuleSettings => Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])) as RuleSettings;

export interface FakePolicyInput {
  mode?: RulesMode;
  rows?: Partial<NotificationRuleRow>[];
  settings?: Partial<RuleSettings>;
  /** true: every read fails (fail-closed paths). */
  fail?: boolean;
}

/** Tests only: a RulesReader over fixed rows (registry defaults, legacy mode, no rows by default). */
export function fakeRulesReader(input: FakePolicyInput = {}): RulesReader & { snapshot: () => Promise<RulesSnapshot> } {
  const rows = new Map<string, NotificationRuleRow>();
  for (const r of input.rows ?? []) {
    const key = r.key ?? '';
    rows.set(key, { key, enabled: true, channels: null, timing: null, number_id: null, updated_at: '2026-10-24T00:00:00Z', updated_by: null, ...r });
  }
  return {
    snapshot: async () => {
      if (input.fail) throw new Error('rules read failed');
      return { mode: input.mode ?? 'legacy', rows, settings: { ...defaults(), ...input.settings } };
    },
  };
}

/** Tests only: a NotificationPolicy over fakeRulesReader(input). */
export const fakePolicy = (input: FakePolicyInput = {}): NotificationPolicy => new NotificationPolicy(fakeRulesReader(input));
