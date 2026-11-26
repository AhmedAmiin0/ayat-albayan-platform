import type { ReactNode } from 'react';
import { ParticipantGrid, type TileSlots } from '@ab/web-kit/classroom/room/components/ParticipantGrid';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import { RoomStage } from '@ab/web-kit/classroom/room/components/RoomStage';
import type { RoomLayout } from '@ab/web-kit/classroom/room/livekit/stage';
import { WaitingStage } from '@ab/web-kit/classroom/flow/WaitingStage';

interface Props {
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

/** The middle of the room: waiting for the teacher, the even grid, or the stage with its strip. */
export function RoomMain({ layout, tiles, slots, board, waiting, wideStrip }: Props) {
  if (waiting.on) {
    const me = tiles.find((x) => x.isLocal);
    return <WaitingStage me={me} attach={slots.attach} note={waiting.note} />;
  }
  return layout.mode === 'grid' ? (
    <ParticipantGrid tiles={layout.tiles} {...slots} />
  ) : (
    <RoomStage
      stage={layout.stage}
      strip={layout.strip}
      board={board}
      wideStrip={wideStrip}
      {...slots}
    />
  );
}
