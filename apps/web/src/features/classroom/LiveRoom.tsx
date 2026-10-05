import type { RoomJoinResult } from '@ab/shared';
import { useState } from 'react';
import { FormAlert } from '@/components/ui/form-alert';
import { BoardStage } from './board/BoardStage';
import { useBoard } from './board/use-board';
import { ControlBar } from './ControlBar';
import { KickButton } from './kick/KickButton';
import { KickDialog } from './kick/KickDialog';
import { ParticipantsSheet } from './kick/ParticipantsSheet';
import { useKick } from './kick/use-kick';
import { kickScope, lessonIdOfRoom } from './moderation-api';
import { ParticipantGrid, type TileSlots } from './ParticipantGrid';
import { RecordingsPanel } from './recordings/RecordingsPanel';
import { RoomHeader } from './RoomHeader';
import { RoomStage } from './RoomStage';
import { grantShareFor } from './share/share-api';
import { ShareRequestsPanel } from './share/ShareRequestsPanel';
import { useShareRequests } from './share/use-share-requests';
import { layoutOf } from './stage';
import type { RoomController } from './use-room';

type Panel = 'people' | 'recordings' | null;

/**
 * The call itself, one screen tall: header, stage + strip (or the balanced grid), and the control
 * bar pinned at the bottom. The board, «إخراج من الحلقة» and «التسجيلات» hang off it (an internal
 * meeting's room, `meeting-<id>`, has the board and «إخراج» but no recordings).
 */
export function LiveRoom({ room, join }: { room: RoomController; join: RoomJoinResult }) {
  const { snap } = room;
  const board = useBoard({ room, role: join.role });
  const lessonId = lessonIdOfRoom(join.room);
  const kick = useKick({ ...kickScope(join.room), role: join.role });
  const share = useShareRequests({ room, role: join.role, grant: grantShareFor(join.room) });
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const recordingsFor = lessonId !== null && (join.role === 'teacher' || join.role === 'admin') ? lessonId : null;

  const layout = layoutOf(snap.tiles, board.visible);
  const slots: TileSlots = {
    attach: room.attach,
    actionFor: (tile) => (kick.canKick(tile) ? <KickButton tile={tile} onAsk={kick.ask} /> : null),
  };

  return (
    <main className="flex h-dvh flex-col gap-2 overflow-hidden bg-page px-3 pt-3 sm:gap-3 sm:px-4 sm:pt-4">
      <RoomHeader snap={snap} />
      {room.notes.map((n) => (
        <FormAlert key={n}>{n}</FormAlert>
      ))}
      <ShareRequestsPanel share={share} />
      {layout.mode === 'grid' ? (
        <ParticipantGrid tiles={layout.tiles} {...slots} />
      ) : (
        <RoomStage stage={layout.stage} strip={layout.strip} board={<BoardStage board={board} room={room} />} {...slots} />
      )}
      <ControlBar
        room={room}
        board={board}
        role={join.role}
        share={share}
        onPeople={() => setPanel('people')}
        onRecordings={recordingsFor === null ? undefined : () => setPanel('recordings')}
      />
      {panel === 'people' && !kick.target && <ParticipantsSheet tiles={snap.tiles} kick={kick} onClose={close} />}
      {panel === 'recordings' && recordingsFor !== null && <RecordingsPanel lessonId={recordingsFor} onClose={close} />}
      <KickDialog kick={kick} />
    </main>
  );
}
