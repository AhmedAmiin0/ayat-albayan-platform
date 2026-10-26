import { settingZod, type SettingDef } from '@ab/shared';
import { isDeepStrictEqual } from 'node:util';
import { CONFIG_DEFS, defaultOf } from './config-defs';

// ConfigStore's read side (docs/26 §2d, §4 «Parity rules»). Written apart from readSettings on purpose:
// it validates with the write schema (settingZod) and the fail-closed rules below, so GET
// /admin/config/parity compares two independent paths.

/** The send switches: ON only for a stored JSON boolean `true` ("true", 1, null, missing → off). */
export const GATE_KEYS: ReadonlySet<string> = new Set(['messaging_enabled', 'auto_messages_enabled']);

export interface Decoded {
  value: unknown;
  /** A stored, non-null value that is not valid for its entry (it reads as the default). */
  malformed: boolean;
}

const ok = (value: unknown): Decoded => ({ value, malformed: false });

/** comms_source: 'module' only for the exact string "module"; anything else is 'legacy'. */
function decodeCommsSource(v: unknown): Decoded {
  return { value: v === 'module' ? 'module' : 'legacy', malformed: v !== 'module' && v !== 'legacy' };
}

/**
 * One key's effective value from its stored row: a missing row and JSON null read as the default; a
 * value that fails the entry's schema (or that the schema would change, e.g. untrimmed text) reads
 * as the default and is reported malformed.
 */
export function decodeValue(key: string, def: SettingDef, row: { value: unknown } | undefined): Decoded {
  const v = row?.value ?? null;
  if (v === null) return ok(defaultOf(def));
  if (GATE_KEYS.has(key)) return { value: v === true, malformed: typeof v !== 'boolean' };
  if (key === 'comms_source') return decodeCommsSource(v);
  const parsed = settingZod(def).safeParse(v);
  if (parsed.success && isDeepStrictEqual(parsed.data, v)) return ok(v);
  return { value: defaultOf(def), malformed: true };
}

/** Every known key (registry ∪ google) → its effective value; `onMalformed` hears each bad key. */
export function decodeAll(
  rows: readonly { key: string; value: unknown }[],
  onMalformed?: (key: string) => void,
): Record<string, unknown> {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(CONFIG_DEFS)) {
    const d = decodeValue(key, def, byKey.get(key));
    if (d.malformed) onMalformed?.(key);
    out[key] = d.value;
  }
  return out;
}
