import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';

export interface MuteButtonsProps {
  tile: TileView;
  mute: MuteController;
}
