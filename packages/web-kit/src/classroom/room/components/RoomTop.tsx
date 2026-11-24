import { chatOpen, type RoomJoinResult } from '@ab/shared';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReconnectStrip } from '@ab/web-kit/classroom/flow/ReconnectStrip';
import type { RoomKit } from '@ab/web-kit/classroom/flow/room-kit';
import { RoomTopBar } from '@ab/web-kit/classroom/flow/RoomTopBar';
import { RecordingOffAlert } from '@ab/web-kit/classroom/recordings/RecordingsPanel';
import { ShareRequestsPanel } from '@ab/web-kit/classroom/share/ShareRequestsPanel';
import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import { RoomHeader } from './RoomHeader';

interface Props {
  room: RoomController;
  join: RoomJoinResult;
  kit: RoomKit;
  share: ShareRequests;
  onPeople: () => void;
}

/** The trial's no-chat note shows unless the family's chat button explains it. */
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
