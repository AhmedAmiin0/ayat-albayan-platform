import type { RoomSnapshot } from '@ab/web-kit/classroom/room/components/room-types';

export const peopleIn = (snap: RoomSnapshot): number =>
  snap.tiles.filter((x) => x.kind === 'camera').length;
