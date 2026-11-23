import { resumeAt } from '@ab/client-core';
import { useRef } from 'react';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';
import { MediaControls } from './MediaControls';
import { MediaGlyph } from './media-glyphs';
import { useHtmlAudio } from './use-html-audio';
import { useResumeMap } from './use-resume';

interface Props {
  id: string;
  /** A signed link (an hour). */
  url: string;
  label: string;
  /** The student's code, laid over the picture (docs/56: a capture names its student). */
  watermark?: string;
}

const MARK = 'pointer-events-none absolute text-xs font-semibold tracking-wide text-white/70';

/**
 * A video recording (board FamRecWebVideo; rows recorded before 2026-10-06): the picture on the
 * dark frame with the student's code in two corners, «ملء الشاشة» on the frame, and the same
 * controls, saved stop and one-at-a-time rule as the audio player.
 */
export function VideoPlayer({ id, url, label, watermark }: Props) {
  const from = resumeAt(useResumeMap(), id);
  const player = useHtmlAudio({ id, startAt: from });
  const frame = useRef<HTMLDivElement>(null);
  const paused = player.state.status !== 'playing';
  const full = () => void frame.current?.requestFullscreen().catch(() => undefined);
  return (
    <div className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
      <div ref={frame} className="relative overflow-hidden rounded-md bg-black">
        <video src={url} preload="metadata" playsInline aria-label={label} {...player.media}
          className="aspect-video w-full">
          <track kind="captions" />
        </video>
        {watermark && <span aria-hidden="true" className={cn(MARK, 'top-3 start-3')}>{watermark}</span>}
        {watermark && <span aria-hidden="true" className={cn(MARK, 'bottom-3 end-3')}>{watermark}</span>}
        <span aria-hidden="true" className={cn(
          'pointer-events-none absolute inset-0 m-auto grid size-16 place-items-center rounded-full',
          'bg-primary text-primary-foreground transition-opacity duration-(--duration-quick) ease-ink',
          !paused && 'opacity-0',
        )}>
          <MediaGlyph name="play" className="size-7" />
        </span>
        <button type="button" onClick={full}
          className="ab-press absolute bottom-3 start-3 min-h-11 rounded-md bg-black/55 px-3 text-xs
            font-semibold text-white hover:bg-black/70">
          {t.familyFiles.fullscreen}
        </button>
      </div>
      <MediaControls player={player} from={from} />
    </div>
  );
}
