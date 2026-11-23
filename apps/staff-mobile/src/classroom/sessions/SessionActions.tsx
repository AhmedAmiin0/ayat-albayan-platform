import { isOpenLesson, type LessonView } from '@ab/schedule';
import type { SessionGroup } from '@ab/client-core';
import { usePermissions, t, Button } from '@ab/mobile-kit';
import { router } from 'expo-router';
import { View } from 'react-native';
import { CopyLinkAction } from '@/classroom/links/CopyLinkAction';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { SendLinkAction } from '@/classroom/links/SendLinkAction';

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
        variant="secondary"
        label={t.classroom.recordings.title}
        onPress={() => router.push(`/more/live/recordings/${lesson.id}`)}
      />
    </View>
  );
}
