import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import type { Props } from './LeaveConfirm.types';
import { A } from './leave-confirm.helpers';

/** Esc and the scrim keep one in the room. */
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
