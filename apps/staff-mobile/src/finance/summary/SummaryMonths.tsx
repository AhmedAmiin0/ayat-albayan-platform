import { t, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { MonthRow } from './MonthRow';
import { activeMonths } from './summary-lines';
import type { DashboardResponse } from '@ab/shared';

/** Only months with money, newest first. */
export function SummaryMonths({ finance }: { finance: DashboardResponse['finance'] }) {
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
