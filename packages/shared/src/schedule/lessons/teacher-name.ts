import { localizedName } from '../../i18n/localized-name.js';
import type { Locale } from '../../i18n/locale.js';

/** The name to show for a teacher: the English one in the English UI when it exists, else Arabic. */
export function teacherName(
  teacher: { display_name_ar: string; display_name_en?: string | null },
  locale: Locale,
): string {
  return localizedName({ ar: teacher.display_name_ar, en: teacher.display_name_en }, locale);
}
