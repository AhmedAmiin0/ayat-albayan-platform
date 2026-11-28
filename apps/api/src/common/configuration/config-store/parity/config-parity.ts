import { readSettings, SETTING_KEYS } from '@ab/settings';
import { isDeepStrictEqual } from 'node:util';
import { decodeAll, GATE_KEYS } from '@/common/configuration/config-store/store/config-decode';
import type { ConfigParityDiff, ConfigParityResponse } from './config-parity.schemas';

type Rows = readonly { key: string; value: unknown }[];

/** docs/26 §4 rules 3 and 4: what a stored value must read as on BOTH paths. */
function ruleValue(key: string, stored: unknown): unknown {
  if (GATE_KEYS.has(key)) return stored === true;
  return stored === 'module' ? 'module' : 'legacy';
}

const RULE_KEYS = [...GATE_KEYS, 'comms_source'];

interface ParitySides {
  legacy: Readonly<Record<string, unknown>>;
  store: Readonly<Record<string, unknown>>;
  rows: Rows;
}

/**
 * Registry keys whose two effective values differ (deep equality); then the fail-closed rules,
 * reported as `rule:<key>` with both values when either path breaks them.
 */
export function compareEffective(sides: ParitySides): ConfigParityDiff[] {
  const { legacy, store } = sides;
  const diffs: ConfigParityDiff[] = SETTING_KEYS.filter(
    (k) => !isDeepStrictEqual(legacy[k], store[k]),
  ).map((key) => ({
    key,
    legacy: legacy[key],
    store: store[key],
  }));
  const stored = new Map(sides.rows.map((r) => [r.key, r.value]));
  for (const key of RULE_KEYS) {
    const want = ruleValue(key, stored.get(key));
    const broken = legacy[key] !== want || store[key] !== want;
    if (broken) diffs.push({ key: `rule:${key}`, legacy: legacy[key], store: store[key] });
  }
  return diffs;
}

/** Legacy effective values (readSettings) vs ConfigStore's decode, both over the same rows. */
export function configParity(rows: Rows): ConfigParityResponse {
  const diffs = compareEffective({ legacy: readSettings(rows), store: decodeAll(rows), rows });
  return { diffs, checkedKeys: SETTING_KEYS.length };
}
