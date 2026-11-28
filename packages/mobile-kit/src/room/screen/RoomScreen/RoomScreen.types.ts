import type { RoomCredentials, RoomPlatform, RoomTarget } from '../../model/room-types';
import type { RoomScreenInput } from '../use-room-flow';

export type { RoomChat } from '../use-room-flow';

export interface RoomScreenProps extends RoomScreenInput {
  platform: RoomPlatform;
  target: RoomTarget;
  /** The app's join endpoint (a retry, or no token handed over by the press). */
  fetchJoin: (target: RoomTarget) => Promise<RoomCredentials>;
}
