import type { JoinRole } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import type { BoardController } from './board/use-board';
import { RoomButton } from './RoomButton';
import { RequestButton } from './share/RequestButton';
import { ShareButton } from './share/ShareButton';
import type { ShareRequests } from './share/use-share-requests';
import type { RoomController } from './use-room';

interface Props {
  room: RoomController;
  board: BoardController;
  role: JoinRole;
  share: ShareRequests;
  onPeople: () => void;
  /** «التسجيلات», for the admin and the teacher only. */
  onRecordings?: (() => void) | undefined;
}

/**
 * Pinned to the bottom of the room above the phone's home bar (safe-area padding). Each toggle
 * names its action and shows its state with aria-pressed + a filled look, never colour alone.
 */
export function ControlBar({ room, board, role, share, onPeople, onRecordings }: Props) {
  const { snap } = room;
  return (
    <div
      role="toolbar"
      aria-label={t.classroom.controls}
      className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-center gap-1.5 border-t border-rule bg-page px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:-mx-4 sm:gap-2"
    >
      {!snap.canPlayAudio && (
        <Button type="button" onClick={room.enableAudio}>
          {t.classroom.enableAudio}
        </Button>
      )}
      <RoomButton icon="mic" on={snap.micOn} label={snap.micOn ? t.classroom.micOff : t.classroom.micOn} onClick={room.toggleMic} />
      <RoomButton icon="cam" on={snap.camOn} label={snap.camOn ? t.classroom.camOff : t.classroom.camOn} onClick={room.toggleCamera} />
      <ShareButton room={room} role={role} share={share} />
      <RoomButton icon="board" on={board.visible} label={t.classroom.board.toggle} onClick={board.toggleVisible} />
      {!board.state.open && <RequestButton share={share} what="open" />}
      <RoomButton icon="people" label={t.classroom.people} onClick={onPeople} />
      {onRecordings && <RoomButton icon="film" label={t.classroom.recordings.title} onClick={onRecordings} />}
      <RoomButton icon="leave" variant="danger" label={t.classroom.leave} onClick={room.leave} />
    </div>
  );
}
