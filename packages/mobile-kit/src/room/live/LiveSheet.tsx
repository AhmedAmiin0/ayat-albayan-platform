import type { RoomPresence } from '@ab/shared';
import type { ReactNode } from 'react';
import { AppText } from '../../ui';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { ParticipantsPanel } from '../host/ParticipantsPanel';
import type { useHostPanel } from '../host/use-host-panel';
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

/** In a trial lesson the chat opens only after subscribing. */
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

type Inline = Exclude<SheetName, 'people'>;

/**
 * The participants (the native sheet, always mounted), the leave question or the locked chat:
 * never two at once.
 */
export function LiveSheet({ which, panel, onClose, onLeave, ...room }: LiveSheetProps) {
  const inline: Record<Inline, () => ReactNode> = {
    leave: () => <LeaveSheet onLeave={onLeave} onStay={onClose} />,
    chatLocked: () => <ChatLocked onClose={onClose} />,
  };
  return (
    <>
      <ParticipantsPanel open={which === 'people'} panel={panel} onClose={onClose} {...room} />
      {which && which !== 'people' ? inline[which]() : null}
    </>
  );
}
