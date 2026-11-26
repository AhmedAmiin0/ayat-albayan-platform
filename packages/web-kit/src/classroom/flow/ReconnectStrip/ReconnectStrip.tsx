import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { RoomStatus } from '@ab/web-kit/classroom/room/components/room-types';

/** Words, not colour alone. */
export function ReconnectStrip({ status }: { status: RoomStatus }) {
  if (status !== 'reconnecting') return null;
  return (
    <p
      role="status"
      className="-mx-3 flex animate-drop-in items-center justify-center gap-2 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger sm:-mx-4"
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-danger" />
      {t.classroom.reconnecting}
    </p>
  );
}
