import type { ReactNode } from 'react';
import { Icon } from '#/components/ui/display/index.ts';
import { t } from '#/lib/i18n/index.ts';
import type { TileView } from '#/classroom/room/components/room-types.ts';
import { VideoTile } from '#/classroom/room/components/VideoTile.tsx';

interface Props {
  /** One's own camera tile, once it is there. */
  me: TileView | undefined;
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
  /** The page's countdown to the start («تبدأ الحلقة بعد 00:03:30»), if it has one. */
  note?: ReactNode;
}

const W = t.roomFlow.waiting;

/**
 * Alone in the room (boards FamRoomWebWait / FamRoomPhoneWait): where the teacher's camera will
 * be, «بانتظار المعلم/ة…», and one's own camera: in the corner on wide screens, under it on phones.
 */
export function WaitingStage({ me, attach, note }: Props) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2">
      <section
        aria-label={W.title}
        className="grid min-h-0 flex-1 animate-fade-in place-content-center justify-items-center gap-3 rounded-md border border-dashed border-rule-strong bg-sunk p-6 text-center"
      >
        <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-lapis-wash text-lapis">
          <Icon name="clock" className="size-6" />
        </span>
        <h2 role="status" className="text-lg font-bold">{W.title}</h2>
        {note}
        <p className="text-sm text-ink-2">{W.body}</p>
      </section>
      {me && (
        <ul className="min-h-0 sm:absolute sm:inset-s-4 sm:bottom-4 sm:w-64">
          <VideoTile tile={me} attach={attach} className="aspect-video min-h-0 shadow-pop max-sm:h-40" />
        </ul>
      )}
    </div>
  );
}
