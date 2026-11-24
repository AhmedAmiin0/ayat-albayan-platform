import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { clockAt } from '@/inbox/shared/format';
import { weekLabel } from '@/calendar';
import { t, BackButton, ErrorState, Screen, ScreenHeader, Section, useNow } from '@ab/mobile-kit';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import { useSummary, useWork, weekRange } from '@/ops/dashboard/dashboard-queries';
import type { WorkTab } from '@ab/money';
import { kpisOf } from '@/ops/dashboard/kpis';
import { KpiTile } from '@/ops/dashboard/KpiTile';
import { WorkPanel } from '@/ops/dashboard/WorkPanel';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

const back = () => backWithin('/more');

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
  const { required } = useLessonStatusText();
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
        leading={<BackButton onPress={back} />}
      />
      {!summary.data && summary.isError ? <ErrorState onRetry={refresh} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        {summary.data ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {kpisOf(summary.data, required).map((k) => (
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
