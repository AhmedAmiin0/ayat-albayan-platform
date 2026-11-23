import { t } from '#/lib/i18n/index.ts';
import { RecIndicator } from '#/classroom/recordings/RecIndicator.tsx';
import { RoomIcon } from '#/classroom/room/components/room-icons.tsx';
import type { RoomSnapshot } from '#/classroom/room/components/room-types.ts';
import { ContextHeader } from './ContextHeader';
import type { RoomContext } from './room-kit';

interface Props {
  snap: RoomSnapshot;
  context: RoomContext | null;
  onPeople: () => void;
}

const peopleIn = (snap: RoomSnapshot): number => snap.tiles.filter((x) => x.kind === 'camera').length;

/**
 * The family room's top line (boards FamRoomWebLive / FamRoomPhoneLive): the lesson, «جارٍ إدخالك
 * الحلقة…» while connecting, «جارٍ التسجيل» only while recording, and the people pill that opens
 * «المشاركون» («3 في الحلقة», or «بانتظار البقية…» while alone).
 */
export function RoomTopBar({ snap, context, onPeople }: Props) {
  const n = peopleIn(snap);
  const words = n > 1 ? t.classroom.participants.replace('{n}', String(n)) : t.classroom.waiting;
  return (
    <div className="-mx-3 -mt-3 sm:-mx-4 sm:-mt-4">
      <ContextHeader context={context}>
        {snap.status === 'connecting' && (
          <p role="status" className="text-xs text-ink-2">{t.classroom.joining}</p>
        )}
        {snap.isRecording && <RecIndicator />}
        <button
          type="button"
          onClick={onPeople}
          aria-label={t.mobileRoom.count.replace('{n}', String(n))}
          className="ab-press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule-strong px-3 text-xs font-semibold text-ink-2"
        >
          <RoomIcon name="people" className="size-4" />
          <span role="status">{words}</span>
        </button>
      </ContextHeader>
    </div>
  );
}
