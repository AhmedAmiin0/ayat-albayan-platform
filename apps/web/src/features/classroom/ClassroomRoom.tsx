import type { RoomJoinResult } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import { createLivekitRoom } from './livekit-room';
import { LiveRoom } from './LiveRoom';
import type { RoomClient } from './room-types';
import { useRoom } from './use-room';

interface Props {
  join: RoomJoinResult;
  /** Test seam: a fake client instead of livekit-client. */
  make?: () => RoomClient;
  /** «ادخل تاني» after leaving: the parent asks for a fresh token. */
  onRejoin?: () => void;
}

/**
 * The live room, and its closing screens: left (rejoin), opened elsewhere, removed by the teacher
 * or admin (no rejoin: the API refuses it anyway), could not connect.
 */
export function ClassroomRoom({ join, make = createLivekitRoom, onRejoin }: Props) {
  const room = useRoom(join, make);
  const { snap } = room;

  if (room.failure) return <Closing text={room.failure} onRejoin={onRejoin} />;
  if (snap.status === 'duplicate') return <Closing text={t.classroom.error.duplicate} />;
  if (snap.status === 'removed') return <Closing text={t.classroom.error.removed_from_room} />;
  if (snap.status === 'ended') return <Closing text={t.classroom.ended} onRejoin={onRejoin} />;
  return <LiveRoom room={room} join={join} />;
}

function Closing({ text, onRejoin }: { text: string; onRejoin?: (() => void) | undefined }) {
  return (
    <main className="grid min-h-dvh content-center justify-items-center gap-4 bg-page p-4 text-center">
      <p role="status" className="text-body font-semibold">{text}</p>
      {onRejoin && <Button type="button" onClick={onRejoin}>{t.classroom.rejoin}</Button>}
    </main>
  );
}
