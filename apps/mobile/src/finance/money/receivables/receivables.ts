import { matchesQuery, type ReceivableRow } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** Past this many days the web shows the late count in saffron; so does the phone. */
const SEVERE_DAYS = 60;

/** The loaded rows narrowed by name, AB-code or guardian name (Arabic letter variants folded). */
export function filterReceivables(rows: readonly ReceivableRow[], query: string): ReceivableRow[] {
  return rows.filter((r) => matchesQuery([r.student.name, r.student.code, r.guardian?.name ?? ''], query));
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
