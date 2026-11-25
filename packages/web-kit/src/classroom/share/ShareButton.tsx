import type { JoinRole } from '@ab/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import { RequestButton } from './RequestButton';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import { canShareScreen } from './media-support';
import type { ShareRequests } from './use-share-requests';

interface Props {
  room: RoomController;
  role: JoinRole;
  share: ShareRequests;
}

/** Shown only where it can work; a guest who may not yet gets the request button instead. */
export function ShareButton({ room, role, share }: Props) {
  const { snap } = room;
  if (!canShareScreen()) return null;
  if (snap.shareAllowed) {
    const label = snap.shareOn ? t.classroom.shareOff : t.classroom.shareOn;
    return <RoomButton icon="screen" on={snap.shareOn} label={label} onClick={room.toggleShare} />;
  }
  return role === 'guest' ? <RequestButton share={share} what="screen" /> : null;
}
