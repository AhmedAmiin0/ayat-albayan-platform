import type { RoomJoinResult } from '@ab/schedule';
import { createPortal } from 'react-dom';
import { holdRoomOpen } from '@ab/web-kit/boot/maintenance';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useRoomContext, type RoomLesson } from '@ab/web-kit/portal/lessons/room/RoomContext';
import { useRoomChat } from '@ab/web-kit/portal/lessons/room/use-room-chat';
import { useRoomRejoin } from '@ab/web-kit/portal/lessons/room/use-room-rejoin';

interface Props {
  join: RoomJoinResult;
  /** Back to the card; without `about` it is also the rejoin. */
  onRejoin: () => void;
  /** The lesson and student the card joined: the top line, the chat, and the room's own rejoin. */
  about?: RoomLesson;
}

/** One modal surface for every card that joins; never a dead end. */
export function RoomOverlay({ join, onRejoin, about }: Props) {
  const lesson = about ?? null;
  const ids = lesson && { lessonId: lesson.lesson.id, studentId: lesson.student.id };
  const entry = useRoomRejoin({ first: join, ids });
  const context = useRoomContext(lesson);
  const chat = useRoomChat(lesson?.student ?? null, entry.join);
  // On document.body: a fading page (animate-* keeps a stacking context) never caps its z-index
  // under the shell's sticky header and bottom bar.
  return createPortal(
    <div
      ref={holdRoomOpen}
      role="dialog"
      aria-modal="true"
      aria-label={t.portal.roomTitle}
      className="fixed inset-0 z-50 animate-fade-in overflow-auto bg-page"
    >
      <ClassroomRoom
        key={entry.join.token}
        join={entry.join}
        variant="family"
        chat={chat}
        onRejoin={entry.rejoin ?? onRejoin}
        onBack={onRejoin}
        rejoin={entry.state}
        {...(context && { context })}
      />
    </div>,
    document.body,
  );
}
