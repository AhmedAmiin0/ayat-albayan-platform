import { type ReactNode, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useLessonDetails } from '@/calendar';
import { clockAt } from '@/inbox';
import { t, Screen, useTabBarInset, Notice, useNow } from '@ab/mobile-kit';
import { DayState } from '@/today/components/DayState';
import { EndedFold } from '@/today/components/EndedFold';
import { QuietDay } from '@/today/components/QuietDay';
import { RestSection } from '@/today/components/RestSection';
import { SummaryCard } from '@/today/components/SummaryCard';
import { TodayHeader } from '@/today/components/TodayHeader';
import { filterCounts, visibleLessons, type TodayFilter } from '@/today/lib/timeline';
import type { TodayLesson } from '@/today/lib/today-lesson';
import { todayPlan, type Hero } from '@/today/lib/today-plan';
import type { TodaySource } from '@/today/lib/today-source';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

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
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const now = useNow();
  const day = source.useDay(now);
  const inset = useTabBarInset();
  const [filter, setFilter] = useState<TodayFilter>('all');
  const details = useLessonDetails(day.data);
  const loaded = day.data !== undefined;
  const lessons = visibleLessons(day.data ?? []);
  const plan = todayPlan(lessons, filter, now);
  // Offline (no NetInfo): the refetch failed but the saved day is on screen; say how old it is.
  const stale = day.isError && loaded ? t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt, cycle, tz)) : undefined;
  const { hero } = plan;
  const nothing = hero === null && plan.rest.length === 0 && plan.ended.length === 0;

  return (
    <Screen list>
      {/* The page is one block of cards (rows share one card), so a list with only a header: it keeps
          FlatList's refresh and keyboard behaviour, as before. */}
      <FlatList
        // Bleeds to the screen's edge and pads back the same 16pt gutter: the cards' hairline ring is not clipped.
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + inset }}
        refreshControl={<RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} />}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <TodayHeader now={now} tree={source.tree} stale={stale} />
            {loaded && lessons.length > 0 ? <SummaryCard counts={filterCounts(lessons)} filter={filter} onFilter={setFilter} /> : null}
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
        }
      />
      {sheet({ lesson: details.lesson, close: details.close })}
    </Screen>
  );
}
