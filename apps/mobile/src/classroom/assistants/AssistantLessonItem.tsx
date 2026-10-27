import type { AssistantLessonView } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { riyadhTime } from '@/today/lib/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { JoinableLesson } from '../links/JoinClassroomButton';
import { JoinClassroomButton } from '../links/JoinClassroomButton';

const A = t.classroom.assistants;

/** One assistant's session: time, students, teacher, «ادخل الحلقة» (the TA's day and the sales «الحلقات الجارية»). */
export function AssistantLessonItem({ view, lesson }: { view: AssistantLessonView; lesson: JoinableLesson }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {riyadhTime(view.starts_at, useClockCycle())}
      </AppText>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
        {`${A.student} ${view.student_names.join(t.common.listSeparator)}`}
      </AppText>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>{`${A.teacher} ${view.teacher_name}`}</AppText>
      <JoinClassroomButton lesson={lesson} />
    </View>
  );
}
