import type { RoomVariant } from '@ab/web-kit/classroom/flow/room-variant';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';

export interface PeopleListProps {
  tiles: TileView[];
  variant: RoomVariant;
}
