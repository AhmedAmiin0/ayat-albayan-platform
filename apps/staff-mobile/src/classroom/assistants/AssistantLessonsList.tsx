import { View } from 'react-native';
import { t, AppText, EmptyState, ErrorState } from '@ab/mobile-kit';
import { useAssistantLessons } from './assistants-api';
import { joinableRows } from './assistant-lessons';
import { AssistantLessonItem } from './AssistantLessonItem';

const A = t.classroom.assistants;

/** Mounted by AssistantHomeScreen, which passes the day's [from, to) and its empty line. */
export function AssistantLessonsList({
  day,
  emptyTitle = A.homeEmpty,
}: {
  day: { from: string; to: string };
  emptyTitle?: string;
}) {
  const lessons = useAssistantLessons(day);
  if (lessons.isPending) return <AppText>{t.common.loading}</AppText>;
  if (lessons.isError && !lessons.data)
    return <ErrorState onRetry={() => void lessons.refetch()} />;
  const open = joinableRows(lessons.data ?? []);
  if (open.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <View style={{ gap: 12 }}>
      {open.map(({ view, lesson }) => (
        <AssistantLessonItem key={view.lesson_id} view={view} lesson={lesson} />
      ))}
    </View>
  );
}
