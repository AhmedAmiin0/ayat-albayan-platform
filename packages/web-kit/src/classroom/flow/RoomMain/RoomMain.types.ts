import type { ReactNode } from 'react';
import type { TileSlots } from '@ab/web-kit/classroom/room/components/ParticipantGrid';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import type { RoomLayout } from '@ab/web-kit/classroom/room/livekit/stage';

export interface Props {
  layout: RoomLayout;
  tiles: readonly TileView[];
  slots: TileSlots;
  /** The board on the stage (staff opened it). */
  board: ReactNode;
  /** Alone and the variant waits for the teacher: the waiting stage, with the page's note. */
  waiting: { on: boolean; note?: ReactNode };
  /** The variant's wider strip tiles (the family). */
  wideStrip: boolean;
}
