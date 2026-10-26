import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { LessonDetailsSheet } from '@/calendar/details/LessonDetailsSheet';
import { useLessonDetails } from '@/calendar/details/use-lesson-details';
import { LessonRowActions } from '@/calendar/agenda/LessonRowActions';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { EditTimeSheet } from '@/edit-time/components/EditTimeSheet';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { RescheduleSheet } from '@/teaching/reschedule/RescheduleSheet';
import { Screen } from '@/core/ui/layout/Screen';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { DayState } from '../components/DayState';
import { EndedFold } from '../components/EndedFold';
import { Notice } from '../components/Notice';
import { QuietDay } from '../components/QuietDay';
import { RestSection } from '../components/RestSection';
import { SummaryCard } from '../components/SummaryCard';
import { TodayHeader } from '../components/TodayHeader';
import { HeroCard } from '../hero/HeroCard';
import { filterCounts, visibleLessons, type TodayFilter } from '../lib/timeline';
import { todayPlan } from '../lib/today-plan';
import { useDayLessons, useNow } from '../lib/use-day-lessons';
import { useLessonAction } from '../lib/use-lesson-action';

/**
 * «اليوم» (R-MOB-02, docs/29): a calm landing. The greeting and date, a summary card whose columns
 * filter the day, the hero «الحلقة التالية» (the one under way wins), «بقية اليوم» as quiet rows and
 * the ended lessons folded away; a quiet day once all is done. A tap on any lesson opens «تفاصيل
 * الحلقة», where its actions live: تأكيد / إلغاء (optimistic, R-MOB-03), «غيّر الميعاد» (R-SCH-07),
 * «عدّل الوقت» (R-SCH-11, on an ended lesson too), «حجز تعويضي» and «ادخل الحلقة». Pull to refresh;
 * offline the saved day stays with its «آخر تحديث».
 */
export function TodayScreen() {
  const now = useNow();
  const day = useDayLessons(now);
  const action = useLessonAction();
  const inset = useTabBarInset();
  const [filter, setFilter] = useState<TodayFilter>('all');
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  const details = useLessonDetails(day.data);
  const loaded = day.data !== undefined;
  const lessons = visibleLessons(day.data ?? []);
  const plan = todayPlan(lessons, filter, now);
  // Offline (no NetInfo): the refetch failed but the saved day is on screen; say how old it is.
  const stale = day.isError && loaded ? t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt)) : undefined;
  const { hero } = plan;
  const nothing = hero === null && plan.rest.length === 0 && plan.ended.length === 0;
  const actionsOf = (lesson: LessonView) => (
    <>
      <LessonRowActions lesson={lesson} action={action} onReschedule={setMoving} onEditTime={setEditing} onLeave={details.close} />
      <JoinClassroomButton lesson={lesson} />
    </>
  );

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
            <TodayHeader now={now} stale={stale} />
            {loaded && lessons.length > 0 ? <SummaryCard counts={filterCounts(lessons)} filter={filter} onFilter={setFilter} /> : null}
            {action.notice ? <Notice message={action.notice} /> : null}
            {hero ? (
              <HeroCard
                hero={hero}
                busy={action.busyId === hero.lesson.id}
                error={action.errorFor(hero.lesson.id)}
                onConfirm={() => action.confirm(hero.lesson.id)}
                onDetails={() => details.open(hero.lesson)}
              />
            ) : null}
            {plan.quiet && filter === 'all' ? <QuietDay now={now} /> : null}
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
      <LessonDetailsSheet
        lesson={details.lesson}
        role="admin"
        onClose={details.close}
        actions={actionsOf}
        sheets={
          <>
            <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
            <EditTimeSheet lesson={editing} onClose={() => setEditing(null)} />
          </>
        }
      />
    </Screen>
  );
}
