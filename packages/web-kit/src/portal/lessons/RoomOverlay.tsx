import type { RoomJoinResult } from '@ab/shared';
import { createPortal } from 'react-dom';
import { holdRoomOpen } from '#/boot/index.ts';
import { ClassroomRoom } from '#/classroom/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { useRoomContext, type RoomLesson } from './room/room-context';
import { useRoomChat } from './room/use-room-chat';
import { useRoomRejoin } from './room/use-room-rejoin';

interface Props {
  join: RoomJoinResult;
  /**
   * The room is done with: back to the card («رجوع»). Without `about` it is also the rejoin (the
   * card's own button joins again).
   */
  onRejoin: () => void;
  /** The lesson and student the card joined: the top line, the chat, and the room's own rejoin. */
  about?: RoomLesson;
}

/**
 * The classroom over the whole page once a lesson card admitted the student (audit 2026-11-19,
 * extraction 4): one modal surface for every card that joins — the portal's lessons, the family
 * home's next lesson, the family week. The family variant of the shared room: «قبل الدخول», the
 * teacher on the stage, «المحادثة», «تغادر الحلقة؟», and never a dead end («رجوع»). It fades in.
 */
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
