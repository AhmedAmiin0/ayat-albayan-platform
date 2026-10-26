import {
  legacyValues,
  notificationEntry,
  resolveRule,
  RULE_LEGACY_MAP,
  type LegacyMappedKey,
  type RuleParityDiff,
  type RuleSettings,
} from '@ab/shared';
import type { RulesSnapshot } from '../store/rules.reader';

// The rules ↔ legacy keys mirror (docs/23b decisions 3, 5, 6): parity, the flip back to legacy and the
// GET /settings overlay in module mode. Pure.

const MAPPED = Object.keys(RULE_LEGACY_MAP) as LegacyMappedKey[];

/** JSON with sorted object keys, so equal timings compare equal whatever their key order. */
export function canonical(value: unknown): string {
  return JSON.stringify(value ?? null, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

type RulesInput = Pick<RulesSnapshot, 'rows' | 'settings'>;

const resolved = (key: LegacyMappedKey, input: RulesInput, mode: 'legacy' | 'module') =>
  resolveRule(notificationEntry(key), { mode, row: input.rows.get(key) ?? null, settings: input.settings });

/** Every mapped part where the rule (module path) and the legacy keys (legacy path) disagree. */
export function ruleDifferences(input: RulesInput): RuleParityDiff[] {
  return MAPPED.flatMap((key) => {
    const legacy = resolved(key, input, 'legacy');
    const module = resolved(key, input, 'module');
    const parts = Object.keys(RULE_LEGACY_MAP[key]) as ('enabled' | 'timing')[];
    return parts.flatMap((field) => {
      const a = canonical(legacy[field]);
      const b = canonical(module[field]);
      return a === b ? [] : [{ key, field, legacy: a, module: b }];
    });
  });
}

/** The legacy keys as the module path's effective rules say them (the flip back, the module-mode overlay). */
export function moduleLegacyValues(input: RulesInput): Partial<RuleSettings> {
  return Object.assign({}, ...MAPPED.map((key) => legacyValues(key, resolved(key, input, 'module')))) as Partial<RuleSettings>;
}
