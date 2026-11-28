import type { SalesScheduleLesson } from '@ab/shared';
import { localizedName } from '@ab/core';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLessonDetails, riyadhToday } from '@/calendar';
import { SchedulePeriod } from '@/calendar/overview/SchedulePeriod';
import {
  BackButton,
  EmptyState,
  ErrorState,
  FilterPills,
  LazyList,
  locale,
  Screen,
  ScreenHeader,
  t,
  useNow,
  usePullRefresh,
  useTheme,
} from '@ab/mobile-kit';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { useSalesSchedule, useSalesTeachers } from '@/sales/sales/lib/sales-api';
import { SalesLessonRow } from '@/sales/sales/components/SalesLessonRow';
import { SalesLessonSheet } from '@/sales/sales/components/SalesLessonSheet';
import {
  byScheduleStatus,
  SCHEDULE_STATUSES,
  scheduleStatusCounts,
  statusPill,
  type ScheduleStatus,
} from '@/sales/sales/lib/schedule-status';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A status pill that hides the day's lessons says so; else the day (or teacher's day) is empty. */
function emptyTitle(filteredOut: boolean, teacherId: string): string {
  const s = t.sales.academySchedule;
  if (filteredOut) return s.status.empty;
  return teacherId ? s.emptyTeacher : s.empty;
}

/** She may move or cancel any lesson not over, one at a time (docs/16 row 37). */
export function SalesScheduleScreen({ asTab = false }: { asTab?: boolean }) {
  const { color } = useTheme();
  const params = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  const now = useNow();
  // academy day (docs/34 b): GET /sales/schedule `?date` is a Riyadh day.
  const today = riyadhToday(now);
  const tz = useViewerTz();
  const [date, setDate] = useFollowingDay(
    today,
    params.date && DATE.test(params.date) ? params.date : undefined,
  );
  const [teacherId, setTeacherId] = useState(params.teacherId ?? '');
  const [status, setStatus] = useState<ScheduleStatus>('all');
  const day = useSalesSchedule(date, teacherId);
  const pull = usePullRefresh(day.refetch);
  const teachers = useSalesTeachers();
  const details = useLessonDetails(day.data?.lessons);
  // The teacher she came for leads (from the params, so the pills never reorder on a tap).
  const list = teachers.data ?? [];
  const ordered = [
    ...list.filter((tc) => tc.id === params.teacherId),
    ...list.filter((tc) => tc.id !== params.teacherId),
  ];
  const pills = [
    { value: '', label: t.schedule.allTeachers },
    ...ordered.map((tc) => ({
      value: tc.id,
      label: localizedName({ ar: tc.name, en: tc.name_en }, locale),
    })),
  ];
  const open = details.open;
  const hideStatus = status === 'scheduled' || status === 'confirmed';
  const row = ({ item }: { item: SalesScheduleLesson }) => (
    <SalesLessonRow lesson={item} onOpen={open} hideStatus={hideStatus} />
  );
  const all = day.data?.lessons ?? [];
  const counts = scheduleStatusCounts(all);
  const statusText = useLessonStatusText();
  const statuses = SCHEDULE_STATUSES.map((value) => ({
    value,
    count: day.data ? counts[value] : undefined,
    ...statusPill(value, statusText),
  }));
  const lessons = byScheduleStatus(all, status);
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.academySchedule.title}
        size="h2"
        connecting
        subtitle={zoneNote(tz)}
        leading={asTab ? undefined : <BackButton onPress={() => router.back()} />}
      />
      <View style={{ gap: 8 }}>
        <SchedulePeriod view="day" date={date} today={today} onDate={setDate} />
        <FilterPills
          accessibilityLabel={t.schedule.teacherFilter}
          items={pills}
          value={teacherId}
          onChange={setTeacherId}
        />
        <FilterPills
          accessibilityLabel={t.sales.academySchedule.status.label}
          items={statuses}
          value={status}
          onChange={setStatus}
        />
      </View>
      <LazyList
        testID="day-board"
        accessibilityLabel={t.schedule.dayBoard}
        data={lessons}
        keyExtractor={(l) => l.id}
        renderItem={row}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        ListEmptyComponent={
          day.data ? (
            <EmptyState title={emptyTitle(status !== 'all' && all.length > 0, teacherId)} />
          ) : day.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void day.refetch()} />
          ) : (
            <ActivityIndicator
              accessibilityLabel={t.common.loading}
              color={color.lapis}
              style={{ paddingVertical: 32 }}
            />
          )
        }
      />
      <SalesLessonSheet lesson={details.lesson} onClose={details.close} />
    </Screen>
  );
}
