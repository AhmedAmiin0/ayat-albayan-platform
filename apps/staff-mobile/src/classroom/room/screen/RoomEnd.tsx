import type { ClosedWhy, RoomPhase } from '@/classroom/room/model/room-phase';
import { t } from '@ab/mobile-kit';
import { RoomNotice } from './RoomNotice';

interface ClosedLook {
  message: string;
  detail?: string;
  /** «ادخل مرة أخرى» is offered: the lesson still runs and they may come back. */
  again: boolean;
}

const LEFT: ClosedLook = {
  message: t.mobileRoom.left.title,
  detail: t.mobileRoom.left.body,
  again: true,
};

/**
 * Left on one's own or dropped (canvas RoomXLeft) may come back; ended for everyone (RoomXEnded:
 * the host, the server, a 410 lesson_ended) and removed may not.
 */
const CLOSED: Record<ClosedWhy, ClosedLook> = {
  left: LEFT,
  dropped: LEFT,
  ended: { message: t.classroom.closedHint, again: false },
  removed: { message: t.classroom.error.removed_from_room, again: false },
  duplicate: { message: t.mobileRoom.duplicate, again: true },
};

interface RoomEndProps {
  phase: Extract<RoomPhase, { step: 'failed' | 'closed' }>;
  /** «حاول مرة أخرى» / «ادخل مرة أخرى»: back to the preview, with a fresh token. */
  onAgain: () => void;
  onBack: () => void;
}

/** A failed join, or the room closed: why, a way back in where there is one, and «رجوع». */
export function RoomEnd({ phase, onAgain, onBack }: RoomEndProps) {
  if (phase.step === 'failed') {
    const again = { label: t.classroom.retry, onPress: onAgain };
    return (
      <RoomNotice testID="room-failed" message={phase.message} again={again} onBack={onBack} />
    );
  }
  const look = CLOSED[phase.why];
  return (
    <RoomNotice
      testID={`room-closed-${phase.why}`}
      message={look.message}
      detail={look.detail}
      again={look.again ? { label: t.classroom.rejoin, onPress: onAgain } : undefined}
      onBack={onBack}
    />
  );
}
