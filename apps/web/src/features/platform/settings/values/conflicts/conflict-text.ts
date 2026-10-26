import type { ConfigEntryConflict, SettingKey } from '@ab/shared';
import { formatAge } from '@/features/sales/leads/format';
import { t } from '@/lib/i18n/i18n';
import { valueText } from '../lib/value-format';

const c = t.settingsValues.conflict;

export interface ConflictTextInput {
  key: SettingKey;
  conflict: ConfigEntryConflict;
  mine: unknown;
  now?: Date;
}

/** Who saved first (their name, else «مستخدم آخر»). */
export const conflictBy = (conflict: ConfigEntryConflict): string => conflict.updatedByName ?? c.someone;

/** «تغيّرت هذه القيمة إلى 6 قبل دقيقتين بواسطة سارة. قيمتك: 8.» (docs/26b §2 «Conflict (409)»). */
export function conflictText({ key, conflict, mine, now }: ConflictTextInput): string {
  const when = conflict.updatedAt ? formatAge(conflict.updatedAt, now) : '';
  return c.body
    .replace('{name}', conflictBy(conflict))
    .replace('{value}', valueText(key, conflict.current))
    .replace(' {when}', when ? ` ${when}` : '')
    .replace('{mine}', valueText(key, mine));
}
