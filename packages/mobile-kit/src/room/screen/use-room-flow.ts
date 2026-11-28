import type { RoomPresence } from '@ab/schedule';
import { useState } from 'react';
import type { RoomHost } from '../host/host-types';
import { useHostPanel } from '../host/use-host-panel';
import type { SheetName } from '../live/LiveSheet';
import { useRoomSession, type RoomSessionInput } from '../state/use-room-session';
import { useLeaveGuard, type BackSource } from './use-leave-guard';

export interface RoomChat {
  unread: number;
  open: () => void;
  /** A trial lesson (the join answer's chat off): hidden (staff), or explained (the family). */
  whenLocked: 'hide' | 'explain';
}

export interface RoomScreenInput extends RoomSessionInput {
  onExit: () => void;
  host?: RoomHost | null | undefined;
  chat?: RoomChat | null | undefined;
  /** Who the lesson says is inside (its `room.inRoom`), where the app knows it. */
  presence?: readonly RoomPresence[] | undefined;
  /** The app leaves the room before opening its web room. */
  onBrowser?: (() => void) | undefined;
  /** The navigator's `beforeRemove`: Android's back asks first while in the room. */
  backSource?: BackSource | undefined;
}

type Joined = ReturnType<typeof useRoomSession>['joined'];
const roleOf = (joined: Joined) => joined?.role ?? null;
/** The join answer turned the chat off: a trial lesson. */
const lockedChat = (joined: Joined): boolean => joined?.chat === false;

/** Null when this room shows no chat control. */
function chatControl(chat: RoomChat | null, locked: boolean, explain: () => void) {
  if (!chat || (locked && chat.whenLocked === 'hide')) return null;
  return { unread: locked ? 0 : chat.unread, open: locked ? explain : chat.open };
}

/** Leaving stays on the screen; only back exits. */
export function useRoomFlow(props: RoomScreenInput) {
  const { onExit, host, chat, presence, backSource, onBrowser, ...input } = props;
  const session = useRoomSession(input);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const live = session.phase.step === 'live';
  const panel = useHostPanel({
    host: host ?? null,
    me: roleOf(session.joined),
    tiles: session.snap.tiles,
    onEnded: session.endedForAll,
  });
  useLeaveGuard(backSource, live, () => setSheet('leave'));
  const leave = () => {
    setSheet(null);
    session.leave();
  };
  return {
    session,
    live,
    panel,
    presence: presence ?? [],
    sheet: live ? sheet : null,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
    leave,
    back: onExit,
    browser: onBrowser
      ? () => {
          leave();
          onExit();
          onBrowser();
        }
      : null,
    chat: chatControl(chat ?? null, lockedChat(session.joined), () => setSheet('chatLocked')),
  };
}
