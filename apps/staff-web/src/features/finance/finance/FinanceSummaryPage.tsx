import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche, Field, FormAlert, PageHead, Select, t } from '@ab/web-kit';
import { summaryQuery } from '@/features/reporting/dashboard/api';
import { FinanceByMonth } from '@/features/reporting/dashboard/finance/FinanceByMonth';
import { FinanceTotals } from '@/features/reporting/dashboard/finance/FinanceTotals';
import { riyadhToday } from '@/features/reporting/dashboard/search';
import { yearRange } from './api';
import { MoneyKpis } from './MoneyKpis';

/** Revenue minus teacher cost minus expenses, in the reporting currency. */
export function FinanceSummaryPage() {
  const today = riyadhToday(); // academy day (docs/34 b): the year's ?from&to are Riyadh days
  const [year, setYear] = useState(today.slice(0, 4));
  const summary = useQuery(summaryQuery(yearRange(year, today)));
  const years = Array.from({ length: 4 }, (_, i) => String(Number(today.slice(0, 4)) - i));
  return (
    <>
      <PageHead>
        <Cartouche>{t.finance.summaryTitle}</Cartouche>
        <Field label={t.finance.year}>
          {(p) => (
            <Select {...p} className="w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </PageHead>
      <div className="grid gap-8">
        <MoneyKpis />
        {summary.isError && <FormAlert>{t.dashboard.loadFailed}</FormAlert>}
        {summary.data ? (
          <>
            <FinanceTotals finance={summary.data.finance} />
            <FinanceByMonth
              months={summary.data.finance.by_month}
              currency={summary.data.finance.currency}
            />
          </>
        ) : (
          <p className="text-sm text-ink-3">{t.common.loading}</p>
        )}
      </div>
    </>
  );
}
