import { TEMPLATE_CATEGORIES, TEMPLATE_STATUSES, WA_LINES } from '@ab/shared';
import type { FilterOption } from '@/components/DataTable';
import { t } from '@/lib/i18n/i18n';

// The select filters of the template health table (values are the row's raw values).

export const categoryOptions = (): FilterOption[] =>
  TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: t.enums.templateCategory[c] }));

/** The WhatsApp line (WABA) each template lives on (owner 2026-10-12). */
export const lineOptions = (): FilterOption[] => WA_LINES.map((l) => ({ value: l, label: t.enums.waLine[l] }));

export const statusOptions = (): FilterOption[] => TEMPLATE_STATUSES.map((s) => ({ value: s, label: t.enums.templateStatus[s] }));

/** Meta's quality scores (GREEN / YELLOW / RED / UNKNOWN) in words. */
export const qualityOptions = (): FilterOption[] =>
  Object.entries(t.templates.qualityScore).map(([value, label]) => ({ value, label }));
