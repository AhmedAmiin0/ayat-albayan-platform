import type { RoomJoinResult } from '@ab/shared';
import { kickScope, recordingSourceOf } from '@ab/web-kit/classroom/api/moderation-api';
import { useBoard } from '@ab/web-kit/classroom/board/use-board';
import { KickButton } from '@ab/web-kit/classroom/kick/KickButton';
import { useKick, type KickController } from '@ab/web-kit/classroom/kick/use-kick';
import { muteFor } from '@ab/web-kit/classroom/mute/mute-api';
import { MuteButtons } from '@ab/web-kit/classroom/mute/MuteButtons';
import { useMute, type MuteController } from '@ab/web-kit/classroom/mute/use-mute';
import type { TileSlots } from '@ab/web-kit/classroom/room/components/ParticipantGrid';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import { grantShareFor } from '@ab/web-kit/classroom/share/share-api';
import { useShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';

/** Staff may act on this tile (mute its mic or camera, remove the person). */
const actsOn = (tile: TileView, kick: KickController, mute: MuteController): boolean =>
  kick.canKick(tile) || mute.canMute(tile, 'microphone') || mute.canMute(tile, 'camera');

/** The room's tools by the join's role; a guest's tools only ask. */
export function useRoomTools(room: RoomController, join: RoomJoinResult) {
  const board = useBoard({ room, role: join.role });
  const kick = useKick({ ...kickScope(join.room), role: join.role });
  const share = useShareRequests({ room, role: join.role, grant: grantShareFor(join.room), board });
  const mute = useMute({ role: join.role, tiles: room.snap.tiles, call: muteFor(join.room) });
  const staffLead = join.role === 'teacher' || join.role === 'admin';
  const slots: TileSlots = {
    attach: room.attach,
    actionFor: (tile) =>
      actsOn(tile, kick, mute) && (
        <span className="flex gap-1">
          <MuteButtons tile={tile} mute={mute} />
          {kick.canKick(tile) && <KickButton tile={tile} onAsk={kick.ask} />}
        </span>
      ),
  };
  const recordingsFor = staffLead ? recordingSourceOf(join.room) : null;
  return { board, kick, share, mute, slots, recordingsFor };
}

export type RoomTools = ReturnType<typeof useRoomTools>;
