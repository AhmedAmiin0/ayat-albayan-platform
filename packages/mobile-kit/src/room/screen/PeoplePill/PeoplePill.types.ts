import type { RoomTile } from '../../model/room-types';

export interface PeoplePillProps {
  people: readonly RoomTile[];
  onPress: () => void;
}
