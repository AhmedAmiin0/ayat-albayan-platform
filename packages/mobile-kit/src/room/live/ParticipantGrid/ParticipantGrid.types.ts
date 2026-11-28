import type { RoomPlatform, RoomTile } from '../../model/room-types';
import type { TileActions } from '../ParticipantTile';

export interface ParticipantGridProps {
  tiles: readonly RoomTile[];
  Video: RoomPlatform['Video'];
  actions: Pick<TileActions, 'front' | 'switchCamera'>;
}
