import { useState, type ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { TileSlots } from './ParticipantGrid';
import { RoomButton } from './RoomButton';
import type { TileView } from './room-types';
import { StageScreen } from '@ab/web-kit/classroom/stage/StageScreen';
import { VideoTile } from './VideoTile';

interface Props extends TileSlots {
  /** The shared screen on the stage, or null when the board is there. */
  stage: TileView | null;
  board: ReactNode;
  strip: TileView[];
  /** The family's 160px strip tiles on every width (staff: 128px on phones, 160px from `sm`). */
  wideStrip?: boolean;
}

/**
 * A screen share or the board takes the largest area; the cameras line up in a slim strip that
 * can be hidden: under the stage on phones and narrow windows (scrolls sideways), beside it from
 * `lg` (scrolls down). A shared screen can be maximised to the whole viewport (StageScreen).
 */
export function RoomStage({ stage, board, strip, attach, actionFor, wideStrip = false }: Props) {
  const [stripOpen, setStripOpen] = useState(true);
  const S = t.classroom.stage;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
      <div className="min-h-0 flex-1">
        {stage ? (
          <StageScreen screen={stage} strip={strip} attach={attach} actionFor={actionFor} />
        ) : (
          board
        )}
      </div>
      {strip.length > 0 && (
        <div className="flex shrink-0 items-start gap-2 lg:flex-col">
          <RoomButton
            icon="people"
            on={stripOpen}
            aria-expanded={stripOpen}
            label={stripOpen ? S.hideStrip : S.showStrip}
            onClick={() => setStripOpen(!stripOpen)}
            className="shrink-0"
          />
          <ul
            aria-label={t.classroom.people}
            hidden={!stripOpen}
            className={cn(
              'flex min-w-0 gap-2 overflow-x-auto pb-1 lg:w-48 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0',
              !stripOpen && 'hidden',
            )}
          >
            {strip.map((tile) => (
              <VideoTile
                key={tile.key}
                tile={tile}
                attach={attach}
                action={actionFor(tile)}
                className={cn(
                  'aspect-video min-h-0 shrink-0 lg:w-full',
                  wideStrip ? 'w-40' : 'w-32 sm:w-40',
                )}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
