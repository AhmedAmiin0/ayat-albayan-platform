import { useState } from 'react';
import { Linking } from 'react-native';
import type { RoomHost } from '@/classroom/room/host/host-types';
import { useHostPanel } from '@/classroom/room/host/use-host-panel';
import type { SheetName } from '@/classroom/room/live/LiveSheet';
import { roomWebUrl } from '@/classroom/room/model/join-target';
import { useRoomSession, type RoomSessionInput } from '@/classroom/room/state/use-room-session';
import { useLeaveGuard } from './use-leave-guard';

/** The in-room «المحادثة»: the student channel, opened by the app as a sheet over the room. */
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
}

type Joined = ReturnType<typeof useRoomSession>['joined'];
const roleOf = (joined: Joined) => joined?.role ?? null;
/** The join answer turned the chat off: a trial lesson. */
const lockedChat = (joined: Joined): boolean => joined?.chat === false;

/** «المحادثة»'s count and press; null when this room shows no chat control. */
function chatControl(chat: RoomChat | null, locked: boolean, explain: () => void) {
  if (!chat || (locked && chat.whenLocked === 'hide')) return null;
  return { unread: locked ? 0 : chat.unread, open: locked ? explain : chat.open };
}

/**
 * The room screen's state over the session: the one panel open at its foot, the host's panel,
 * the guarded leave (back asks first while in the room), «فتح في المتصفح» and the chat control.
 */
export function useRoomScreen({ onExit, host, chat, ...input }: RoomScreenInput) {
  const session = useRoomSession(input);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const live = session.phase.step === 'live';
  const panel = useHostPanel(host ?? null, roleOf(session.joined), [...session.snap.tiles]);
  const guard = useLeaveGuard(live, () => setSheet('leave'));
  const leave = () => {
    guard.release();
    setSheet(null);
    session.leave();
    onExit();
  };
  return {
    session,
    live,
    panel,
    sheet: live ? sheet : null,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
    leave,
    back: () => {
      guard.release();
      onExit();
    },
    browser: () => {
      leave();
      void Linking.openURL(roomWebUrl(input.target));
    },
    chat: chatControl(chat ?? null, lockedChat(session.joined), () => setSheet('chatLocked')),
  };
}
