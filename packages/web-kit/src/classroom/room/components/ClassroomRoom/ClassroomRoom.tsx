import type { RoomJoinResult } from '@ab/schedule';
import { closingOf } from '@ab/web-kit/classroom/closing/closing-kinds';
import { RoomClosing, type RejoinState } from '@ab/web-kit/classroom/closing/RoomClosing';
import { DeviceCheck } from '@ab/web-kit/classroom/entry/DeviceCheck';
import { useRoomEntry } from '@ab/web-kit/classroom/entry/use-room-entry';
import {
  roomKit, type RoomChatSlot, type RoomContext, type RoomKit,
} from '@ab/web-kit/classroom/flow/room-kit';
import type { RoomVariant } from '@ab/web-kit/classroom/flow/room-variant';
import { createLivekitRoom } from '@ab/web-kit/classroom/room/livekit/livekit-room';
import { useRoom } from '@ab/web-kit/classroom/room/livekit/use-room';
import { LiveRoom } from '@ab/web-kit/classroom/room/components/LiveRoom';
import type { MediaChoice, RoomClient } from '@ab/web-kit/classroom/room/components/room-types';

export interface ClassroomRoomProps {
  join: RoomJoinResult;
  /** Test seam: a fake client instead of livekit-client. */
  make?: () => RoomClient;
  /** After leaving, the parent asks for a fresh token to rejoin. */
  onRejoin?: () => void;
  /** Staff (default) or the family portal: the family's extras (room-variant.ts). */
  variant?: RoomVariant;
  /** The lesson as the page knows it: the top line, the waiting note, who is inside. */
  context?: RoomContext;
  chat?: RoomChatSlot | null;
  /** Back to the page from the device check and closing screens. */
  onBack?: () => void;
  /** The parent's rejoin state; 410 lesson_ended makes the end final. */
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

/** A removed person gets no rejoin since the API refuses it anyway. */
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
