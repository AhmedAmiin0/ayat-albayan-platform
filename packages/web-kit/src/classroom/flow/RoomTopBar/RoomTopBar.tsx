import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RecIndicator } from '@ab/web-kit/classroom/recordings/RecIndicator';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import { ContextHeader } from '@ab/web-kit/classroom/flow/ContextHeader';
import type { Props } from './RoomTopBar.types';
import { peopleIn } from './room-top-bar.helpers';

export function RoomTopBar({ snap, context, onPeople }: Props) {
  const n = peopleIn(snap);
  const words = n > 1 ? t.classroom.participants.replace('{n}', String(n)) : t.classroom.waiting;
  return (
    <div className="-mx-3 -mt-3 sm:-mx-4 sm:-mt-4">
      <ContextHeader context={context}>
        {snap.status === 'connecting' && (
          <p role="status" className="text-xs text-ink-2">
            {t.classroom.joining}
          </p>
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
