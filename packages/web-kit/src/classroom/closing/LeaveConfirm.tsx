import { Button, Dialog } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { RoomIcon } from '#/classroom/room/components/room-icons.tsx';

interface Props {
  onLeave: () => void;
  onStay: () => void;
}

const A = t.mobileRoom.leaveAsk;

/**
 * «تغادر الحلقة؟» (boards FamRoomWebLeave / FamRoomPhoneLeave, the app's LeaveSheet): a card in
 * the middle on wide screens that pops in, a bottom sheet that rises on phones; Esc and the scrim
 * keep one in the room.
 */
export function LeaveConfirm({ onLeave, onStay }: Props) {
  return (
    <Dialog
      title={A.title}
      onClose={onStay}
      layout="sheet"
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onStay}>
            {A.stay}
          </Button>
          <Button type="button" variant="danger" onClick={onLeave}>
            <RoomIcon name="leave" />
            {t.mobileRoom.controls.leave}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">{A.body}</p>
    </Dialog>
  );
}
