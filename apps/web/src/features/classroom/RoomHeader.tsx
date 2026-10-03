import { t } from '@/lib/i18n';
import { RecIndicator } from './recordings/RecIndicator';
import type { RoomSnapshot } from './room-types';

/** One line above the call: joining / reconnecting, how many are in, and «جارٍ التسجيل». */
export function RoomHeader({ snap }: { snap: RoomSnapshot }) {
  const people = snap.tiles.filter((x) => x.kind === 'camera').length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {snap.status === 'connecting' && <p role="status" className="text-sm text-ink-2">{t.classroom.joining}</p>}
      {snap.status === 'reconnecting' && <p role="status" className="text-sm text-ink-2">{t.classroom.reconnecting}</p>}
      <p role="status" className="text-xs text-ink-2">
        {people > 1 ? t.classroom.participants.replace('{n}', String(people)) : t.classroom.waiting}
      </p>
      {snap.isRecording && <RecIndicator />}
    </div>
  );
}
