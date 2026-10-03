import type { Locale } from '../locale.js';

/** The name to show for a teacher: the English one in the English UI when it exists, else Arabic. */
export function teacherName(
  teacher: { display_name_ar: string; display_name_en?: string | null },
  locale: Locale,
): string {
  const en = teacher.display_name_en?.trim();
  return locale === 'en' && en ? en : teacher.display_name_ar;
}
