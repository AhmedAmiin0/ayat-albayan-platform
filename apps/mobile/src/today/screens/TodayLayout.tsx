import { type ReactNode, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useLessonDetails } from '@/calendar';
import { clockAt } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { Screen } from '@/core/ui/layout/Screen';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { DayState } from '../components/DayState';
import { EndedFold } from '../components/EndedFold';
import { Notice } from '../components/Notice';
import { QuietDay } from '../components/QuietDay';
import { RestSection } from '../components/RestSection';
import { SummaryCard } from '../components/SummaryCard';
import { TodayHeader } from '../components/TodayHeader';
import { filterCounts, visibleLessons, type TodayFilter } from '../lib/timeline';
import type { TodayLesson } from '../lib/today-lesson';
import { todayPlan, type Hero } from '../lib/today-plan';
import type { TodaySource } from '../lib/today-source';
import { useNow } from '../lib/use-day-lessons';

/** The lesson whose «تفاصيل الحلقة» is open (null: closed), and how to close it. */
interface OpenDetails<L extends TodayLesson> {
  lesson: L | null;
  close: () => void;
}

interface TodayLayoutProps<L extends TodayLesson> {
  source: TodaySource<L>;
  /** The hero card «الحلقة التالية»; `onDetails` opens its lesson's sheet. */
  hero: (hero: Hero<L>, onDetails: () => void) => ReactNode;
  /** The tree's «تفاصيل الحلقة» sheet, with what it may do there. */
  sheet: (details: OpenDetails<L>) => ReactNode;
  /** Said once a lesson change lands (the admin's تأكيد / إلغاء). */
  notice?: string;
}

/**
 * The calm «اليوم» body (docs/29), the same for every tree: the greeting and date, a summary card
 * whose columns filter the day, the hero, «بقية اليوم» as quiet rows and the ended lessons folded
 * away; a quiet day once all is done. A tap on any lesson opens the tree's sheet. Pull to refresh;
 * offline the saved day stays with its «آخر تحديث».
 */
export function TodayLayout<L extends TodayLesson>({ source, hero: heroCard, sheet, notice }: TodayLayoutProps<L>) {
  const now = useNow();
  const day = source.useDay(now);
  const inset = useTabBarInset();
  const [filter, setFilter] = useState<TodayFilter>('all');
  const details = useLessonDetails(day.data);
  const loaded = day.data !== undefined;
  const lessons = visibleLessons(day.data ?? []);
  const plan = todayPlan(lessons, filter, now);
  // Offline (no NetInfo): the refetch failed but the saved day is on screen; say how old it is.
  const stale = day.isError && loaded ? t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt)) : undefined;
  const { hero } = plan;
  const nothing = hero === null && plan.rest.length === 0 && plan.ended.length === 0;

  return (
    <Screen list>
      {/* The page is one block of cards (rows share one card), so a list with only a header: it keeps
          FlatList's refresh and keyboard behaviour, as before. */}
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + inset }}
        refreshControl={<RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} />}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <TodayHeader now={now} tree={source.tree} stale={stale} />
            {loaded && lessons.length > 0 ? <SummaryCard counts={filterCounts(lessons)} filter={filter} onFilter={setFilter} /> : null}
            {notice ? <Notice message={notice} /> : null}
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
