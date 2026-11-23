import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { t, BackButton, ErrorState, FilterPills, Screen, ScreenHeader } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { summaryYears, yearRange } from '@/finance/shared/month';
import { useFinanceSummary } from '@/finance/shared/queries';
import { StaleNote } from '@/finance/shared/StateNote';
import { SummaryCards } from './SummaryCards';
import { SummaryMonths } from './SummaryMonths';

/** No chart library: the numbers are the answer. */
export function SummaryScreen() {
  const years = summaryYears();
  const [year, setYear] = useState(years[0] ?? '');
  const summary = useFinanceSummary(yearRange(year));
  const finance = summary.data?.finance;
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileFinance.rows.summary}
        leading={<BackButton onPress={() => router.back()} />}
      />
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
