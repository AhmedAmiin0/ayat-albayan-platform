import { counted, packagePerWeek, type PackageSize } from '@ab/shared';
import { t } from '@/lib/i18n';

/**
 * «الباقة 8 حلقات في الشهر = مرتين في الأسبوع» when the picked weekdays don't add up to the
 * package (R-SCH-02, R-SUB-01): booking one day a week for 8 a month books half of what is charged.
 * Only a note: which extra weekday the family wants is the admin's choice. null when they match.
 */
export function packageDaysNote(pkg: PackageSize, days: number): string | null {
  const perWeek = packagePerWeek(pkg);
  if (perWeek === null || perWeek === days) return null;
  return t.booking.packageDays
    .replace('{package}', t.enums.packageSize[pkg])
    .replace('{perWeek}', counted(t.booking.perWeek, perWeek));
}

/** The hamish line (docs/07: double gold-soft rule), in act because it is the admin's to fix. */
export const PACKAGE_NOTE_CLASS = 'border-s border-s-rule ps-3 text-xs font-semibold text-act';
