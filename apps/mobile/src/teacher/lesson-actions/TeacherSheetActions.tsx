import { wayIn } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { JoinClassroomButton } from '@/classroom';
import { usePlatformClassroom } from '@/core/lib/query/public-config';
import { TeacherLessonTools } from './TeacherLessonTools';

interface TeacherSheetActionsProps {
  lesson: LessonView;
  onDone: (text: string) => void;
}

/**
 * The teacher sheet's actions (docs/48): the classroom only when it is her way in (owner Q3: never
 * on a non-platform lesson with its own link, whose family never gets the classroom), then
 * «سأحضر» / «إلغاء الحلقة». The report button is DetailsStudents' own.
 */
export function TeacherSheetActions({ lesson, onDone }: TeacherSheetActionsProps) {
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const room = wayIn({ platform, ownLink: lesson.meeting_link }) === 'room';
  return (
    <>
      {room ? <JoinClassroomButton lesson={lesson} /> : null}
      <TeacherLessonTools lesson={lesson} onDone={onDone} />
    </>
  );
}
