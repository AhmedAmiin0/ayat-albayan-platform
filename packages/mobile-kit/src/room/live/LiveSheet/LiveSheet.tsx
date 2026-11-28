import { ParticipantsPanel } from '../../host/ParticipantsPanel';
import { ChatLockedSheet } from '../ChatLockedSheet';
import { LeaveSheet } from '../LeaveSheet';
import type { LiveSheetProps } from './LiveSheet.types';

/**
 * The participants, the leave question or the locked chat: never two at once. Each sheet stays
 * mounted so the native sheet slides in and out.
 */
export function LiveSheet({ which, panel, onClose, onLeave, ...room }: LiveSheetProps) {
  return (
    <>
      <ParticipantsPanel open={which === 'people'} panel={panel} onClose={onClose} {...room} />
      <LeaveSheet open={which === 'leave'} onLeave={onLeave} onStay={onClose} />
      <ChatLockedSheet open={which === 'chatLocked'} onClose={onClose} />
    </>
  );
}
