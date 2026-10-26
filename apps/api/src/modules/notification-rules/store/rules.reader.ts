import type { NotificationRuleRow, RuleSettings, RulesMode } from '@ab/shared';

/** One consistent read: the mode (settings.comms_source), the stored rows by key and the 8 legacy keys. */
export interface RulesSnapshot {
  mode: RulesMode;
  rows: ReadonlyMap<string, NotificationRuleRow>;
  settings: RuleSettings;
}

/**
 * The port NotificationPolicy reads through (DI token). The DB implementation (rules.store.ts) caches
 * one snapshot for SETTINGS_CACHE_MS (0 in e2e), drops it on its own writes, never caches a failure.
 */
export abstract class RulesReader {
  abstract snapshot(): Promise<RulesSnapshot>;
}
