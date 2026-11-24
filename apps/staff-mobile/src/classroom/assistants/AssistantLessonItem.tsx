import type { AssistantLessonView } from '@ab/schedule';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import { lessonClock } from '@/today';
import type { JoinableLesson } from '@/classroom/links/JoinClassroomButton';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';

const A = t.classroom.assistants;

export function AssistantLessonItem({ view, lesson }: { view: AssistantLessonView; lesson: JoinableLesson }) {
  const { color } = useTheme();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {lessonClock(view.starts_at, tz, cycle)}
      </AppText>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
        {`${A.student} ${view.student_names.join(t.common.listSeparator)}`}
      </AppText>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>{`${A.teacher} ${view.teacher_name}`}</AppText>
      <JoinClassroomButton lesson={lesson} />
    </View>
  );
}
