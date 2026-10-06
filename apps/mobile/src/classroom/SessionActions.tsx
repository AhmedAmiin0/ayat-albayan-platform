import { isOpenLesson, type LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { CopyLinkAction } from './CopyLinkAction';
import { JoinClassroomButton } from './JoinClassroomButton';
import { SendLinkAction } from './SendLinkAction';

/** The admin's actions on a session: enter, send the link (per student), copy the link, recordings. */
export function SessionActions({ lesson }: { lesson: LessonView }) {
  const open = isOpenLesson(lesson.status);
  return (
    <View style={{ gap: 8, alignItems: 'stretch' }}>
      <JoinClassroomButton lesson={lesson} />
      {open && lesson.students.map((s) => (
        <SendLinkAction key={s.id} lessonId={lesson.id} student={s} named={lesson.students.length > 1} />
      ))}
      {open ? <CopyLinkAction lessonId={lesson.id} /> : null}
      <Button
        variant="ghost"
        label={t.classroom.recordings.title}
        onPress={() => router.push(`/more/live/recordings/${lesson.id}`)}
      />
    </View>
  );
}
