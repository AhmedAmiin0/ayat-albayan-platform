import { formatClock, progressOf, resumeAt } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { PlayerButtons } from './PlayerButtons';
import { useHtmlAudio } from './use-html-audio';
import { useResumeMap } from './use-resume';

const P = t.audioPlayer;

interface Props {
  /** The recording's or file's id: its saved stop. */
  id: string;
  /** A signed link (an hour). */
  url: string;
  label: string;
}

/**
 * The in-browser audio player (owner 2026-11-17): play/pause, ±10 s, speed and the saved stop over
 * an <audio> element, the same rules as the family app's player (@ab/client-core).
 */
export function AudioPlayer({ id, url, label }: Props) {
  const from = resumeAt(useResumeMap(), id);
  const { media, state, controls } = useHtmlAudio({ id, startAt: from });
  const total = state.duration > 0 ? formatClock(state.duration) : '—';
  const playing = state.status === 'playing';
  const share = Math.round(progressOf(state.position, state.duration) * 100);
  return (
    <div className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
      <audio src={url} preload="metadata" aria-label={label} {...media}>
        <track kind="captions" />
      </audio>
      {from > 0 && state.position > 0 && (
        <p className="flex items-center justify-between text-xs text-ink-3">
          <span>{P.resumeFrom.replace('{at}', formatClock(from))}</span>
          <Button type="button" variant="ghost" size="sm" onClick={controls.startOver}>
            {P.startOver}
          </Button>
        </p>
      )}
      <div
        role="progressbar"
        aria-label={P.seek}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        aria-valuetext={P.position.replace('{at}', formatClock(state.position)).replace('{total}', total)}
        className="h-1.5 rounded-full bg-sunk"
      >
        <div className="h-1.5 rounded-full bg-lapis" style={{ width: `${share}%` }} />
      </div>
      <p className="flex justify-between text-xs text-ink-3 tabular-nums" dir="ltr">
        <span>{formatClock(state.position)}</span>
        <span>{total}</span>
      </p>
      <PlayerButtons controls={controls} speed={state.speed} playing={playing} />
      {state.status === 'failed' && <FormAlert>{P.failed}</FormAlert>}
    </div>
  );
}
