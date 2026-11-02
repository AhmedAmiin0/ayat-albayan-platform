import type { ClosedWhy, RoomPhase } from '@/classroom/room/model/room-phase';
import { t } from '@/core/lib/i18n/i18n';
import { RoomNotice } from './RoomNotice';

const CLOSED: Record<ClosedWhy, string> = {
  left: t.mobileRoom.ended,
  ended: t.mobileRoom.ended,
  removed: t.classroom.error.removed_from_room,
  duplicate: t.mobileRoom.duplicate,
};

interface RoomEndProps {
  phase: Extract<RoomPhase, { step: 'failed' | 'closed' }>;
  /** «حاول مرة أخرى» / «ادخل مرة أخرى»: back to the preview, with a fresh token. */
  onAgain: () => void;
  onBack: () => void;
}

/** A failed join, or the room closed: why, a way back in (never after a removal), and «رجوع». */
export function RoomEnd({ phase, onAgain, onBack }: RoomEndProps) {
  if (phase.step === 'failed') {
    const again = { label: t.classroom.retry, onPress: onAgain };
    return (
      <RoomNotice testID="room-failed" message={phase.message} again={again} onBack={onBack} />
    );
  }
  const again =
    phase.why === 'removed' ? undefined : { label: t.classroom.rejoin, onPress: onAgain };
  return (
    <RoomNotice
      testID={`room-closed-${phase.why}`}
      message={CLOSED[phase.why]}
      again={again}
      onBack={onBack}
    />
  );
}
