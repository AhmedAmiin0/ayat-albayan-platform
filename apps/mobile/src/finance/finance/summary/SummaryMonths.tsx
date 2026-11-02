import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { MonthRow } from './MonthRow';
import { activeMonths } from './summary-lines';
import type { FinanceSummary } from './summary-types';
import { InsetGroup } from '@/core/ui/surface/inset';

/** «الإيرادات والتكلفة حسب الشهر»: months with money, newest first; «لا توجد بيانات» for a quiet year. */
export function SummaryMonths({ finance }: { finance: FinanceSummary['finance'] }) {
  const months = activeMonths(finance.by_month);
  return (
    <Section title={t.dashboard.byMonth}>
      <InsetGroup>
        {months.map((m) => (
          <MonthRow key={m.month} month={m} currency={finance.currency} />
        ))}
      </InsetGroup>
      {months.length === 0 ? <Note>{t.dashboard.noData}</Note> : null}
    </Section>
  );
}
