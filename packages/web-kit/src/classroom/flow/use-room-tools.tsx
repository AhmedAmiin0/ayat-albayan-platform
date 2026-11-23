import type { RoomJoinResult } from '@ab/shared';
import { kickScope, recordingSourceOf } from '#/classroom/api/moderation-api.ts';
import { useBoard } from '#/classroom/board/use-board.ts';
import { KickButton } from '#/classroom/kick/KickButton.tsx';
import { useKick, type KickController } from '#/classroom/kick/use-kick.ts';
import { muteFor } from '#/classroom/mute/mute-api.ts';
import { MuteButtons } from '#/classroom/mute/MuteButtons.tsx';
import { useMute, type MuteController } from '#/classroom/mute/use-mute.ts';
import type { TileSlots } from '#/classroom/room/components/ParticipantGrid.tsx';
import type { TileView } from '#/classroom/room/components/room-types.ts';
import type { RoomController } from '#/classroom/room/livekit/use-room.ts';
import { grantShareFor } from '#/classroom/share/share-api.ts';
import { useShareRequests } from '#/classroom/share/use-share-requests.ts';

/** Staff may act on this tile (mute its mic or camera, remove the person). */
const actsOn = (tile: TileView, kick: KickController, mute: MuteController): boolean =>
  kick.canKick(tile) || mute.canMute(tile, 'microphone') || mute.canMute(tile, 'camera');

/**
 * The room's tools by the join's role: the board, «إخراج من الحلقة», the share and board
 * requests, «كتم», and «التسجيلات» (the admin and the teacher). A guest's tools only ask.
 */
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
