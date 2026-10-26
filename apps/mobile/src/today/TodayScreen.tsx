import { formatRunningHead, lessonStatusStyle, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { EditTimeSheet } from '@/edit-time/components/EditTimeSheet';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { BellButton } from '@/notifications/BellButton';
import { LiveSessions } from '@/live/LiveSessions';
import { RescheduleSheet } from '@/reschedule/RescheduleSheet';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { LessonCard } from './LessonCard';
import { NowLine } from './NowLine';
import { Notice } from './Notice';
import { PastLessonRow } from './PastLessonRow';
import {
  applyFilter,
  filterCounts,
  timeline,
  timelineKey,
  visibleLessons,
  type TodayFilter,
} from './timeline';
import { TimelineRow } from './TimelineRow';
import { riyadhTime } from './lesson-text';
import { useDayLessons, useNow } from './use-day-lessons';
import { useLessonAction } from './use-lesson-action';

const filterPills = (): FilterPill<TodayFilter>[] => [
  { value: 'all', label: t.today.all },
  ...(['scheduled', 'confirmed', 'completed'] as const).map((s) => ({
    value: s,
    label: t.enums.lessonStatus[s],
    ...lessonStatusStyle[s],
  })),
];

/**
 * «النهارده» (R-MOB-02, docs/07 §12): every teacher's lessons today on one spine. Ended lessons
 * are one line each, a «دلوقتي» line marks the time, the rest are cards with تأكيد / إلغاء
 * (optimistic, R-MOB-03), «غيّر الميعاد» (the reschedule sheet, R-SCH-07) and «عدّل الوقت» (the
 * in-place edit sheet, R-SCH-11, also on an ended lesson). Pull to refresh;
 * offline the saved day stays with its «آخر تحديث».
 * TODO(R-MOB-02): Hijri date from the API (Hermes ICU has no reliable islamic-umalqura, docs/07 §2).
 */
export function TodayScreen() {
  const now = useNow();
  const day = useDayLessons(now);
  const action = useLessonAction();
  const inset = useTabBarInset();
  const [filter, setFilter] = useState<TodayFilter>('all');
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  const loaded = day.data !== undefined;
  const lessons = visibleLessons(day.data ?? []);
  const counts = filterCounts(lessons);
  const items = timeline(applyFilter(lessons, filter), now);
  const pills = loaded ? filterPills().map((p) => ({ ...p, count: counts[p.value] })) : filterPills();
  const dateLine = `${formatRunningHead(now, locale).gregorian}. ${t.availability.tzHint.replace('{tz}', t.runningHead.riyadh)}`;
  // Offline (no NetInfo): the refetch failed but the saved day is on screen; say how old it is.
  const stale = day.isError && loaded;
  const subtitle = stale
    ? `${dateLine} · ${t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt))}`
    : dateLine;

  return (
    <Screen list>
      <ScreenHeader title={t.today.title} subtitle={subtitle} trailing={<BellButton tree="admin" />} />
      <LiveSessions lessons={lessons} showTeacher />
      <FilterPills
        items={pills}
        value={filter}
        onChange={setFilter}
        accessibilityLabel={t.today.statusFilter}
      />
      {action.notice ? <Notice message={action.notice} /> : null}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        // The cancel reason is typed inside the list: a tap on «إلغاء الحلقة» must land with the keyboard up.
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        data={items}
        keyExtractor={timelineKey}
        renderItem={({ item }) => {
          if (item.kind === 'now') return <NowLine now={now} />;
          if (item.kind === 'past') return <PastLessonRow lesson={item.lesson} onEditTime={setEditing} />;
          const { lesson } = item;
          return (
            <TimelineRow time={riyadhTime(lesson.starts_at)} status={lesson.status}>
              <LessonCard
                lesson={lesson}
                busy={action.busyId === lesson.id}
                error={action.errorFor(lesson.id)}
                onConfirm={() => action.confirm(lesson.id)}
                onCancel={(cancel) => action.cancel(lesson.id, cancel)}
                onReschedule={() => setMoving(lesson)}
                onEditTime={() => setEditing(lesson)}
              />
            </TimelineRow>
          );
        }}
        refreshing={day.isRefetching}
        onRefresh={() => void day.refetch()}
        ListEmptyComponent={
          day.isPending ? null : loaded ? (
            <EmptyState title={filter === 'all' ? t.today.empty : t.today.emptyFilter} />
          ) : (
            <ErrorState onRetry={() => void day.refetch()} />
          )
        }
      />
      <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
      <EditTimeSheet lesson={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
