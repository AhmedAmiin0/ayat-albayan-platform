import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import type { ClosingButtonsProps } from './ClosingButtons.types';

/** Rejoin while it can work, over back, which leads when alone. */
export function ClosingButtons({ again, onBack, busy }: ClosingButtonsProps) {
  return (
    <div className="grid w-full gap-2.5">
      {again && (
        <Button type="button" size="lg" disabled={busy} onClick={again}>
          <RoomIcon name="cam" />
          {busy ? t.portal.joining : t.classroom.rejoin}
        </Button>
      )}
      {onBack && (
        <Button type="button" size="lg" variant={again ? 'secondary' : 'primary'} onClick={onBack}>
          {t.mobileRoom.back}
        </Button>
      )}
    </div>
  );
}
