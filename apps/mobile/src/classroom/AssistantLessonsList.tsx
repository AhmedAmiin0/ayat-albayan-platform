import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { riyadhTime } from '@/today/lesson-text';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { type, useTheme } from '@/theme';
import { useAssistantLessons } from './assistants-api';
import { joinableOf } from './assistant-lessons';
import { JoinClassroomButton } from './JoinClassroomButton';

const A = t.classroom.assistants;

/**
 * The classroom TA's day (`GET /assistants/me/lessons`): time, students, teacher, «ادخل الحلقة».
 * Reusable and NOT mounted yet: the mobile auth gate admits admin and teacher only; a later task
 * decides the assistant's shell and passes the day's [from, to).
 */
export function AssistantLessonsList({ day }: { day: { from: string; to: string } }) {
  const { color } = useTheme();
  const lessons = useAssistantLessons(day);
  if (lessons.isPending) return <AppText>{t.common.loading}</AppText>;
  if (lessons.isError && !lessons.data) return <ErrorState onRetry={() => void lessons.refetch()} />;
  const open = (lessons.data ?? []).flatMap((l) => {
    const lesson = joinableOf(l);
    return lesson ? [{ l, lesson }] : [];
  });
  if (open.length === 0) return <EmptyState title={A.homeEmpty} />;
  return (
    <View style={{ gap: 12 }}>
      {open.map(({ l, lesson }) => (
        <View key={l.lesson_id} style={{ gap: 4 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
            {riyadhTime(l.starts_at)}
          </AppText>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
            {`${A.student} ${l.student_names.join(t.common.listSeparator)}`}
          </AppText>
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>{`${A.teacher} ${l.teacher_name}`}</AppText>
          <JoinClassroomButton lesson={lesson} />
        </View>
      ))}
    </View>
  );
}
