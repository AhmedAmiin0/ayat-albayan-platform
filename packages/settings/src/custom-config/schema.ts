import { z } from 'zod';
import { isSettingKey } from '../registry';

/** Free-form entries (`custom_config` table): the key shape the table's check enforces. */
export const CUSTOM_KEY_RE = /^[a-z][a-z0-9_.-]{1,63}$/;
/** Largest stored value (UTF-8 bytes of its JSON). */
export const CUSTOM_VALUE_MAX_BYTES = 8192;

export const customKeySchema = z
  .string()
  .regex(CUSTOM_KEY_RE)
  .refine((k) => !isSettingKey(k), 'reserved_key');

/** Code points from these up take one more UTF-8 byte each (1 to 4 bytes). */
const UTF8_STEPS = [0x80, 0x800, 0x10000] as const;

/** UTF-8 byte length (the shared lib has no TextEncoder typings). */
function utf8Bytes(text: string): number {
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    n += 1 + UTF8_STEPS.filter((step) => c >= step).length;
  }
  return n;
}
const jsonBytes = (v: unknown): number => utf8Bytes(JSON.stringify(v));

/** PUT /config/custom/:key. A JSON null is not a value (delete the entry instead). */
export const customConfigUpsertSchema = z.object({
  value: z
    .json()
    .refine((v) => v !== null, 'null_value')
    .refine((v) => jsonBytes(v) <= CUSTOM_VALUE_MAX_BYTES, 'too_large'),
  description: z.string().max(300).nullable().optional(),
  isPublic: z.boolean().default(false),
});
export type CustomConfigUpsert = z.infer<typeof customConfigUpsertSchema>;
