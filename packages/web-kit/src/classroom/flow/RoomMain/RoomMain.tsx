import { ParticipantGrid } from '@ab/web-kit/classroom/room/components/ParticipantGrid';
import { RoomStage } from '@ab/web-kit/classroom/room/components/RoomStage';
import { WaitingStage } from '@ab/web-kit/classroom/flow/WaitingStage';
import type { Props } from './RoomMain.types';

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
