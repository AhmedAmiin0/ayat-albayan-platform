import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { Select } from '@/components/ui/form/select';
import { summaryQuery } from '@/features/reporting/dashboard/api';
import { FinanceByMonth } from '@/features/reporting/dashboard/finance/FinanceByMonth';
import { FinanceTotals } from '@/features/reporting/dashboard/finance/FinanceTotals';
import { riyadhToday } from '@/features/reporting/dashboard/search';
import { t } from '@/lib/i18n/i18n';
import { yearRange } from './api';
import { MoneyKpis } from './MoneyKpis';

/**
 * /admin/finance «الملخص المالي»: a year's P&L by month — revenue − teacher cost − expenses = net,
 * all converted to the reporting currency (the dashboard's own numbers, the one pay rule for the
 * teacher cost), plus what teachers are owed and what families still owe.
 */
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
            <FinanceByMonth months={summary.data.finance.by_month} currency={summary.data.finance.currency} />
          </>
        ) : (
          <p className="text-sm text-ink-3">{t.common.loading}</p>
        )}
      </div>
    </>
  );
}
