import { t } from '#/lib/i18n/index.ts';
import { RecIndicator } from '#/classroom/recordings/RecIndicator.tsx';
import type { RoomSnapshot } from './room-types';

/**
 * One line above the call: joining, how many are in, and «جارٍ التسجيل» (reconnecting: the
 * ReconnectStrip under it).
 */
export function RoomHeader({ snap }: { snap: RoomSnapshot }) {
  const people = snap.tiles.filter((x) => x.kind === 'camera').length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {snap.status === 'connecting' && <p role="status" className="text-sm text-ink-2">{t.classroom.joining}</p>}
      <p role="status" className="text-xs text-ink-2">
        {people > 1 ? t.classroom.participants.replace('{n}', String(people)) : t.classroom.waiting}
      </p>
      {snap.isRecording && <RecIndicator />}
    </div>
  );
}
