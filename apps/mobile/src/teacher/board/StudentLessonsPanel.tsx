import { attendanceRate, studentLessons, type AttendanceCounts, type LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { LazyList } from '@/core/ui/lists/LazyList';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { fill } from '@/sales/sales';
import { useMyLessons } from '@/teacher/lib/queries';
import { type, useTheme } from '@/theme';
import { BoardLessonRow } from './BoardLessonRow';
import { boardWindow } from './board-window';

const w = t.teacherBoard;
const keyOf = (l: LessonView) => l.id;

/** «حضر 3 · غاب 1 · نسبة الحضور 75%» (the rate once something was marked). */
function countsLine(counts: AttendanceCounts): string {
  const rate = attendanceRate(counts);
  const parts = [
    fill(w.counts, { present: String(counts.present), absent: String(counts.absent) }),
    rate === null ? null : fill(w.rate, { rate: String(rate) }),
  ];
  return parts.filter((p): p is string => p !== null).join(' · ');
}

/** The window's lessons failed to load, or are still on their way. */
function Waiting({ failed, retry }: { failed: boolean; retry: () => void }) {
  return failed ? <ErrorState onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

/**
 * «الحلقات» of one of my students on the board (docs/46 C7): her lessons with them over the board
 * window (14 days back, 14 ahead, her zone), the window's counts and attendance rate
 * (studentLessons, attendanceRate, the same as the web board), then «سجل الحضور» for every month.
 */
export function StudentLessonsPanel({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const now = useNow();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const lessons = useMyLessons(boardWindow(now, tz));
  const board = studentLessons(lessons.data ?? [], { studentId, now });
  const at = { now, tz, cycle };
  const line = { fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink };
  const retry = () => void lessons.refetch();
  if (!lessons.data) return <Waiting failed={lessons.isError} retry={retry} />;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View accessibilityRole="summary" style={{ gap: 2 }}>
        <AppText style={line}>{countsLine(board.counts)}</AppText>
        <Note>{w.window}</Note>
      </View>
      <Button
        variant="secondary"
        label={w.attendanceLog}
        onPress={() => router.push(`/teacher/reports/student/attendance/${studentId}`)}
      />
      <LazyList
        data={board.lessons}
        keyExtractor={keyOf}
        tabBar={false}
        extraData={cycle}
        renderItem={({ item }) => <BoardLessonRow lesson={item} studentId={studentId} at={at} />}
        refreshing={lessons.isRefetching}
        onRefresh={retry}
        ListEmptyComponent={<EmptyState title={w.noLessons} />}
      />
    </View>
  );
}
