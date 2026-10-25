import { counted, formatRunningHead, RIYADH_TZ } from '@ab/shared';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { LiveSessions } from '@/live/LiveSessions';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { Note } from '@/more/Note';
import { BellButton } from '@/notifications/BellButton';
import { Notice } from '@/today/Notice';
import { localDate } from '@/today/timeline';
import { useNow } from '@/today/use-day-lessons';
import { useLessonAction } from '@/today/use-lesson-action';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { dayWindow, lessonsOn, reportAction } from './day';
import { useMyLessons, usePendingReports, useTeacherMe } from './queries';
import { TeacherLessonCard } from './TeacherLessonCard';

const cities: Record<string, string | undefined> = t.tz;

/** «تقريرين مستنيين» with the way to them, while any report is still to write. */
function PendingBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <StatusChip tone="act" glyph="hollow" label={counted(t.reports.pendingCount, count)} />
      <Button variant="ghost" label={t.reports.pending} onPress={() => router.push('/teacher/reports')} />
    </View>
  );
}

/**
 * «اليوم» (R-TCH-03, R-MOB-02): my lessons today on my own clock, «تأكيد» (optimistic, rolls back
 * if refused), «ادخل الحلقة», and «اكتب التقرير» once a lesson started. Pull to refresh; offline
 * the saved day stays with its «آخر تحديث» (R-MOB-03).
 */
export function TeacherTodayScreen() {
  const now = useNow();
  const tz = useTeacherMe().data?.tz ?? RIYADH_TZ;
  const today = localDate(now, tz);
  const day = useMyLessons(dayWindow(today));
  const pending = usePendingReports();
  const action = useLessonAction();
  const inset = useTabBarInset();
  const lessons = lessonsOn(day.data ?? [], today, tz);
  const loaded = day.data !== undefined;
  const dateLine = `${formatRunningHead(now, locale).gregorian}. ${t.availability.tzHint.replace('{tz}', cities[tz] ?? tz)}`;
  const stale = day.isError && loaded;
  return (
    <Screen list>
      <ScreenHeader
        title={t.teacherNav.today}
        trailing={<BellButton tree="teacher" />}
        subtitle={stale ? `${dateLine} · ${t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt))}` : dateLine}
      />
      <LiveSessions lessons={lessons} />
      <PendingBanner count={pending.data?.length ?? 0} />
      {action.notice ? <Notice message={action.notice} /> : null}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 + inset }}
        data={lessons}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => (
          <TeacherLessonCard
            lesson={item}
            tz={tz}
            report={reportAction(item, pending.data, now)}
            busy={action.busyId === item.id}
            error={action.errorFor(item.id)}
            onConfirm={() => action.confirm(item.id)}
            onReport={() => router.push(`/teacher/today/report/${item.id}`)}
          />
        )}
        refreshing={day.isRefetching}
        onRefresh={() => {
          void day.refetch();
          void pending.refetch();
        }}
        ListEmptyComponent={
          day.isPending ? (
            <Note>{t.common.loading}</Note>
          ) : loaded ? (
            <View style={{ gap: 8 }}>
              <EmptyState title={t.teacherDash.noLessonsToday} />
              <Note>{t.teacherDash.emptyHint}</Note>
            </View>
          ) : (
            <ErrorState onRetry={() => void day.refetch()} message={t.teacherDash.loadError} />
          )
        }
      />
    </Screen>
  );
}
