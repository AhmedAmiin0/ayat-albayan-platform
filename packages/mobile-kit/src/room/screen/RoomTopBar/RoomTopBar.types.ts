import type { RoomTile } from '../../model/room-types';

export interface LiveHeader {
  people: readonly RoomTile[];
  openPeople: () => void;
  recording: boolean;
  /** «04:12» since one joined. */
  elapsed: string | null;
}

export interface RoomTopBarProps {
  title: string;
  /** In the room only: the recording notice and the people pill. */
  live: LiveHeader | null;
}
