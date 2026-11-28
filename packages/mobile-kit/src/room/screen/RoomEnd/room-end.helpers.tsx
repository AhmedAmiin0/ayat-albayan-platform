import type { RoomPresence } from '@ab/schedule';
import { AlertIcon, RemoveIcon } from '../../live/room-icons';
import type { ClosedWhy } from '../../model/room-phase';
import type { RoomKind } from '../../model/room-types';
import { t } from '../../../lib/i18n/i18n';
import { HangUpIcon, PhoneIcon } from '../../../ui';
import type { RoomNoticeProps } from '../RoomNotice';
import type { ClosedLook, ClosedPhase, RoomEndProps } from './RoomEnd.types';

const teacherIn = (presence: readonly RoomPresence[]): string | null =>
  presence.some((p) => p.role === 'teacher') ? t.portal.app.live.teacherIn : null;

export const alertIcon = (ink: string) => <AlertIcon color={ink} size={40} />;

const ENDED: Record<RoomKind, string> = {
  lesson: t.classroom.closedHint,
  meeting: t.classroom.error.meeting_ended,
};
const hangUp = (ink: string) => <HangUpIcon color={ink} size={40} />;
const fixed = (line: string) => () => line;

/**
 * Left on one's own (canvas RoomXLeft), dropped, closed by the server (the max-duration closer
 * too) and opened elsewhere may come back; ended for everyone for certain (RoomXEnded) and
 * removed may not.
 */
const CLOSED: Record<ClosedWhy, ClosedLook> = {
  left: {
    message: fixed(t.mobileRoom.left.title),
    detail: t.mobileRoom.left.body,
    again: true,
    icon: hangUp,
  },
  dropped: { message: fixed(t.mobileRoom.dropped), again: true, icon: hangUp },
  ended: { message: (kind) => ENDED[kind], again: true, icon: hangUp },
  endedAll: { message: (kind) => ENDED[kind], again: false, icon: hangUp },
  removed: {
    message: fixed(t.classroom.error.removed_from_room),
    again: false,
    icon: (ink) => <RemoveIcon color={ink} size={40} />,
  },
  duplicate: {
    message: fixed(t.mobileRoom.duplicate),
    again: true,
    icon: (ink) => <PhoneIcon color={ink} size={40} />,
  },
};

type ClosedInput = Pick<RoomEndProps, 'kind' | 'presence' | 'onAgain'>;

/** The notice for a closed room: its words, its icon, and a way back in when it may come back. */
export function closedNotice(phase: ClosedPhase, end: ClosedInput): RoomNoticeProps {
  const look = CLOSED[phase.why];
  return {
    testID: `room-closed-${phase.why}`,
    message: look.message(end.kind),
    detail: look.detail,
    presence: phase.why === 'left' ? teacherIn(end.presence) : null,
    icon: look.icon,
    again: look.again ? { label: t.classroom.rejoin, onPress: end.onAgain } : undefined,
  };
}
