import { normalizeArabic, type ReceivableRow } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** Past this many days the web shows the late count in saffron; so does the phone. */
const SEVERE_DAYS = 60;

const fold = (text: string) => normalizeArabic(text).toLowerCase();

/** The loaded rows narrowed by name, AB-code or guardian name (Arabic letter variants folded). */
export function filterReceivables(rows: readonly ReceivableRow[], query: string): ReceivableRow[] {
  const q = fold(query.trim());
  if (!q) return [...rows];
  return rows.filter((r) =>
    [r.student.name, r.student.code, r.guardian?.name ?? ''].some((field) => fold(field).includes(q)),
  );
}

/** «منذ 45 يومًا». */
export function daysLateText(days: number): string {
  return t.mobileMoney.daysLate.replace('{n}', String(days));
}

export function isSevere(days: number): boolean {
  return days > SEVERE_DAYS;
}

/** «لا يوجد سعر صرف لـUSD، …» or null when every currency was converted. */
export function fxMissingText(currencies: readonly string[]): string | null {
  if (currencies.length === 0) return null;
  return t.mobileMoney.fxMissing.replace('{currencies}', currencies.join(t.common.listSeparator));
}
