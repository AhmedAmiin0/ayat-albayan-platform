import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import type { BoardController } from '@ab/web-kit/classroom/board/use-board';

export interface BoardStageProps {
  board: BoardController;
  room: RoomController;
  requests: ShareRequests;
}
