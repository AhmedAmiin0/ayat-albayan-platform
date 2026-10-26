import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { addDays, riyadhNoon, riyadhToday } from '@/calendar/lib/week';
import { t } from '@/core/lib/i18n/i18n';
import { useJoinWindow } from '@/core/lib/query/public-config';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { AppText } from '@/core/ui/primitives/AppText';
import { useDayLessons } from '@/today/use-day-lessons';
import { DaySwitcher } from './DaySwitcher';
import { SessionGroupList } from './SessionGroupList';
import { groupSessions, SESSION_GROUPS } from './sessions';
import { useMinuteClock } from './use-minute-clock';

/**
 * «الحلقات المباشرة» (admin): every teacher's lessons of a Riyadh day in three groups (now,
 * upcoming, ended), each with enter / send link / copy link / recordings. Mirrors the web
 * /admin/classrooms; the day shares Today's cache key, so a lesson change refreshes both.
 */
export function AdminSessionsScreen() {
  const now = useMinuteClock();
  const win = useJoinWindow();
  const today = riyadhToday(now);
  const [date, setDate] = useState(today);
  const lessons = useDayLessons(riyadhNoon(date));
  const groups = groupSessions(lessons.data ?? [], now, win);
  const none = SESSION_GROUPS.every((g) => groups[g].length === 0);
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  let body = <AppText>{t.common.loading}</AppText>;
  if (lessons.isError && !lessons.data) body = <ErrorState onRetry={() => void lessons.refetch()} />;
  else if (lessons.data && none) body = <EmptyState title={t.classroom.admin.empty} />;
  else if (lessons.data) body = <SessionGroupList groups={groups} />;
  return (
    <Screen>
      <ScreenHeader title={t.mobileClassroom.title} trailing={back} />
      <DaySwitcher date={date} isToday={date === today} onStep={(n) => setDate(addDays(date, n))} onToday={() => setDate(today)} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ gap: 16 }}>{body}</View>
      </ScrollView>
    </Screen>
  );
}
