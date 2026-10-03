import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import type { TileSlots } from './ParticipantGrid';
import type { TileView } from './room-types';
import { VideoTile } from './VideoTile';

interface Props extends TileSlots {
  /** The shared screen on the stage, or null when the board is there. */
  stage: TileView | null;
  board: ReactNode;
  strip: TileView[];
}

/**
 * A screen share or the board takes the stage; the cameras line up in a strip: under it on phones
 * and narrow windows (scrolls sideways), beside it from `lg` (scrolls down). Logical sides only.
 */
export function RoomStage({ stage, board, strip, attach, actionFor }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3 lg:flex-row">
      <div className="min-h-0 flex-1">
        {stage ? (
          <ul className="size-full" aria-label={t.classroom.title}>
            <VideoTile tile={stage} attach={attach} action={actionFor(stage)} className="size-full min-h-56" />
          </ul>
        ) : (
          board
        )}
      </div>
      {strip.length > 0 && (
        <ul
          aria-label={t.classroom.people}
          className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:w-64 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
        >
          {strip.map((tile) => (
            <VideoTile
              key={tile.key}
              tile={tile}
              attach={attach}
              action={actionFor(tile)}
              className="aspect-video min-h-0 w-40 shrink-0 sm:w-52 lg:w-full"
            />
          ))}
        </ul>
      )}
    </div>
  );
}
