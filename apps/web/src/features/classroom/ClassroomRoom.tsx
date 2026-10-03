import type { RoomJoinResult } from '@ab/shared';
import { FormAlert } from '@/components/ui/form-alert';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { ControlBar } from './ControlBar';
import { createLivekitRoom } from './livekit-room';
import { ParticipantGrid } from './ParticipantGrid';
import type { RoomClient } from './room-types';
import { useRoom } from './use-room';

interface Props {
  join: RoomJoinResult;
  /** Test seam: a fake client instead of livekit-client. */
  make?: () => RoomClient;
  /** «ادخل تاني» after leaving: the parent asks for a fresh token. */
  onRejoin?: () => void;
}

/** The live room: grid, controls, and the closing screens (left / opened elsewhere / could not connect). */
export function ClassroomRoom({ join, make = createLivekitRoom, onRejoin }: Props) {
  const room = useRoom(join, make);
  const { snap } = room;

  if (room.failure) return <Closing text={room.failure} onRejoin={onRejoin} />;
  if (snap.status === 'duplicate') return <Closing text={t.classroom.error.duplicate} />;
  if (snap.status === 'ended') return <Closing text={t.classroom.ended} onRejoin={onRejoin} />;

  return (
    <main className="flex min-h-dvh flex-col gap-3 bg-page p-3 sm:p-4">
      {snap.status === 'connecting' && <p role="status" className="text-sm text-ink-2">{t.classroom.joining}</p>}
      {snap.status === 'reconnecting' && <p role="status" className="text-sm text-ink-2">{t.classroom.reconnecting}</p>}
      {room.notes.map((n) => (
        <FormAlert key={n}>{n}</FormAlert>
      ))}
      <ParticipantGrid tiles={snap.tiles} attach={room.attach} />
      <ControlBar room={room} />
    </main>
  );
}

function Closing({ text, onRejoin }: { text: string; onRejoin?: (() => void) | undefined }) {
  return (
    <main className="grid min-h-dvh content-center justify-items-center gap-4 bg-page p-4 text-center">
      <p role="status" className="text-body font-semibold">{text}</p>
      {onRejoin && <Button type="button" onClick={onRejoin}>{t.classroom.rejoin}</Button>}
    </main>
  );
}
