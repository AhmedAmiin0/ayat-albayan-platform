import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';

export interface MuteToastsProps {
  room: RoomController;
  mute: MuteController;
}
