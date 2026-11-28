import type { KickController } from '@ab/web-kit/classroom/kick/use-kick';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';

export interface ParticipantRowProps {
  tile: TileView;
  kick: KickController;
  mute: MuteController;
}
