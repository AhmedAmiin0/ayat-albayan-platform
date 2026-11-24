import type { ConfigEntryConflict, SettingKey } from '@ab/settings';
import { formatAge } from '@/features/sales/leads';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { valueText } from '@/features/platform/settings/values/lib/value-format';

const c = t.settingsValues.conflict;

export interface ConflictTextInput {
  key: SettingKey;
  conflict: ConfigEntryConflict;
  mine: unknown;
  now?: Date;
}

export const conflictBy = (conflict: ConfigEntryConflict): string => conflict.updatedByName ?? c.someone;

/** The 409 conflict message with the new value, age, author and the admin's value (docs/26b §2). */
export function conflictText({ key, conflict, mine, now }: ConflictTextInput): string {
  const when = conflict.updatedAt ? formatAge(conflict.updatedAt, now) : '';
  return c.body
    .replace('{name}', conflictBy(conflict))
    .replace('{value}', valueText(key, conflict.current))
    .replace(' {when}', when ? ` ${when}` : '')
    .replace('{mine}', valueText(key, mine));
}
