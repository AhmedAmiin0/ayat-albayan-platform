import type { ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import { gridColumns } from '@ab/web-kit/classroom/room/livekit/stage';
import { VideoTile } from '@ab/web-kit/classroom/room/components/VideoTile';

export interface TileSlots {
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
  actionFor: (tile: TileView) => ReactNode;
}

/** Nothing shared: the cameras split the space evenly (1 / 2 / 4 / 6 …), sized by the grid's own width. */
export function ParticipantGrid({ tiles, attach, actionFor }: TileSlots & { tiles: TileView[] }) {
  return (
    <section aria-label={t.classroom.title} className="@container min-h-0 flex-1 overflow-y-auto">
      <ul className={cn('grid h-full auto-rows-[minmax(10rem,1fr)] gap-2 sm:gap-3', gridColumns(tiles.length))}>
        {tiles.map((tile) => (
          <VideoTile key={tile.key} tile={tile} attach={attach} action={actionFor(tile)} />
        ))}
      </ul>
    </section>
  );
}
