import { localizedName } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SchedulePeriod } from '@/calendar/SchedulePeriod';
import { riyadhToday } from '@/calendar/week';
import { useMinuteClock } from '@/classroom/use-minute-clock';
import { t } from '@/core/lib/i18n/i18n';
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
import { useSalesSchedule, useSalesTeachers } from './sales-api';
import { SalesLessonRow } from './SalesLessonRow';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * «جدول الحلقات» of the salesperson (web /sales/schedule): one Riyadh day of the academy, read-only,
 * a day at a time (the admin schedule's switcher) and one teacher or all; «ادخل الحلقة» on a running
 * lesson. `?teacherId=` opens it on a teacher (from «المعلمون»), `?date=` on a day. `asTab`: the sales
 * tree's «جدول الحلقات» tab (no «رجوع»).
 */
export function SalesScheduleScreen({ asTab = false }: { asTab?: boolean }) {
  const { color } = useTheme();
  const params = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  const today = riyadhToday(useMinuteClock());
  const [date, setDate] = useState(params.date && DATE.test(params.date) ? params.date : today);
  const [teacherId, setTeacherId] = useState(params.teacherId ?? '');
  const day = useSalesSchedule(date, teacherId);
  const teachers = useSalesTeachers();
  const inset = useTabBarInset();
  const pills = [
    { value: '', label: t.schedule.allTeachers },
    ...(teachers.data ?? []).map((tc) => ({ value: tc.id, label: localizedName({ ar: tc.name, en: tc.name_en }, locale) })),
  ];
  const emptyTitle = teacherId ? t.sales.academySchedule.emptyTeacher : t.sales.academySchedule.empty;
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.academySchedule.title}
        subtitle={t.schedule.riyadhTime}
        trailing={asTab ? undefined : <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <View style={{ gap: 8, paddingBottom: 8 }}>
        <Note>{t.sales.academySchedule.readOnly}</Note>
        <SchedulePeriod view="day" date={date} today={today} onDate={setDate} />
        <FilterPills accessibilityLabel={t.schedule.teacherFilter} items={pills} value={teacherId} onChange={setTeacherId} />
      </View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        accessibilityLabel={t.schedule.dayBoard}
        data={day.data?.lessons ?? []}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <SalesLessonRow lesson={item} />}
        refreshing={day.isRefetching}
        onRefresh={() => void day.refetch()}
        ListEmptyComponent={
          day.data ? (
            <EmptyState title={emptyTitle} />
          ) : day.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void day.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
