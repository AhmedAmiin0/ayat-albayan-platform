import { KickDialog } from '#/classroom/kick/KickDialog.tsx';
import { ParticipantsSheet } from '#/classroom/kick/ParticipantsSheet.tsx';
import { LeaveConfirm } from '#/classroom/closing/LeaveConfirm.tsx';
import { MuteToasts } from '#/classroom/mute/MuteToasts.tsx';
import { RecordingsPanel } from '#/classroom/recordings/RecordingsPanel.tsx';
import type { RoomController } from '#/classroom/room/livekit/use-room.ts';
import type { RoomKit } from './room-kit';
import type { RoomTools } from './use-room-tools';
import type { RoomUi } from './use-room-ui';

interface Props {
  room: RoomController;
  kit: RoomKit;
  tools: RoomTools;
  ui: RoomUi;
}

/**
 * Over the call: staff's «المشاركون» drawer (mute, remove), «التسجيلات», the remove confirm, the
 * «كتمك المعلم» toasts, and «تغادر الحلقة؟». The family's people sit in the side panel instead.
 */
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
