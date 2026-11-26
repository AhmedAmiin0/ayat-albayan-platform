import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Screen, Notice } from '@ab/mobile-kit';
import { DayState } from '@/today/components/DayState';
import { EndedFold } from '@/today/components/EndedFold';
import { QuietDay } from '@/today/components/QuietDay';
import { RestSection } from '@/today/components/RestSection';
import { SummaryCard } from '@/today/components/SummaryCard';
import { TodayHeader } from '@/today/components/TodayHeader';
import { filterCounts } from '@/today/lib/timeline';
import type { TodayLesson } from '@/today/lib/today-lesson';
import type { Hero } from '@/today/lib/today-plan';
import type { TodaySource } from '@/today/lib/today-source';
import { useTodayView } from '@/today/lib/use-today-view';
import { TodayPage } from '@/today/screens/TodayPage';

/** Null means closed. */
interface OpenDetails<L extends TodayLesson> {
  lesson: L | null;
  close: () => void;
}

interface TodayLayoutProps<L extends TodayLesson> {
  source: TodaySource<L>;
  hero: (hero: Hero<L>, onDetails: () => void) => ReactNode;
  sheet: (details: OpenDetails<L>) => ReactNode;
  notice?: string;
  requests?: ReactNode;
}

/** The same calm body for every tree (docs/29); offline the saved day stays. */
export function TodayLayout<L extends TodayLesson>(props: TodayLayoutProps<L>) {
  const { source, hero: heroCard, sheet, notice, requests } = props;
  const { now, day, filter, setFilter, details, loaded, lessons, plan, stale, nothing } =
    useTodayView(source);
  const { hero } = plan;
  const header = (
    <View style={{ gap: 16 }}>
      <TodayHeader now={now} tree={source.tree} stale={stale} />
      {loaded && lessons.length > 0 ? (
        <SummaryCard counts={filterCounts(lessons)} filter={filter} onFilter={setFilter} />
      ) : null}
      {notice ? <Notice message={notice} /> : null}
      {requests}
      {hero ? heroCard(hero, () => details.open(hero.lesson)) : null}
      {plan.quiet && filter === 'all' ? <QuietDay now={now} source={source} /> : null}
      <RestSection lessons={plan.rest} onOpen={details.open} onShowAll={() => setFilter('all')} />
      <EndedFold key={filter} lessons={plan.ended} onOpen={details.open} open={filter !== 'all'} />
      <DayState
        pending={day.isPending}
        failed={!loaded}
        empty={lessons.length === 0}
        filteredOut={nothing}
        onRetry={() => void day.refetch()}
      />
    </View>
  );
  return (
    <Screen list>
      <TodayPage
        header={header}
        refreshing={day.isRefetching}
        onRefresh={() => void day.refetch()}
      />
      {sheet({ lesson: details.lesson, close: details.close })}
    </Screen>
  );
}
