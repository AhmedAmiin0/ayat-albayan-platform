import { joinPhase, wayIn, type JoinPhase } from '@ab/client-core';
import type { LessonView } from '@ab/schedule';
import type { ReactNode } from 'react';
import { JoinClassroomButton } from '@/classroom';
import { usePlatformClassroom, useJoinWindow } from '@/core/lib/query/public-config';
import { useNow } from '@ab/mobile-kit';
import { RoomJoinButton } from './RoomJoinButton';
import { TeacherLessonTools } from './TeacherLessonTools';

interface TeacherSheetActionsProps {
  lesson: LessonView;
  onDone: (text: string) => void;
}

/** The join above the tools: filled while live, outlined after the end (the report leads then). */
const JOIN_TOP: Record<JoinPhase, (lesson: LessonView) => ReactNode> = {
  live: (lesson) => <JoinClassroomButton lesson={lesson} only="open" />,
  after: (lesson) => <RoomJoinButton lesson={lesson} variant="secondary" />,
  off: () => null,
};

/** The classroom only when it is her way in, never on a non-platform lesson with its own link. */
export function TeacherSheetActions({ lesson, onDone }: TeacherSheetActionsProps) {
  const now = useNow();
  const win = useJoinWindow();
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const room = wayIn({ platform, ownLink: lesson.meeting_link }) === 'room';
  const phase = room ? joinPhase(lesson, now, win) : 'off';
  return (
    <>
      {JOIN_TOP[phase](lesson)}
      <TeacherLessonTools lesson={lesson} onDone={onDone} />
      {room ? <JoinClassroomButton lesson={lesson} only="waiting" /> : null}
    </>
  );
}
