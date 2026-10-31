import { counted, formatRunningHead } from '@ab/shared';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { LiveSessions } from '@/live/LiveSessions';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { Note } from '@/core/ui/feedback/Note';
import { BellButton } from '@/notifications/BellButton';
import { Notice } from '@/today/components/Notice';
import { localDate } from '@/today/lib/timeline';
import { useGreeting } from '@/today';
import { useNow } from '@/core/lib/time/use-now';
import { useLessonAction } from '@/today/lib/use-lesson-action';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { dayWindow, lessonsOn, reportAction } from '@/teacher/lib/day';
import { useMyLessons, usePendingReports } from '@/teacher/lib/queries';
import { TeacherLessonCard } from '@/teacher/components/TeacherLessonCard';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

const cities: Record<string, string | undefined> = t.tz;

/**
 * «تقريرين مستنيين» with the way to them, while any report is still to write: the chip, then a full-width
 * secondary button under it (docs/07 §6: no shrink-wrapped multi-word button, ghost is for headers).
 */
function PendingBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View testID="pending-banner" style={{ alignItems: 'flex-start', gap: 8 }}>
      <StatusChip tone="act" glyph="hollow" label={counted(t.reports.pendingCount, count)} />
      <View style={{ alignSelf: 'stretch' }}>
        <Button variant="secondary" label={t.reports.pending} onPress={() => router.push('/teacher/reports')} />
      </View>
    </View>
  );
}

/**
 * «اليوم» (R-TCH-03, R-MOB-02): my lessons today on my own clock, «تأكيد» (optimistic, rolls back
 * if refused), «ادخل الحلقة», and «اكتب التقرير» once a lesson started. Pull to refresh; offline
 * the saved day stays with its «آخر تحديث» (R-MOB-03).
 */
export function TeacherTodayScreen() {
  const cycle = useClockCycle();
  const now = useNow();
  const tz = useViewerTz();
  const today = localDate(now, tz);
  const day = useMyLessons(dayWindow(today));
  const pending = usePendingReports();
  const action = useLessonAction();
  const inset = useTabBarInset();
  const greeting = useGreeting(now);
  const lessons = lessonsOn(day.data ?? [], today, tz);
  const loaded = day.data !== undefined;
  const dateLine = `${formatRunningHead(now, locale).gregorian}. ${t.availability.tzHint.replace('{tz}', cities[tz] ?? tz)}`;
  const stale = day.isError && loaded;
  return (
    <Screen list>
      {/* The greeting is the header (owner 2026-10-28: the tab already says «اليوم»). */}
      <ScreenHeader
        title={greeting}
        size="h2"
        connecting
        trailing={<BellButton tree="teacher" />}
        subtitle={stale ? `${dateLine} · ${t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt, cycle, tz))}` : dateLine}
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
