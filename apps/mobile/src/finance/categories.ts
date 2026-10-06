import type { ExpenseCategoryView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

const seeded: Record<string, string | undefined> = t.enums.expenseCategory;

/** The table's label in the UI language, else the seeded word, else the key itself (as the web). */
export function categoryLabel(categories: readonly ExpenseCategoryView[] | undefined, key: string): string {
  const row = categories?.find((c) => c.key === key);
  const own = locale === 'en' ? (row?.label_en ?? row?.label_ar) : row?.label_ar;
  return own ?? seeded[key] ?? key;
}

/** Categories offered for a new expense: the active ones; the seeded words while the table has not loaded. */
export function activeCategories(categories: readonly ExpenseCategoryView[] | undefined): ExpenseCategoryView[] {
  const active = (categories ?? []).filter((c) => c.active);
  if (active.length > 0) return active;
  return Object.entries(seeded).map(([key, label]) => ({ key, label_ar: label ?? key, label_en: null, active: true }));
}
