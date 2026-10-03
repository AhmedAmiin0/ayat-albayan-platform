import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TileView } from './room-types';
import { gridColumns } from './stage';
import { VideoTile } from './VideoTile';

export interface TileSlots {
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
  /** The corner action of a tile (e.g. «إخراج من الحلقة»), or nothing. */
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
