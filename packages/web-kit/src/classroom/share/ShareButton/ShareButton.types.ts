import type { JoinRole } from '@ab/schedule';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';

export interface Props {
  room: RoomController;
  role: JoinRole;
  share: ShareRequests;
}
