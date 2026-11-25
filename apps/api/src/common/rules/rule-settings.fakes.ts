import { RULE_SETTING_KEYS, type RuleSettings } from '@ab/shared';
import type { AcademySettings } from '@ab/settings';

/** Tests only: the rule-owned keys of `over` (what fakePolicy reads as its legacy settings). */
export function ruleSettingsOf(over: Partial<AcademySettings> = {}): Partial<RuleSettings> {
  return Object.fromEntries(
    Object.entries(over).filter(([k]) => (RULE_SETTING_KEYS as readonly string[]).includes(k)),
  );
}
