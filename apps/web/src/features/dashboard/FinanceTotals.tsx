import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { financeNotes, rateLines } from './finance-notes';
import { amount, currencyLabel } from './format';
import type { DashboardData } from './types';

/** The period's four money totals (Plex, not the KPI Amiri: these are data) and the FX notes. */
export function FinanceTotals({ finance }: { finance: DashboardData['finance'] }) {
  const cur = currencyLabel(finance.currency);
  const items = [
    { label: t.dashboard.revenue, value: finance.revenue },
    { label: t.dashboard.teacherCost, value: finance.teacher_cost },
    { label: t.dashboard.expenses, value: finance.expenses },
    { label: t.dashboard.grossMargin, value: finance.gross_margin },
  ];
  return (
    <div className="grid gap-3">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @2xl:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="grid gap-0.5">
            <dt className="text-xs text-ink-2">{i.label}</dt>
            <dd className="text-lg font-semibold whitespace-nowrap text-ink">
              <bdi dir="ltr">{amount(i.value)}</bdi> {cur}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="grid gap-1 text-xs text-ink-2">
        {financeNotes(finance).map((n) => (
          <li key={n.text} className={cn('flex items-center gap-1.5', n.warn && 'font-semibold text-ink')}>
            <NuqtaGlyph shape={n.warn ? 'hollow' : 'fill'} className={cn('size-[9px] shrink-0', n.warn ? 'text-act' : 'text-gold')} />
            {n.text}
          </li>
        ))}
        {rateLines(finance).map((line) => (
          <li key={line} className="ps-[15px] tabular-nums text-ink-3">
            <bdi>{line}</bdi>
          </li>
        ))}
      </ul>
    </div>
  );
}
