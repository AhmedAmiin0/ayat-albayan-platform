import { liveRoomText, type CardRoom, type LiveRoom } from '@ab/client-core';
import { clockOf } from '@ab/shared';
import { StatusMark } from '#/components/ui/index.ts';
import { useClock } from '#/lib/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { LivePresence } from './LivePresence';

interface Props {
  room: CardRoom;
  /** The family's clock: «انتهت الحلقة الساعة 7:12 م». */
  tz: string;
}

function Ended({ at, tz }: { at: string; tz: string }) {
  const time = clockOf(new Date(at), { ...useClock(), tz });
  return (
    <div className="grid gap-1.5">
      <StatusMark tone="neutral" label={t.classroom.closedHint} />
      <p className="text-sm text-ink-2">{t.roomFlow.ended.card.replace('{time}', time)}</p>
    </div>
  );
}

function Live({ live }: { live: LiveRoom }) {
  const text = liveRoomText(live, t.portal.app.live);
  return (
    <div className="grid gap-2">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-0.5 font-semibold text-ok">
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-ok" />
          {t.portal.now}
        </span>
        <span className="text-ink-2">{text.since}</span>
      </p>
      <LivePresence live={live} />
    </div>
  );
}

/**
 * What the card says about the room itself (board FamRoomWebJoin, FamRoomWebDoors): live, with a
 * slowly pulsing dot (the one loop: something is happening now), since when and who is inside; or
 * ended for everyone, with no way back in. Nothing while nobody has entered.
 */
export function CardRoomLine({ room, tz }: Props) {
  if (room.kind === 'live') return <Live live={room.live} />;
  return room.kind === 'ended' ? <Ended at={room.endedAt} tz={tz} /> : null;
}
