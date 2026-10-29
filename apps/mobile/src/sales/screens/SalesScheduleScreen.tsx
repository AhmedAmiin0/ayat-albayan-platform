import { localizedName, type SalesScheduleLesson } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo, View } from 'react-native';
import { usePermissions } from '@/auth';
import { useLessonDetails } from '@/calendar';
import { SchedulePeriod } from '@/calendar/overview/SchedulePeriod';
import { riyadhToday } from '@/calendar/lib/week';
import { useNow } from '@/core/lib/time/use-now';
import { t } from '@/core/lib/i18n/i18n';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { locale } from '@/core/lib/i18n/locale';
import { Note } from '@/more/Note';
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
 * a day at a time (the admin schedule's switcher) and one teacher or all; «ادخل الحلقة» on a running
 * lesson; a tap on a lesson opens its «تفاصيل الحلقة». `?teacherId=` opens it on a teacher (from «المعلمون»), `?date=` on a day. `asTab`: the sales
 * tree's «جدول الحلقات» tab (no «رجوع»). The compact top (owner 2026-10-28): an h2 title, the note, the day
 * switcher, the teacher pills and the status pills (UX review #6: «الكل» / «يحتاج تأكيد» / «مؤكدة» / «ملغاة»
 * with the day's counts, wrapping on a narrow phone) 8pt apart; the day's lessons in one inset card.
 */
export function SalesScheduleScreen({ asTab = false }: { asTab?: boolean }) {
  const { color } = useTheme();
  const params = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  const now = useNow();
  const today = riyadhToday(now);
  const [date, setDate] = useFollowingDay(today, params.date && DATE.test(params.date) ? params.date : undefined);
  const [teacherId, setTeacherId] = useState(params.teacherId ?? '');
  const [status, setStatus] = useState<ScheduleStatus>('all');
  const day = useSalesSchedule(date, teacherId);
  const teachers = useSalesTeachers();
  const details = useLessonDetails(day.data?.lessons);
  const inset = useTabBarInset();
  const can = usePermissions();
  // docs/16 rows 37, 37b: she may move, cancel or confirm any lesson (owner 2026-10-28).
  const changes = can('lessons.reschedule') || can('lessons.cancel') || can('lessons.confirm');
  const pills = [
    { value: '', label: t.schedule.allTeachers },
    ...(teachers.data ?? []).map((tc) => ({ value: tc.id, label: localizedName({ ar: tc.name, en: tc.name_en }, locale) })),
  ];
  const open = details.open;
  const row = useCallback(({ item }: ListRenderItemInfo<SalesScheduleLesson>) => <SalesLessonRow lesson={item} onOpen={open} />, [open]);
  const all = day.data?.lessons ?? [];
  const counts = scheduleStatusCounts(all);
  const statuses = SCHEDULE_STATUSES.map((value) => ({ value, label: t.sales.academySchedule.status[value], count: day.data ? counts[value] : undefined }));
  const lessons = byScheduleStatus(all, status);
  const cells = useInsetRows(row, lessons.length);
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.academySchedule.title}
        size="h2"
        connecting
        subtitle={t.schedule.riyadhTime}
        trailing={asTab ? undefined : <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <View style={{ gap: 8 }}>
        <Note>{changes ? t.sales.lessonActions.ownNote : t.sales.academySchedule.readOnly}</Note>
        <SchedulePeriod view="day" date={date} today={today} onDate={setDate} />
        <FilterPills accessibilityLabel={t.schedule.teacherFilter} items={pills} value={teacherId} onChange={setTeacherId} />
        <FilterPills accessibilityLabel={t.sales.academySchedule.status.label} items={statuses} value={status} onChange={setStatus} wrap />
      </View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        accessibilityLabel={t.schedule.dayBoard}
        data={lessons}
        keyExtractor={(l) => l.id}
        {...cells}
        refreshing={day.isRefetching}
        onRefresh={() => void day.refetch()}
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
