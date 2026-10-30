import { lessonStatusStyle, localizedName, type SalesScheduleLesson } from '@ab/shared';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo, View } from 'react-native';
import { useLessonDetails } from '@/calendar';
import { SchedulePeriod } from '@/calendar/overview/SchedulePeriod';
import { riyadhToday } from '@/calendar/lib/week';
import { useNow } from '@/core/lib/time/use-now';
import { t } from '@/core/lib/i18n/i18n';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { locale } from '@/core/lib/i18n/locale';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useSalesSchedule, useSalesTeachers } from '../lib/sales-api';
import { SalesLessonRow } from '../components/SalesLessonRow';
import { SalesLessonSheet } from '../components/SalesLessonSheet';
import { byScheduleStatus, SCHEDULE_STATUSES, scheduleStatusCounts, type ScheduleStatus } from '../lib/schedule-status';
import { usePullRefresh } from '@/core/lib/query/pull-refresh';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A status pill that hides the day's lessons says so; else the day (or the teacher's day) is empty. */
function emptyTitle(filteredOut: boolean, teacherId: string): string {
  const s = t.sales.academySchedule;
  if (filteredOut) return s.status.empty;
  return teacherId ? s.emptyTeacher : s.empty;
}

/**
 * «جدول الحلقات» of the salesperson (web /sales/schedule): one Riyadh day of the academy; she may move
 * or cancel any lesson not over yet, one at a time (docs/16 row 37, any lesson: owner 2026-10-28),
 * a day at a time (the admin schedule's switcher) and one teacher or all. A tap on a lesson opens its
 * «تفاصيل الحلقة», which holds every action («ادخل الحلقة» first while it runs; no buttons on the rows).
 * `?teacherId=` opens it on a teacher (from «المعلمون»), that teacher's pill right after «كل المعلمين» so
 * the filter is in view; `?date=` on a day. `asTab`: the sales tree's «جدول الحلقات» tab (no «رجوع»). The
 * compact top (owner 2026-10-28; UX review 2026-10-29: no permissions note, the sheet says what she may
 * do): an h2 title, the day switcher, the teacher pills and the status pills (UX review #6: «الكل» /
 * «للتأكيد» / «مؤكدة» / «ملغاة» with the day's counts), each pill group ONE row that scrolls sideways, 8pt
 * apart; the day's lessons in one inset card. Under «للتأكيد» or «مؤكدة» the rows drop the status word
 * they all share; «ملغاة» groups two statuses, so its rows keep who cancelled.
 */
export function SalesScheduleScreen({ asTab = false }: { asTab?: boolean }) {
  const { color } = useTheme();
  const params = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  const now = useNow();
  // academy day (docs/34 b): GET /sales/schedule `?date` is a Riyadh day.
  const today = riyadhToday(now);
  const tz = useViewerTz();
  const [date, setDate] = useFollowingDay(today, params.date && DATE.test(params.date) ? params.date : undefined);
  const [teacherId, setTeacherId] = useState(params.teacherId ?? '');
  const [status, setStatus] = useState<ScheduleStatus>('all');
  const day = useSalesSchedule(date, teacherId);
  const pull = usePullRefresh(day.refetch);
  const teachers = useSalesTeachers();
  const details = useLessonDetails(day.data?.lessons);
  const inset = useTabBarInset();
  // The teacher she came for leads (from the params, so the pills never reorder on a tap).
  const list = teachers.data ?? [];
  const ordered = [...list.filter((tc) => tc.id === params.teacherId), ...list.filter((tc) => tc.id !== params.teacherId)];
  const pills = [
    { value: '', label: t.schedule.allTeachers },
    ...ordered.map((tc) => ({ value: tc.id, label: localizedName({ ar: tc.name, en: tc.name_en }, locale) })),
  ];
  const open = details.open;
  const row = useCallback(
    ({ item }: ListRenderItemInfo<SalesScheduleLesson>) => (
      <SalesLessonRow lesson={item} onOpen={open} hideStatus={status === 'scheduled' || status === 'confirmed'} />
    ),
    [open, status],
  );
  const all = day.data?.lessons ?? [];
  const counts = scheduleStatusCounts(all);
  const statuses = SCHEDULE_STATUSES.map((value) => ({
    value,
    label: t.sales.academySchedule.status[value],
    count: day.data ? counts[value] : undefined,
    ...(value === 'all' ? {} : lessonStatusStyle[value === 'cancelled' ? 'cancelled_by_admin' : value]),
  }));
  const lessons = byScheduleStatus(all, status);
  const cells = useInsetRows(row, lessons.length);
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.academySchedule.title}
        size="h2"
        connecting
        subtitle={zoneNote(tz)}
        trailing={asTab ? undefined : <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <View style={{ gap: 8 }}>
        <SchedulePeriod view="day" date={date} today={today} onDate={setDate} />
        <FilterPills accessibilityLabel={t.schedule.teacherFilter} items={pills} value={teacherId} onChange={setTeacherId} />
        <FilterPills accessibilityLabel={t.sales.academySchedule.status.label} items={statuses} value={status} onChange={setStatus} />
      </View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        accessibilityLabel={t.schedule.dayBoard}
        data={lessons}
        keyExtractor={(l) => l.id}
        {...cells}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        ListEmptyComponent={
          day.data ? (
            <EmptyState title={emptyTitle(status !== 'all' && all.length > 0, teacherId)} />
          ) : day.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void day.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
      <SalesLessonSheet lesson={details.lesson} onClose={details.close} />
    </Screen>
  );
}
