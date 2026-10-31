import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { summaryYears, yearRange } from '@/finance/shared/month';
import { useFinanceSummary } from '@/finance/shared/queries';
import { StaleNote } from '@/finance/shared/StateNote';
import { SummaryCards } from './SummaryCards';
import { SummaryMonths } from './SummaryMonths';

/**
 * «الملخص المالي» (admin; web /admin/finance «المالية»): pick a year, read the main numbers as
 * cards and the months below them. No chart library: the numbers are the answer.
 */
export function SummaryScreen() {
  const years = summaryYears();
  const [year, setYear] = useState(years[0] ?? '');
  const summary = useFinanceSummary(yearRange(year));
  const finance = summary.data?.finance;
  return (
    <Screen>
      <ScreenHeader title={t.mobileFinance.rows.summary} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      <FilterPills accessibilityLabel={t.finance.year} items={years.map((y) => ({ value: y, label: y }))} value={year} onChange={setYear} />
      <StaleNote isError={summary.isError} hasData={!!finance} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={summary.isRefetching} onRefresh={() => void summary.refetch()} />}
      >
        {summary.isError && !finance ? <ErrorState onRetry={() => void summary.refetch()} message={t.mobileFinance.loadFailed} /> : null}
        {!finance && !summary.isError ? <Note>{t.common.loading}</Note> : null}
        <SummaryCards finance={finance} />
        {finance ? <SummaryMonths finance={finance} /> : null}
      </ScrollView>
    </Screen>
  );
}
