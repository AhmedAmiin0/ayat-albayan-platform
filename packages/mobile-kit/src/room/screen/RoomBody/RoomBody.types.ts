import type { RoomPlatform } from '../../model/room-types';
import type { useRoomFlow } from '../use-room-flow';

export type RoomFlow = ReturnType<typeof useRoomFlow>;

export interface RoomBodyProps {
  screen: RoomFlow;
  platform: RoomPlatform;
}
