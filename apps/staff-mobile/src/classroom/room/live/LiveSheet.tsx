import type { RoomPresence } from '@ab/shared';
import type { ReactNode } from 'react';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { ParticipantsPanel } from '@/classroom/room/host/ParticipantsPanel';
import type { useHostPanel } from '@/classroom/room/host/use-host-panel';
import { LeaveSheet } from './LeaveSheet';
import { RoomSheet } from './RoomSheet';

/** The one panel open over the room's foot, if any. */
export type SheetName = 'people' | 'leave' | 'chatLocked';

interface LiveSheetProps {
  which: SheetName | null;
  panel: ReturnType<typeof useHostPanel>;
  onClose: () => void;
  onLeave: () => void;
  presence: readonly RoomPresence[];
  onBrowser: (() => void) | null;
}

/** A trial lesson's «المحادثة»: it opens after subscribing (canvas RoomXChat, the family). */
function ChatLocked({ onClose }: Pick<LiveSheetProps, 'onClose'>) {
  const { color } = useTheme();
  return (
    <RoomSheet testID="room-chat-locked" title={t.mobileRoom.controls.chat} onClose={onClose}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>
        {t.studentChannel.closed}
      </AppText>
    </RoomSheet>
  );
}

/** The participants, the leave question or the locked chat: never two at once. */
export function LiveSheet({ which, panel, onClose, onLeave, ...room }: LiveSheetProps) {
  const sheets: Record<SheetName, () => ReactNode> = {
    people: () => <ParticipantsPanel panel={panel} onClose={onClose} {...room} />,
    leave: () => <LeaveSheet onLeave={onLeave} onStay={onClose} />,
    chatLocked: () => <ChatLocked onClose={onClose} />,
  };
  return which ? sheets[which]() : null;
}
