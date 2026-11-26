import { resumeAt } from '@ab/client-core';
import { useRef } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { MediaControls } from '@ab/web-kit/lesson-files/MediaControls';
import { MediaGlyph } from '@ab/web-kit/lesson-files/MediaGlyphs';
import { useHtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';
import { useResumeMap } from '@ab/web-kit/lesson-files/use-resume';

interface Props {
  id: string;
  /** A signed link (an hour). */
  url: string;
  label: string;
  /** The student's code, laid over the picture (docs/56: a capture names its student). */
  watermark?: string;
}

const MARK = 'pointer-events-none absolute text-xs font-semibold tracking-wide text-white/70';

/** Rows recorded before 2026-10-06 are video; the student's code watermarks two corners. */
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
