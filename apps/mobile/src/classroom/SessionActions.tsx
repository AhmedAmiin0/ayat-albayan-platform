import { isOpenLesson, type LessonView } from '@ab/shared';
import { usePermissions } from '@/auth/use-permissions';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { CopyLinkAction } from './CopyLinkAction';
import { JoinClassroomButton } from './JoinClassroomButton';
import { SendLinkAction } from './SendLinkAction';
import type { SessionGroup } from './sessions';

/** The admin's actions on a session: enter, send the link (per student), copy the link, recordings. */
export function SessionActions({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  const can = usePermissions();
  // An ended lesson's link is already past its expiry: nothing to send or copy.
  const open = isOpenLesson(lesson.status) && group !== 'ended';
  return (
    <View style={{ gap: 8, alignItems: 'stretch' }}>
      <JoinClassroomButton lesson={lesson} />
      {open && can('classroom.links') && lesson.students.map((s) => (
        <SendLinkAction key={s.id} lessonId={lesson.id} student={s} named={lesson.students.length > 1} />
      ))}
      {open && can('classroom.host') ? <CopyLinkAction lessonId={lesson.id} /> : null}
      <Button
        variant="ghost"
        label={t.classroom.recordings.title}
        onPress={() => router.push(`/more/live/recordings/${lesson.id}`)}
      />
    </View>
  );
}
