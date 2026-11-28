import type { RoomSnapshot } from '@ab/web-kit/classroom/room/components/room-types';
import type { RoomContext } from '@ab/web-kit/classroom/flow/room-kit';

export interface Props {
  snap: RoomSnapshot;
  context: RoomContext | null;
  onPeople: () => void;
}
