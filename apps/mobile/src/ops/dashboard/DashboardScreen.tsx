import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { clockAt } from '@/inbox/shared/format';
import { weekLabel } from '@/calendar';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/core/ui/surface/Section';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useNow } from '@/core/lib/time/use-now';
import { useSummary, useWork, weekRange } from './dashboard-queries';
import type { WorkTab } from './dashboard-types';
import { kpisOf } from './kpis';
import { KpiTile } from './KpiTile';
import { WorkPanel } from './WorkPanel';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

const back = () => (router.canGoBack() ? router.back() : router.replace('/more'));

/**
 * «لوحة المتابعة» (R-RPT-01, R-RPT-02): the web's KPI strip for the current Riyadh week, then the
 * queue behind it. A tile with work behind it picks the list below. No charts (the web has them).
 * Offline the saved numbers stay with their «آخر تحديث».
 */
export function DashboardScreen() {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const range = weekRange(useNow());
  const summary = useSummary(range);
  const work = useWork();
  const [tab, setTab] = useState<WorkTab>('reports');
  const refresh = () => void Promise.all([summary.refetch(), work.refetch()]);
  const stale = (summary.isError || work.isError) && summary.data !== undefined;
  const subtitle = stale
    ? `${weekLabel(range.from)} · ${t.mobile.lastUpdated.replace('{time}', clockAt(summary.dataUpdatedAt, cycle, tz))}`
    : weekLabel(range.from);
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileAdmin.dashboard.title}
        subtitle={subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {!summary.data && summary.isError ? <ErrorState onRetry={refresh} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        {summary.data ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {kpisOf(summary.data).map((k) => (
              <KpiTile
                key={k.key}
                kpi={k}
                selected={k.tab === tab}
                onPress={k.tab ? () => setTab(k.tab ?? 'reports') : undefined}
              />
            ))}
          </View>
        ) : null}
        {work.data ? (
          <Section title={t.mobileAdmin.dashboard.needsAttention}>
            <WorkPanel tab={tab} work={work.data} />
          </Section>
        ) : !summary.isError && work.isError ? (
          <ErrorState onRetry={refresh} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
