import {
  notificationEntry,
  resolveRule,
  validTiming,
  type EffectiveRule,
  type NotificationKey,
  type RuleTiming,
  type TimedNotificationKey,
} from '@ab/shared';
import type { RulesSnapshot } from '../../modules/notification-rules/store/rules.reader';

// Producers that resolve several rows in one pass (a job tick) read ONE NotificationPolicy.snapshot()
// and resolve each key from it, so a tick never mixes two versions of the rules (docs/23 §2c).

/** A row's effective choices from one snapshot (the same resolveRule NotificationPolicy.rule uses). */
export function ruleOf(snap: RulesSnapshot, key: NotificationKey): EffectiveRule {
  return resolveRule(notificationEntry(key), { mode: snap.mode, row: snap.rows.get(key) ?? null, settings: snap.settings });
}

/** A timed row's effective timing, typed by its key (null when it does not fit the key's schema). */
export function timingOf<K extends TimedNotificationKey>(rule: EffectiveRule, key: K): RuleTiming<K> | null {
  return validTiming(key, rule.timing) as RuleTiming<K> | null;
}
