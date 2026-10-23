import type { Json } from '@ab/db';
import { isSettingKey } from '../settings/registry.js';

interface CustomRow {
  key: string;
  value: Json;
  is_public: boolean;
}

/** The public custom entries by key; a private row, or one shadowing a registry setting, is dropped. */
export function publicCustom(rows: readonly CustomRow[]): Record<string, Json> {
  return Object.fromEntries(rows.filter((r) => r.is_public && !isSettingKey(r.key)).map((r) => [r.key, r.value]));
}
