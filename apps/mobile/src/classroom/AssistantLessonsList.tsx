import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { useAssistantLessons } from './assistants-api';
import { joinableRows } from './assistant-lessons';
import { AssistantLessonItem } from './AssistantLessonItem';

const A = t.classroom.assistants;

/**
 * The classroom TA's day (`GET /assistants/me/lessons`): time, students, teacher, «ادخل الحلقة».
 * Reusable and NOT mounted yet: the mobile auth gate admits admin and teacher only; a later task
 * decides the assistant's shell and passes the day's [from, to).
 */
export function AssistantLessonsList({ day }: { day: { from: string; to: string } }) {
  const lessons = useAssistantLessons(day);
  if (lessons.isPending) return <AppText>{t.common.loading}</AppText>;
  if (lessons.isError && !lessons.data) return <ErrorState onRetry={() => void lessons.refetch()} />;
  const open = joinableRows(lessons.data ?? []);
  if (open.length === 0) return <EmptyState title={A.homeEmpty} />;
  return (
    <View style={{ gap: 12 }}>
      {open.map(({ view, lesson }) => (
        <AssistantLessonItem key={view.lesson_id} view={view} lesson={lesson} />
      ))}
    </View>
  );
}
