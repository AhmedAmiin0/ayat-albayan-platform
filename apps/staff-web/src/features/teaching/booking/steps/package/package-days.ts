import type { PackageSize } from '@ab/catalog';
import { counted } from '@ab/core';
import { packagePerWeek } from '@ab/money';
import { t } from '@ab/web-kit';

/** A note (R-SCH-02, R-SUB-01) when weekdays don't add up to the package; null when they match. */
export function packageDaysNote(pkg: PackageSize, days: number): string | null {
  const perWeek = packagePerWeek(pkg);
  if (perWeek === null || perWeek === days) return null;
  return t.booking.packageDays
    .replace('{package}', t.enums.packageSize[pkg])
    .replace('{perWeek}', counted(t.booking.perWeek, perWeek));
}

/** The hamish line (docs/07: double gold-soft rule), in act because it is the admin's to fix. */
export const PACKAGE_NOTE_CLASS = 'border-s border-s-rule ps-3 text-xs font-semibold text-act';
