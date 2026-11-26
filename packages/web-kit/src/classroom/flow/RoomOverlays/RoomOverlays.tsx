import { KickDialog } from '@ab/web-kit/classroom/kick/KickDialog';
import { ParticipantsSheet } from '@ab/web-kit/classroom/kick/ParticipantsSheet';
import { LeaveConfirm } from '@ab/web-kit/classroom/closing/LeaveConfirm';
import { MuteToasts } from '@ab/web-kit/classroom/mute/MuteToasts';
import { RecordingsPanel } from '@ab/web-kit/classroom/recordings/RecordingsPanel';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import type { RoomKit } from '@ab/web-kit/classroom/flow/room-kit';
import type { RoomTools } from '@ab/web-kit/classroom/flow/use-room-tools';
import type { RoomUi } from '@ab/web-kit/classroom/flow/use-room-ui';

interface Props {
  room: RoomController;
  kit: RoomKit;
  tools: RoomTools;
  ui: RoomUi;
}

/** The family's people sit in the side panel instead of the staff drawer. */
export function RoomOverlays({ room, kit, tools, ui }: Props) {
  const { kick, mute, recordingsFor } = tools;
  const drawer = ui.panel === 'people' && !kit.features.sidePanel && !kick.target;
  return (
    <>
      {drawer && (
        <ParticipantsSheet tiles={room.snap.tiles} kick={kick} mute={mute} onClose={ui.close} />
      )}
      {ui.panel === 'recordings' && recordingsFor !== null && (
        <RecordingsPanel source={recordingsFor} onClose={ui.close} />
      )}
      <KickDialog kick={kick} />
      <MuteToasts room={room} mute={mute} />
      {ui.asking && <LeaveConfirm onLeave={ui.confirmLeave} onStay={ui.stay} />}
    </>
  );
}
