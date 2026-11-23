import type { JoinRole } from '@ab/shared';
import { Button } from '#/components/ui/form/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';
import type { BoardController } from '#/classroom/board/use-board.ts';
import { ChatButton } from '#/classroom/panel/ChatButton.tsx';
import { RoomButton } from './RoomButton';
import { RequestButton } from '#/classroom/share/RequestButton.tsx';
import { ShareButton } from '#/classroom/share/ShareButton.tsx';
import type { ShareRequests } from '#/classroom/share/use-share-requests.ts';
import type { RoomController } from '#/classroom/room/livekit/use-room.ts';

/** The family's «المحادثة»: its unread count, open in the panel now, and how to open it. */
export interface ChatControl {
  unread: number;
  on: boolean;
  open: () => void;
}

interface Props {
  room: RoomController;
  board: BoardController;
  role: JoinRole;
  share: ShareRequests;
  onPeople: () => void;
  /** «التسجيلات», for the admin and the teacher only. */
  onRecordings?: (() => void) | undefined;
  chat?: ChatControl | undefined;
  /** «اخرج من الحلقة» when the room asks first (the family); else it leaves at once. */
  onLeave?: (() => void) | undefined;
  /** Phones: the app's row of round buttons (the family). */
  round?: boolean;
}

const C = t.mobileRoom.controls;

/** «شغّل الصوت» while autoplay is blocked, then the microphone and camera toggles. */
function MediaButtons({ room, round }: { room: RoomController; round: boolean }) {
  const { snap } = room;
  const mic = snap.micOn ? t.classroom.micOff : t.classroom.micOn;
  const cam = snap.camOn ? t.classroom.camOff : t.classroom.camOn;
  return (
    <>
      {!snap.canPlayAudio && (
        <Button type="button" onClick={room.enableAudio}>
          {t.classroom.enableAudio}
        </Button>
      )}
      <RoomButton
        icon="mic"
        on={snap.micOn}
        round={round}
        short={C.mute}
        label={mic}
        onClick={room.toggleMic}
      />
      <RoomButton
        icon="cam"
        on={snap.camOn}
        round={round}
        short={C.camera}
        label={cam}
        onClick={room.toggleCamera}
      />
    </>
  );
}

/**
 * The screen share (or its request), «السبورة» and «اطلب فتح السبورة». On the round row's phones
 * only the board, and only while it is open (a phone never shares its screen).
 */
function BoardButtons({ room, board, role, share, round = false }: Props) {
  const wideOnly = cn('contents', round && 'max-sm:hidden');
  const closed = !board.state.open;
  return (
    <>
      <span className={wideOnly}>
        <ShareButton room={room} role={role} share={share} />
      </span>
      <RoomButton
        icon="board"
        on={board.visible}
        round={round}
        wideOnly={round && closed}
        label={t.classroom.board.toggle}
        onClick={board.toggleVisible}
      />
      {closed && (
        <span className={wideOnly}>
          <RequestButton share={share} what="open" />
        </span>
      )}
    </>
  );
}

/**
 * Pinned to the bottom of the room above the phone's home bar (safe-area padding). Each toggle
 * names its action and shows its state with aria-pressed + a filled look, never colour alone. The
 * round row keeps the app's few buttons on phones; the people pill is in the top line there.
 */
export function ControlBar(props: Props) {
  const { room, onPeople, onRecordings, chat, onLeave = props.room.leave, round = false } = props;
  return (
    <div
      role="toolbar"
      aria-label={t.classroom.controls}
      className={cn(
        'sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-center gap-1.5 border-t border-rule bg-page px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:-mx-4 sm:gap-2',
        round && 'max-sm:items-start max-sm:gap-3',
      )}
    >
      <MediaButtons room={room} round={round} />
      <BoardButtons {...props} />
      {chat && <ChatButton unread={chat.unread} on={chat.on} round={round} onClick={chat.open} />}
      <RoomButton
        icon="people"
        round={round}
        wideOnly={round}
        label={t.classroom.people}
        onClick={onPeople}
      />
      {onRecordings && (
        <RoomButton
          icon="film"
          label={t.classroom.recordings.title}
          onClick={onRecordings}
        />
      )}
      <RoomButton
        icon="leave"
        variant="danger"
        round={round}
        short={C.leave}
        label={t.classroom.leave}
        onClick={onLeave}
      />
    </div>
  );
}
