import type { RoomJoinResult } from '@ab/shared';
import { closingOf } from '#/classroom/closing/closing-kinds.ts';
import { RoomClosing, type RejoinState } from '#/classroom/closing/RoomClosing.tsx';
import { DeviceCheck } from '#/classroom/entry/DeviceCheck.tsx';
import { useRoomEntry } from '#/classroom/entry/use-room-entry.ts';
import {
  roomKit, type RoomChatSlot, type RoomContext, type RoomKit,
} from '#/classroom/flow/room-kit.ts';
import type { RoomVariant } from '#/classroom/flow/room-variant.ts';
import { createLivekitRoom } from '#/classroom/room/livekit/livekit-room/index.ts';
import { useRoom } from '#/classroom/room/livekit/use-room.ts';
import { LiveRoom } from '#/classroom/room/components/LiveRoom.tsx';
import type { MediaChoice, RoomClient } from '#/classroom/room/components/room-types.ts';

export interface ClassroomRoomProps {
  join: RoomJoinResult;
  /** Test seam: a fake client instead of livekit-client. */
  make?: () => RoomClient;
  /** «ادخل مرة أخرى» after leaving: the parent asks for a fresh token. */
  onRejoin?: () => void;
  /** Staff (default) or the family portal: the family's extras (room-variant.ts). */
  variant?: RoomVariant;
  /** The lesson as the page knows it: the top line, the waiting note, who is inside. */
  context?: RoomContext;
  /** The family's «المحادثة». */
  chat?: RoomChatSlot | null;
  /** «رجوع» on the device check and the closing screens: back to the page. */
  onBack?: () => void;
  /** The parent's rejoin: under way or refused, and 410 lesson_ended (final «انتهت الحلقة»). */
  rejoin?: RejoinState & { endedForAll: boolean };
}

interface CallProps extends ClassroomRoomProps {
  kit: RoomKit;
  /** The device check's choice; none (staff): the client starts both. */
  media: MediaChoice | undefined;
}

/** Connected (or connecting) with the chosen devices, until a closing screen takes over. */
function Call({ join, make = createLivekitRoom, kit, media, onRejoin, onBack, rejoin }: CallProps) {
  const room = useRoom(join, make, media);
  const endedForAll = rejoin?.endedForAll ?? false;
  const kind = closingOf({ status: room.snap.status, failure: room.failure, endedForAll });
  if (kind === null) return <LiveRoom room={room} join={join} kit={kit} />;
  return (
    <RoomClosing
      kind={kind}
      variant={kit.variant}
      failure={kind === 'failed' ? room.failure : null}
      context={kit.context}
      onRejoin={onRejoin}
      onBack={onBack}
      rejoin={rejoin}
    />
  );
}

/**
 * The live room: the family's «قبل الدخول» first (once per browser), then the call, then its
 * closing screens: left (rejoin), ended for everyone, opened elsewhere, removed by the teacher or
 * admin (no rejoin: the API refuses it anyway), could not connect; each with «رجوع» when the page
 * has somewhere to go back to.
 */
export function ClassroomRoom(props: ClassroomRoomProps) {
  const kit = roomKit(props);
  const entry = useRoomEntry(kit.features.deviceCheck);
  if (entry.media === null) {
    const { join, onBack } = props;
    return <DeviceCheck join={join} context={kit.context} onJoin={entry.choose} onBack={onBack} />;
  }
  const media = kit.features.deviceCheck ? entry.media : undefined;
  return <Call {...props} kit={kit} media={media} />;
}
