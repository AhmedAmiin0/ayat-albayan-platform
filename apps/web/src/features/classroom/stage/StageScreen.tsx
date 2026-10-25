import { useRef, useState, type KeyboardEvent } from 'react';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import type { TileSlots } from '../ParticipantGrid';
import { RoomButton } from '../RoomButton';
import { RoomIcon } from '../room-icons';
import type { TileView } from '../room-types';
import { VideoTile } from '../VideoTile';
import { useMaximize } from './use-maximize';

interface Props extends TileSlots {
  screen: TileView;
  /** Everyone else, shown as a small picture-in-picture strip while maximised. */
  strip: TileView[];
}

const S = t.classroom.stage;

/**
 * The shared screen (or a shared board) on the stage, never cropped. Click / tap it, or focus it
 * and press Enter / Space, for «تكبير الشاشة»: the whole viewport (Fullscreen API, or a fixed
 * overlay where only <video> can go fullscreen). «تصغير», Esc or another click bring it back.
 */
export function StageScreen({ screen, strip, attach, actionFor }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const max = useMaximize(box);
  const [pip, setPip] = useState(true);
  const name = max.maximized ? S.minimize : S.maximize;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    max.toggle();
  };

  return (
    <div
      ref={box}
      data-maximized={max.maximized}
      className={cn(
        'relative size-full',
        max.maximized && 'fixed inset-0 z-50 bg-inverse pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]',
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={name}
        aria-pressed={max.maximized}
        onClick={max.toggle}
        onKeyDown={onKey}
        className="group relative size-full cursor-zoom-in rounded-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lapis data-[on=true]:cursor-zoom-out"
        data-on={max.maximized}
      >
        <ul className="size-full" aria-label={t.classroom.title}>
          <VideoTile tile={screen} attach={attach} className={cn('size-full min-h-56', max.maximized && 'rounded-none border-0')} />
        </ul>
        <span
          aria-hidden="true"
          className="absolute inset-e-2 top-2 flex min-h-11 items-center gap-1.5 rounded-md bg-inverse/85 px-2.5 text-sm text-on-inverse sm:min-h-9"
        >
          <RoomIcon name={max.maximized ? 'minimize' : 'maximize'} />
          <span className="max-sm:sr-only">{name}</span>
        </span>
      </div>
      {max.maximized && (
        <>
          <div className="absolute inset-s-2 top-2 flex gap-2">
            <RoomButton icon="people" on={pip} label={pip ? S.hideStrip : S.showStrip} onClick={() => setPip(!pip)} />
          </div>
          <p className="absolute inset-x-0 bottom-2 hidden text-center text-xs text-on-inverse portrait:max-sm:block">{S.rotateHint}</p>
          {pip && strip.length > 0 && (
            <ul aria-label={t.classroom.people} className="absolute inset-e-2 bottom-8 flex max-h-[45%] flex-col gap-1.5 overflow-y-auto">
              {strip.map((tile) => (
                <VideoTile key={tile.key} tile={tile} attach={attach} action={actionFor(tile)} className="aspect-video min-h-0 w-28 shrink-0 sm:w-40" />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
