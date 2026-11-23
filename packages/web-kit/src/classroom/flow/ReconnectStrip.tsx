import { t } from '#/lib/i18n/index.ts';
import type { RoomStatus } from '#/classroom/room/components/room-types.ts';

/**
 * «جارٍ إعادة الاتصال…» as a full-width strip under the top line: it drops in from the top (the
 * call is recovering, not frozen) and goes on reconnect. Words, not colour alone.
 */
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
