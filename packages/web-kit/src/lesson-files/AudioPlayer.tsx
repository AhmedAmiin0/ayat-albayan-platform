import { resumeAt } from '@ab/client-core';
import { cn } from '#/lib/index.ts';
import { MediaControls } from './MediaControls';
import { useHtmlAudio } from './use-html-audio';
import { useResumeMap } from './use-resume';

interface Props {
  /** The recording's or file's id: its saved stop. */
  id: string;
  /** A signed link (an hour). */
  url: string;
  label: string;
  className?: string;
}

/**
 * The in-browser audio player (owner 2026-11-17): play/pause, ±10 s, speed and the saved stop over
 * an <audio> element, the same rules as the family app's player (@ab/client-core).
 */
export function AudioPlayer({ id, url, label, className }: Props) {
  const from = resumeAt(useResumeMap(), id);
  const player = useHtmlAudio({ id, startAt: from });
  return (
    <div className={cn('grid gap-3 rounded-lg border border-rule bg-raised p-4', className)}>
      <audio src={url} preload="metadata" aria-label={label} {...player.media}>
        <track kind="captions" />
      </audio>
      <MediaControls player={player} from={from} />
    </div>
  );
}
