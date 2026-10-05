import type { Json } from '@ab/db';
import { z } from 'zod';
import type { PublicSettings } from './public.js';
import { isSettingKey } from './registry.js';

/** Free-form entries (`custom_config` table): the key shape the table's check enforces. */
export const CUSTOM_KEY_RE = /^[a-z][a-z0-9_.-]{1,63}$/;
/** Largest stored value (UTF-8 bytes of its JSON). */
export const CUSTOM_VALUE_MAX_BYTES = 8192;

export const customKeySchema = z
  .string()
  .regex(CUSTOM_KEY_RE)
  .refine((k) => !isSettingKey(k), 'reserved_key');

/** UTF-8 byte length (the shared lib has no TextEncoder typings). */
function utf8Bytes(text: string): number {
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}
const jsonBytes = (v: unknown): number => utf8Bytes(JSON.stringify(v));

/** PUT /config/custom/:key. A JSON null is not a value (delete the entry instead). */
export const customConfigUpsertSchema = z.object({
  value: z.json().refine((v) => v !== null, 'null_value').refine((v) => jsonBytes(v) <= CUSTOM_VALUE_MAX_BYTES, 'too_large'),
  description: z.string().max(300).nullable().optional(),
  isPublic: z.boolean().default(false),
});
export type CustomConfigUpsert = z.infer<typeof customConfigUpsertSchema>;

/** One custom entry as the admin API returns it. */
export interface CustomConfigView {
  key: string;
  value: Json;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

/** GET /settings/public (no login): the public settings by row key, plus `custom`: the entries flagged public. */
export type PublicConfig = PublicSettings & { custom: Record<string, Json> };

interface CustomRow {
  key: string;
  value: Json;
  is_public: boolean;
}

/** The public custom entries by key; a private row, or one shadowing a registry setting, is dropped. */
export function publicCustom(rows: readonly CustomRow[]): Record<string, Json> {
  return Object.fromEntries(rows.filter((r) => r.is_public && !isSettingKey(r.key)).map((r) => [r.key, r.value]));
}
