import type { ReceivablesView, TeacherEarningsSummaryView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { wholeText } from './format';
import type { FinanceSummary } from './summary-types';

export interface Card {
  label: string;
  value: string;
  tone: 'ink' | 'bad';
}

const DASH = '—';
const money = (n: number | undefined, currency?: string) => (n === undefined ? DASH : wholeText(n, currency));

/** The six cards: the year's four totals (reporting currency), owed to teachers (EGP), owed by students. */
export function summaryCards(
  finance: FinanceSummary['finance'] | undefined,
  dues: TeacherEarningsSummaryView | undefined,
  owed: ReceivablesView | undefined,
): Card[] {
  const f: Partial<FinanceSummary['finance']> = finance ?? {};
  const cur = f.currency ?? owed?.currency; // a figure shows only once its currency came with it
  const loss = (f.gross_margin ?? 0) < 0;
  return [
    { label: t.dashboard.revenue, value: money(f.revenue, cur), tone: 'ink' },
    { label: t.dashboard.teacherCost, value: money(f.teacher_cost, cur), tone: 'ink' },
    { label: t.dashboard.expenses, value: money(f.expenses, cur), tone: 'ink' },
    { label: t.dashboard.grossMargin, value: money(f.gross_margin, cur), tone: loss ? 'bad' : 'ink' },
    { label: t.finance.teachersOwedKpi, value: money(dues?.totals.owed, 'EGP'), tone: 'ink' },
    { label: t.finance.receivablesKpi, value: money(owed?.total, owed?.currency ?? cur), tone: 'ink' },
  ];
}
