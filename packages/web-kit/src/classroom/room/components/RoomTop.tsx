import { chatOpen, type RoomJoinResult } from '@ab/shared';
import { FormAlert } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { ReconnectStrip } from '#/classroom/flow/ReconnectStrip.tsx';
import type { RoomKit } from '#/classroom/flow/room-kit.ts';
import { RoomTopBar } from '#/classroom/flow/RoomTopBar.tsx';
import { RecordingOffAlert } from '#/classroom/recordings/RecordingsPanel.tsx';
import { ShareRequestsPanel } from '#/classroom/share/ShareRequestsPanel.tsx';
import type { ShareRequests } from '#/classroom/share/use-share-requests.ts';
import type { RoomController } from '#/classroom/room/livekit/use-room.ts';
import { RoomHeader } from './RoomHeader';

interface Props {
  room: RoomController;
  join: RoomJoinResult;
  kit: RoomKit;
  share: ShareRequests;
  onPeople: () => void;
}

/**
 * Above the stage: the top line (the family's lesson bar, staff's status line), «جارٍ إعادة
 * الاتصال…», the admin's recording-off alert, the trial's no-chat note (unless the family's chat
 * button explains it), the soft media problems and the share / board answers.
 */
export function RoomTop({ room, join, kit, share, onPeople }: Props) {
  const { snap } = room;
  const trialNote = !chatOpen(join) && !kit.chat;
  return (
    <>
      {kit.features.sidePanel ? (
        <RoomTopBar snap={snap} context={kit.context} onPeople={onPeople} />
      ) : (
        <RoomHeader snap={snap} />
      )}
      <ReconnectStrip status={snap.status} />
      {join.role === 'admin' && join.recording === 'off' && <RecordingOffAlert />}
      {trialNote && <p role="note" className="text-xs text-ink-2">{t.classroom.chatClosedTrial}</p>}
      {room.notes.map((n) => (
        <FormAlert key={n}>{n}</FormAlert>
      ))}
      <ShareRequestsPanel share={share} />
    </>
  );
}
